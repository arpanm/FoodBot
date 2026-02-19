/**
 * Timeout manager for per-source and global search timeouts.
 * Ensures searches complete within configured time limits.
 */

import pino from 'pino';

export interface TimeoutOptions {
  globalTimeoutMs: number;
  perSourceTimeoutMs: Map<string, number>;
}

export class TimeoutManager {
  private readonly logger: pino.Logger;
  private readonly globalTimeoutMs: number;
  private readonly perSourceTimeoutMs: Map<string, number>;

  constructor(options: TimeoutOptions, logger: pino.Logger) {
    this.globalTimeoutMs = options.globalTimeoutMs;
    this.perSourceTimeoutMs = options.perSourceTimeoutMs;
    this.logger = logger.child({ component: 'TimeoutManager' });
  }

  /**
   * Wraps a promise with a per-source timeout.
   * Returns the result or a timeout error.
   */
  async withSourceTimeout<T>(
    sourceName: string,
    operation: () => Promise<T>,
    fallbackValue: T,
  ): Promise<{ value: T; timedOut: boolean; latencyMs: number }> {
    const timeoutMs = this.perSourceTimeoutMs.get(sourceName) ?? this.globalTimeoutMs;
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        operation(),
        this.createTimeout<T>(timeoutMs, sourceName),
      ]);

      return {
        value: result,
        timedOut: false,
        latencyMs: Date.now() - startTime,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      if (this.isTimeoutError(error)) {
        this.logger.warn(
          { sourceName, timeoutMs, latencyMs },
          `Source ${sourceName} timed out after ${latencyMs}ms (limit: ${timeoutMs}ms)`,
        );

        return {
          value: fallbackValue,
          timedOut: true,
          latencyMs,
        };
      }

      throw error;
    }
  }

  /**
   * Wraps an operation with the global timeout.
   */
  async withGlobalTimeout<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
  ): Promise<T> {
    try {
      return await Promise.race([
        operation(),
        this.createTimeout<T>(this.globalTimeoutMs, 'global'),
      ]);
    } catch (error) {
      if (this.isTimeoutError(error)) {
        this.logger.warn(
          { globalTimeoutMs: this.globalTimeoutMs },
          'Global search timeout exceeded',
        );
        return fallbackValue;
      }
      throw error;
    }
  }

  getSourceTimeout(sourceName: string): number {
    return this.perSourceTimeoutMs.get(sourceName) ?? this.globalTimeoutMs;
  }

  getGlobalTimeout(): number {
    return this.globalTimeoutMs;
  }

  private createTimeout<T>(ms: number, label: string): Promise<T> {
    return new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Timeout after ${ms}ms for ${label}`));
      }, ms);
    });
  }

  private isTimeoutError(error: unknown): boolean {
    return error instanceof TimeoutError;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
