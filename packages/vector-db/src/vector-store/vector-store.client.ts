/**
 * In-memory vector store implementation for development and testing.
 * Implements the VectorStore interface with full search capabilities.
 */

import type {
  VectorStore,
  VectorPoint,
  SearchResult,
  SearchOptions,
  CollectionConfig,
  FilterCondition,
  FieldCondition,
  MatchCondition,
  RangeCondition,
  KeywordCondition,
  GeoCondition,
} from '../types/vector-store.types.js';
import { computeDistance, haversineDistance } from './distance-calculator.js';

interface CollectionData {
  config: CollectionConfig;
  points: Map<string, VectorPoint>;
}

export class InMemoryVectorStore implements VectorStore {
  private collections: Map<string, CollectionData> = new Map();

  async createCollection(config: CollectionConfig): Promise<void> {
    if (this.collections.has(config.name)) {
      throw new Error(`Collection '${config.name}' already exists`);
    }
    this.collections.set(config.name, { config, points: new Map() });
  }

  async deleteCollection(name: string): Promise<void> {
    this.collections.delete(name);
  }

  async listCollections(): Promise<string[]> {
    return Array.from(this.collections.keys());
  }

  async upsertPoints(collection: string, points: VectorPoint[]): Promise<void> {
    const col = this.getCollection(collection);
    for (const point of points) {
      this.validateVector(point.vector, col.config.dimension);
      col.points.set(point.id, { ...point });
    }
  }

  async deletePoints(collection: string, ids: string[]): Promise<void> {
    const col = this.getCollection(collection);
    for (const id of ids) {
      col.points.delete(id);
    }
  }

  async getPoints(collection: string, ids: string[]): Promise<VectorPoint[]> {
    const col = this.getCollection(collection);
    const results: VectorPoint[] = [];
    for (const id of ids) {
      const point = col.points.get(id);
      if (point) {
        results.push({ ...point });
      }
    }
    return results;
  }

  async search(
    collection: string,
    vector: number[],
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const col = this.getCollection(collection);
    this.validateVector(vector, col.config.dimension);

    const scored = this.scorePoints(col, vector, options.filter);
    return this.applySearchOptions(scored, options);
  }

  private getCollection(name: string): CollectionData {
    const col = this.collections.get(name);
    if (!col) {
      throw new Error(`Collection '${name}' does not exist`);
    }
    return col;
  }

  private validateVector(vector: number[], dimension: number): void {
    if (vector.length !== dimension) {
      throw new Error(
        `Vector dimension mismatch: expected ${dimension}, got ${vector.length}`
      );
    }
  }

  private scorePoints(
    col: CollectionData,
    vector: number[],
    filter?: FilterCondition
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const point of col.points.values()) {
      if (filter && !this.matchesFilter(point.payload, filter)) {
        continue;
      }
      const score = computeDistance(vector, point.vector, col.config.distance);
      results.push({ id: point.id, score, payload: { ...point.payload } });
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private applySearchOptions(
    scored: SearchResult[],
    options: SearchOptions
  ): SearchResult[] {
    let results = scored;

    if (options.scoreThreshold !== undefined) {
      results = results.filter((r) => r.score >= options.scoreThreshold!);
    }

    const offset = options.offset ?? 0;
    results = results.slice(offset, offset + options.limit);

    return results;
  }

  private matchesFilter(
    payload: Record<string, unknown>,
    filter: FilterCondition
  ): boolean {
    return (
      this.checkMust(payload, filter.must) &&
      this.checkShould(payload, filter.should) &&
      this.checkMustNot(payload, filter.must_not)
    );
  }

  private checkMust(
    payload: Record<string, unknown>,
    conditions?: FieldCondition[]
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((c) => this.evaluateCondition(payload, c));
  }

  private checkShould(
    payload: Record<string, unknown>,
    conditions?: FieldCondition[]
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.some((c) => this.evaluateCondition(payload, c));
  }

  private checkMustNot(
    payload: Record<string, unknown>,
    conditions?: FieldCondition[]
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    return conditions.every((c) => !this.evaluateCondition(payload, c));
  }

  private evaluateCondition(
    payload: Record<string, unknown>,
    condition: FieldCondition
  ): boolean {
    switch (condition.type) {
      case 'match':
        return this.evalMatch(payload, condition);
      case 'range':
        return this.evalRange(payload, condition);
      case 'keyword':
        return this.evalKeyword(payload, condition);
      case 'geo':
        return this.evalGeo(payload, condition);
      default:
        return false;
    }
  }

  private evalMatch(
    payload: Record<string, unknown>,
    condition: MatchCondition
  ): boolean {
    return payload[condition.key] === condition.value;
  }

  private evalRange(
    payload: Record<string, unknown>,
    condition: RangeCondition
  ): boolean {
    const val = payload[condition.key];
    if (typeof val !== 'number') return false;

    if (condition.gte !== undefined && val < condition.gte) return false;
    if (condition.lte !== undefined && val > condition.lte) return false;
    if (condition.gt !== undefined && val <= condition.gt) return false;
    if (condition.lt !== undefined && val >= condition.lt) return false;
    return true;
  }

  private evalKeyword(
    payload: Record<string, unknown>,
    condition: KeywordCondition
  ): boolean {
    const val = payload[condition.key];
    if (typeof val === 'string') {
      return condition.values.includes(val);
    }
    if (Array.isArray(val)) {
      return val.some(
        (v) => typeof v === 'string' && condition.values.includes(v)
      );
    }
    return false;
  }

  private evalGeo(
    payload: Record<string, unknown>,
    condition: GeoCondition
  ): boolean {
    const loc = payload[condition.key] as
      | { lat: number; lon: number }
      | undefined;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lon !== 'number') {
      return false;
    }
    const dist = haversineDistance(condition.center, loc);
    return dist <= condition.radiusKm;
  }
}
