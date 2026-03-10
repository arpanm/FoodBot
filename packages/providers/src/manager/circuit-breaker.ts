import type { CircuitBreakerConfig } from '../types/provider.types.js';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  monitorWindowMs: 60000,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures: number[] = [];
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly clock: () => number;

  constructor(config?: Partial<CircuitBreakerConfig>, clock?: () => number) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = clock ?? (() => Date.now());
  }

  getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === 'OPEN') {
      throw new CircuitBreakerOpenError('Circuit breaker is OPEN');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failures = [];
    this.lastFailureTime = 0;
  }

  getFailureCount(): number {
    this.pruneOldFailures();
    return this.failures.length;
  }

  private evaluateState(): void {
    if (this.state === 'OPEN') {
      const now = this.clock();
      const timeSinceLastFailure = now - this.lastFailureTime;
      if (timeSinceLastFailure >= this.config.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.reset();
    }
  }

  private onFailure(): void {
    const now = this.clock();
    this.failures.push(now);
    this.lastFailureTime = now;
    this.pruneOldFailures();

    if (this.failures.length >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private pruneOldFailures(): void {
    const now = this.clock();
    const cutoff = now - this.config.monitorWindowMs;
    this.failures = this.failures.filter((time) => time > cutoff);
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}
