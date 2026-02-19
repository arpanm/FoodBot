/**
 * Circuit Breaker implementation for provider fault tolerance.
 * Prevents cascading failures when a provider is down.
 *
 * States:
 *   CLOSED   -> requests pass through normally
 *   OPEN     -> requests are immediately rejected
 *   HALF_OPEN -> one test request allowed through
 */

import type { ProviderName } from '../types/common.types.js';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  failureWindowMs: number;
  openDurationMs: number;
  successThresholdToClose: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  failureWindowMs: 60_000,
  openDurationMs: 30_000,
  successThresholdToClose: 3,
};

interface FailureRecord {
  timestamp: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = 'closed';
  private failures: FailureRecord[] = [];
  private successCount = 0;
  private openedAt = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly providerName: ProviderName;

  constructor(providerName: ProviderName, config?: Partial<CircuitBreakerConfig>) {
    this.providerName = providerName;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitBreakerState {
    this.evaluateState();
    return this.state;
  }

  getProviderName(): ProviderName {
    return this.providerName;
  }

  /**
   * Execute a function with circuit breaker protection.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.evaluateState();

    if (this.state === 'open') {
      throw new CircuitBreakerOpenError(this.providerName, this.getRemainingOpenTimeMs());
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

  /**
   * Check if requests are allowed through.
   */
  isAllowed(): boolean {
    this.evaluateState();
    return this.state !== 'open';
  }

  /**
   * Record a successful request.
   */
  onSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      if (this.successCount >= this.config.successThresholdToClose) {
        this.transitionTo('closed');
      }
    }
    if (this.state === 'closed') {
      // Clear old failures
      this.pruneOldFailures();
    }
  }

  /**
   * Record a failed request.
   */
  onFailure(): void {
    if (this.state === 'half-open') {
      this.transitionTo('open');
      return;
    }

    this.failures.push({ timestamp: Date.now() });
    this.pruneOldFailures();

    if (this.failures.length >= this.config.failureThreshold) {
      this.transitionTo('open');
    }
  }

  /**
   * Force the circuit breaker to a specific state (for testing).
   */
  forceState(state: CircuitBreakerState): void {
    this.transitionTo(state);
  }

  /**
   * Reset the circuit breaker to closed state.
   */
  reset(): void {
    this.state = 'closed';
    this.failures = [];
    this.successCount = 0;
    this.openedAt = 0;
  }

  getMetrics(): CircuitBreakerMetrics {
    this.evaluateState();
    return {
      provider: this.providerName,
      state: this.state,
      failureCount: this.failures.length,
      successCount: this.successCount,
      openedAt: this.openedAt > 0 ? new Date(this.openedAt).toISOString() : null,
      remainingOpenTimeMs: this.getRemainingOpenTimeMs(),
    };
  }

  private evaluateState(): void {
    if (this.state === 'open') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.config.openDurationMs) {
        this.transitionTo('half-open');
      }
    }
  }

  private transitionTo(newState: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'open') {
      this.openedAt = Date.now();
      this.successCount = 0;
    } else if (newState === 'closed') {
      this.failures = [];
      this.successCount = 0;
      this.openedAt = 0;
    } else if (newState === 'half-open') {
      this.successCount = 0;
    }

    if (oldState !== newState) {
      // Log state transition (using structured logging pattern)
      const _transition = {
        provider: this.providerName,
        from: oldState,
        to: newState,
        timestamp: new Date().toISOString(),
      };
      // In production, this would go to a logger
      void _transition;
    }
  }

  private pruneOldFailures(): void {
    const cutoff = Date.now() - this.config.failureWindowMs;
    this.failures = this.failures.filter((f) => f.timestamp > cutoff);
  }

  private getRemainingOpenTimeMs(): number {
    if (this.state !== 'open') {
      return 0;
    }
    const elapsed = Date.now() - this.openedAt;
    return Math.max(0, this.config.openDurationMs - elapsed);
  }
}

export interface CircuitBreakerMetrics {
  provider: ProviderName;
  state: CircuitBreakerState;
  failureCount: number;
  successCount: number;
  openedAt: string | null;
  remainingOpenTimeMs: number;
}

export class CircuitBreakerOpenError extends Error {
  readonly provider: ProviderName;
  readonly remainingMs: number;

  constructor(provider: ProviderName, remainingMs: number) {
    super(
      `Circuit breaker OPEN for provider "${provider}". ` +
        `Retry after ${Math.ceil(remainingMs / 1000)}s.`
    );
    this.name = 'CircuitBreakerOpenError';
    this.provider = provider;
    this.remainingMs = remainingMs;
  }
}
