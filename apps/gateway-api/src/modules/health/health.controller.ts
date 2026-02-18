import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RedisService } from '../../services/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async check(): Promise<{
    status: string;
    timestamp: string;
    database: {
      connected: boolean;
      type: string;
      database: string;
      responseTimeMs?: number;
      error?: string;
    };
    redis: {
      connected: boolean;
      responseTimeMs?: number;
      cacheStats?: { hits: number; misses: number; hitRate: number };
      error?: string;
    };
  }> {
    const timestamp = new Date().toISOString();
    let dbConnected = false;
    let dbResponseTimeMs: number | undefined;
    let dbError: string | undefined;

    // Database health check
    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      dbResponseTimeMs = Date.now() - startTime;
      dbConnected = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }

    // Redis health check
    let redisConnected = false;
    let redisResponseTimeMs: number | undefined;
    let redisError: string | undefined;
    let cacheStats: { hits: number; misses: number; hitRate: number } | undefined;

    try {
      const startTime = Date.now();
      const testKey = 'health:check';
      await this.redisService.set(testKey, '1', 10);
      const result = await this.redisService.get(testKey);
      redisResponseTimeMs = Date.now() - startTime;
      redisConnected = result === '1';
      cacheStats = this.redisService.getCacheStats();
    } catch (error) {
      redisError = error instanceof Error ? error.message : 'Unknown Redis error';
    }

    const dbOptions = this.dataSource.options;
    const isHealthy = dbConnected && redisConnected;

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp,
      database: {
        connected: dbConnected,
        type: dbOptions.type,
        database: ('database' in dbOptions ? String(dbOptions.database) : 'unknown'),
        ...(dbResponseTimeMs !== undefined ? { responseTimeMs: dbResponseTimeMs } : {}),
        ...(dbError ? { error: dbError } : {}),
      },
      redis: {
        connected: redisConnected,
        ...(redisResponseTimeMs !== undefined ? { responseTimeMs: redisResponseTimeMs } : {}),
        ...(cacheStats ? { cacheStats } : {}),
        ...(redisError ? { error: redisError } : {}),
      },
    };
  }

  @Get('db')
  async checkDatabase(): Promise<{
    connected: boolean;
    version?: string;
    tables?: string[];
    error?: string;
  }> {
    try {
      const versionResult = await this.dataSource.query('SELECT version()');
      const version = versionResult[0]?.version || 'unknown';

      const tablesResult = await this.dataSource.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
      );
      const tables = tablesResult.map((t) => t.tablename);

      return {
        connected: true,
        version,
        tables,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      };
    }
  }

  @Get('redis')
  async checkRedis(): Promise<{
    connected: boolean;
    responseTimeMs?: number;
    cacheStats: { hits: number; misses: number; hitRate: number };
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const testKey = 'health:check:redis';
      await this.redisService.set(testKey, 'test-value', 10);
      const value = await this.redisService.get(testKey);
      const responseTimeMs = Date.now() - startTime;

      const connected = value === 'test-value';
      const cacheStats = this.redisService.getCacheStats();

      return {
        connected,
        responseTimeMs,
        cacheStats,
      };
    } catch (error) {
      return {
        connected: false,
        cacheStats: this.redisService.getCacheStats(),
        error: error instanceof Error ? error.message : 'Unknown Redis error',
      };
    }
  }
}
