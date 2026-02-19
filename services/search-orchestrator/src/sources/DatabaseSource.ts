/**
 * PostgreSQL database source (fallback).
 * Queries the local PostgreSQL database for restaurant and dish data.
 * Used when Elasticsearch and MCP adapter are unavailable.
 */

import pino from 'pino';

import type { DatabaseConfig } from '../config/source.config';
import type {
  SearchRequest,
  UnifiedSearchResult,
  AutocompleteRequest,
  AutocompleteSuggestion,
  RestaurantResult,
  DishResult,
} from '../types/search.types';
import type { SourceConfig, SourceQueryResult } from '../types/source.types';

import { BaseSource } from './BaseSource';

interface DbRow {
  [key: string]: unknown;
}

/**
 * Lightweight PostgreSQL client wrapper.
 * In production, this would use the pg library directly.
 */
interface PgClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: DbRow[]; rowCount: number }>;
  end(): Promise<void>;
}

export class DatabaseSource extends BaseSource {
  readonly name = 'database' as const;
  private readonly dbConfig: DatabaseConfig;
  private client: PgClient | null = null;

  constructor(
    sourceConfig: SourceConfig,
    dbConfig: DatabaseConfig,
    logger: pino.Logger,
    client?: PgClient,
  ) {
    super(sourceConfig, logger);
    this.dbConfig = dbConfig;
    this.client = client ?? null;
  }

  setClient(client: PgClient): void {
    this.client = client;
  }

  protected async executeSearch(request: SearchRequest): Promise<SourceQueryResult> {
    if (!this.client) {
      await this.connect();
    }

    const { sql, params } = this.buildSearchSql(request);

    const result = await this.client!.query(sql, params);
    const countResult = await this.client!.query(
      this.buildCountSql(request).sql,
      this.buildCountSql(request).params,
    );

    const totalCount = (countResult.rows[0]?.count as number) ?? 0;
    const results = result.rows.map((row) => this.mapRowToResult(row));

    return {
      source: 'database',
      results,
      totalCount,
      latencyMs: 0,
    };
  }

  protected async executeAutocomplete(
    request: AutocompleteRequest,
  ): Promise<AutocompleteSuggestion[]> {
    if (!this.client) {
      await this.connect();
    }

    const sql = `
      SELECT id, name, 'restaurant' as type
      FROM restaurants
      WHERE LOWER(name) LIKE LOWER($1)
        AND is_active = true
      ORDER BY rating DESC
      LIMIT $2
    `;

    const result = await this.client!.query(sql, [
      `${request.prefix}%`,
      request.limit ?? 10,
    ]);

    return result.rows.map((row) => ({
      text: row.name as string,
      type: 'restaurant' as const,
      id: row.id as string,
    }));
  }

  protected async executeHealthCheck(): Promise<void> {
    if (!this.client) {
      await this.connect();
    }

    await this.client!.query('SELECT 1');
  }

  private async connect(): Promise<void> {
    // Dynamic import to avoid issues when pg is not installed
    try {
      const { Pool } = await import('pg');
      const pool = new Pool({
        host: this.dbConfig.host,
        port: this.dbConfig.port,
        database: this.dbConfig.database,
        user: this.dbConfig.username,
        password: this.dbConfig.password,
        max: this.dbConfig.maxPoolSize,
        connectionTimeoutMillis: this.dbConfig.connectionTimeoutMs,
      });

      this.client = pool as unknown as PgClient;
    } catch (error) {
      this.logger.error({ error }, 'Failed to connect to PostgreSQL');
      throw error;
    }
  }

  private buildSearchSql(request: SearchRequest): { sql: string; params: unknown[] } {
    const conditions: string[] = ['r.is_active = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (request.query) {
      conditions.push(
        `(LOWER(r.name) LIKE LOWER($${paramIndex}) OR LOWER(r.description) LIKE LOWER($${paramIndex}))`,
      );
      params.push(`%${request.query}%`);
      paramIndex++;
    }

    if (request.filters?.minRating !== undefined) {
      conditions.push(`r.rating >= $${paramIndex}`);
      params.push(request.filters.minRating);
      paramIndex++;
    }

    if (request.filters?.isAvailable !== undefined) {
      conditions.push(`r.is_active = $${paramIndex}`);
      params.push(request.filters.isAvailable);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = this.buildOrderClause(request);
    const offset = (request.page - 1) * request.pageSize;

    params.push(request.pageSize);
    const limitParam = paramIndex;
    paramIndex++;

    params.push(offset);
    const offsetParam = paramIndex;

    const sql = `
      SELECT
        r.id, r.name, r.description, r.cuisine_types,
        r.rating, r.review_count, r.price_range,
        r.preparation_time, r.delivery_fee, r.minimum_order,
        r.is_active, r.latitude, r.longitude, r.images
      FROM restaurants r
      ${whereClause}
      ${orderBy}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    return { sql, params };
  }

  private buildCountSql(request: SearchRequest): { sql: string; params: unknown[] } {
    const conditions: string[] = ['r.is_active = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (request.query) {
      conditions.push(
        `(LOWER(r.name) LIKE LOWER($${paramIndex}) OR LOWER(r.description) LIKE LOWER($${paramIndex}))`,
      );
      params.push(`%${request.query}%`);
      paramIndex++;
    }

    if (request.filters?.minRating !== undefined) {
      conditions.push(`r.rating >= $${paramIndex}`);
      params.push(request.filters.minRating);
      paramIndex++;
    }

    if (request.filters?.isAvailable !== undefined) {
      conditions.push(`r.is_active = $${paramIndex}`);
      params.push(request.filters.isAvailable);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return {
      sql: `SELECT COUNT(*) as count FROM restaurants r ${whereClause}`,
      params,
    };
  }

  private buildOrderClause(request: SearchRequest): string {
    const field = request.sort?.field ?? 'relevance';
    const order = request.sort?.order === 'asc' ? 'ASC' : 'DESC';

    switch (field) {
      case 'rating':
        return `ORDER BY r.rating ${order}`;
      case 'deliveryTime':
        return `ORDER BY r.preparation_time ${order}`;
      case 'price':
        return `ORDER BY r.price_range ${order}`;
      case 'popularity':
        return `ORDER BY r.review_count ${order}`;
      default:
        return 'ORDER BY r.rating DESC';
    }
  }

  private mapRowToResult(row: DbRow): UnifiedSearchResult {
    const restaurant: RestaurantResult = {
      id: row.id as string,
      name: (row.name as string) ?? '',
      description: (row.description as string) ?? '',
      cuisineTypes: this.parseCuisineTypes(row.cuisine_types),
      rating: Number(row.rating) ?? 0,
      reviewCount: (row.review_count as number) ?? 0,
      priceRange: (row.price_range as string) ?? 'moderate',
      deliveryTime: (row.preparation_time as number) ?? 30,
      deliveryFee: Number(row.delivery_fee) ?? 0,
      minimumOrder: Number(row.minimum_order) ?? 0,
      isAvailable: (row.is_active as boolean) ?? true,
      imageUrl: this.parseImages(row.images)?.[0],
      address: '',
      location:
        row.latitude && row.longitude
          ? { lat: Number(row.latitude), lon: Number(row.longitude) }
          : undefined,
      tags: [],
      features: [],
    };

    return {
      id: row.id as string,
      type: 'restaurant',
      name: restaurant.name,
      description: restaurant.description,
      score: restaurant.rating / 5,
      source: 'database',
      restaurant,
    };
  }

  private parseCuisineTypes(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  private parseImages(value: unknown): string[] | undefined {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === 'string' && value) {
      return value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return undefined;
  }
}
