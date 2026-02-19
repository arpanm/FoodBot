export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

export interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  responseTimeMs?: number;
  message?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type HealthCheckFunction = () => Promise<HealthCheck>;

/**
 * Health check service for monitoring system dependencies
 * Provides liveness and readiness probes for Kubernetes
 */
export class HealthService {
  private checks = new Map<string, HealthCheckFunction>();
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Register a health check
   */
  registerCheck(name: string, checkFn: HealthCheckFunction): void {
    this.checks.set(name, checkFn);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): void {
    this.checks.delete(name);
  }

  /**
   * Liveness probe - checks if the application is running
   * Returns 200 if process is alive
   */
  async liveness(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'healthy',
      timestamp,
      uptime,
      checks: {
        process: {
          status: 'up',
          metadata: {
            pid: process.pid,
            memory: process.memoryUsage(),
            uptime,
          },
        },
      },
    };
  }

  /**
   * Readiness probe - checks if the application can serve traffic
   * Returns 200 if all dependencies are healthy
   */
  async readiness(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    const checks: Record<string, HealthCheck> = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // Run all registered health checks in parallel
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, checkFn]) => {
      try {
        const result = await Promise.race([
          checkFn(),
          this.timeout(5000, {
            status: 'down' as const,
            error: 'Health check timeout',
          }),
        ]);
        checks[name] = result;

        if (result.status === 'down') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'degraded' && overallStatus !== 'unhealthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks[name] = {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        overallStatus = 'unhealthy';
      }
    });

    await Promise.all(checkPromises);

    return {
      status: overallStatus,
      timestamp,
      uptime,
      checks,
    };
  }

  /**
   * Timeout helper
   */
  private timeout<T>(ms: number, result: T): Promise<T> {
    return new Promise((resolve) => setTimeout(() => resolve(result), ms));
  }

  /**
   * Database health check factory
   */
  static createDatabaseCheck(
    queryFn: () => Promise<void>
  ): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        await queryFn();
        return {
          status: 'up',
          responseTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          status: 'down',
          responseTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown database error',
        };
      }
    };
  }

  /**
   * Redis health check factory
   */
  static createRedisCheck(
    pingFn: () => Promise<string>
  ): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        const result = await pingFn();
        return {
          status: result === 'PONG' ? 'up' : 'down',
          responseTimeMs: Date.now() - startTime,
        };
      } catch (error) {
        return {
          status: 'down',
          responseTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown Redis error',
        };
      }
    };
  }

  /**
   * HTTP endpoint health check factory
   */
  static createHttpCheck(
    url: string,
    fetchFn: (url: string) => Promise<Response>
  ): HealthCheckFunction {
    return async (): Promise<HealthCheck> => {
      const startTime = Date.now();
      try {
        const response = await fetchFn(url);
        const responseTimeMs = Date.now() - startTime;

        if (response.ok) {
          return { status: 'up', responseTimeMs };
        } else if (response.status >= 500) {
          return {
            status: 'down',
            responseTimeMs,
            error: `HTTP ${response.status}`,
          };
        } else {
          return {
            status: 'degraded',
            responseTimeMs,
            message: `HTTP ${response.status}`,
          };
        }
      } catch (error) {
        return {
          status: 'down',
          responseTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown HTTP error',
        };
      }
    };
  }
}

/**
 * Global health service instance
 */
export const healthService = new HealthService();
