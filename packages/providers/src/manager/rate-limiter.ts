import type { RateLimiterConfig } from '../types/provider.types.js';

const DEFAULT_CONFIG: RateLimiterConfig = {
  maxTokens: 100,
  refillRate: 100,
  refillIntervalMs: 60000,
};

export class RateLimiter {
  private tokens: number;
  private lastRefillTime: number;
  private readonly config: RateLimiterConfig;
  private readonly clock: () => number;

  constructor(config?: Partial<RateLimiterConfig>, clock?: () => number) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = clock ?? (() => Date.now());
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = this.clock();
  }

  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  getRemainingTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefillTime = this.clock();
  }

  private refill(): void {
    const now = this.clock();
    const elapsed = now - this.lastRefillTime;

    if (elapsed <= 0) {
      return;
    }

    const tokensToAdd =
      (elapsed / this.config.refillIntervalMs) * this.config.refillRate;

    this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
}

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}
