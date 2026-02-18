import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

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
  }> {
    const timestamp = new Date().toISOString();
    let dbConnected = false;
    let responseTimeMs: number | undefined;
    let dbError: string | undefined;

    try {
      const startTime = Date.now();
      await this.dataSource.query('SELECT 1');
      responseTimeMs = Date.now() - startTime;
      dbConnected = true;
    } catch (error) {
      dbError = error instanceof Error ? error.message : 'Unknown database error';
    }

    const dbOptions = this.dataSource.options;

    return {
      status: dbConnected ? 'healthy' : 'unhealthy',
      timestamp,
      database: {
        connected: dbConnected,
        type: dbOptions.type,
        database: ('database' in dbOptions ? String(dbOptions.database) : 'unknown'),
        ...(responseTimeMs !== undefined ? { responseTimeMs } : {}),
        ...(dbError ? { error: dbError } : {}),
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
      const versionResult = await this.dataSource.query('SELECT version()') as Array<{ version: string }>;
      const version = versionResult[0]?.version || 'unknown';

      const tablesResult = await this.dataSource.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
      ) as Array<{ tablename: string }>;
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
}
