/**
 * Token-bucket rate limiter for controlling request rates per provider.
 */

import type { ProviderName } from '../types/common.types.js';

export interface RateLimiterConfig {
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
}

const DEFAULT_CONFIGS: Record<ProviderName, RateLimiterConfig> = {
  swiggy: {
    maxTokens: 30,
    refillRate: 30,
    refillIntervalMs: 60_000,
  },
  zomato: {
    maxTokens: 30,
    refillRate: 30,
    refillIntervalMs: 60_000,
  },
  internal: {
    maxTokens: 1000,
    refillRate: 1000,
    refillIntervalMs: 1_000,
  },
  mock: {
    maxTokens: 10_000,
    refillRate: 10_000,
    refillIntervalMs: 1_000,
  },
};

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly config: RateLimiterConfig;
  private readonly providerName: ProviderName;

  constructor(providerName: ProviderName, config?: Partial<RateLimiterConfig>) {
    this.providerName = providerName;
    this.config = {
      ...DEFAULT_CONFIGS[providerName],
      ...config,
    };
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token. Returns true if allowed.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Acquire a token, throwing if rate limited.
   */
  acquire(): void {
    if (!this.tryAcquire()) {
      throw new RateLimitExceededError(this.providerName, this.getWaitTimeMs());
    }
  }

  /**
   * Get current token count.
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  /**
   * Get estimated wait time until next token is available.
   */
  getWaitTimeMs(): number {
    if (this.tokens >= 1) {
      return 0;
    }
    const tokensNeeded = 1 - this.tokens;
    return Math.ceil(
      (tokensNeeded / this.config.refillRate) * this.config.refillIntervalMs
    );
  }

  /**
   * Reset the rate limiter to full capacity.
   */
  reset(): void {
    this.tokens = this.config.maxTokens;
    this.lastRefill = Date.now();
  }

  getMetrics(): RateLimiterMetrics {
    this.refill();
    return {
      provider: this.providerName,
      availableTokens: Math.floor(this.tokens),
      maxTokens: this.config.maxTokens,
      utilizationPercent: Math.round(
        ((this.config.maxTokens - this.tokens) / this.config.maxTokens) * 100
      ),
    };
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.refillIntervalMs) {
      const intervals = Math.floor(elapsed / this.config.refillIntervalMs);
      const tokensToAdd = intervals * this.config.refillRate;
      this.tokens = Math.min(this.config.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill += intervals * this.config.refillIntervalMs;
    }
  }
}

export interface RateLimiterMetrics {
  provider: ProviderName;
  availableTokens: number;
  maxTokens: number;
  utilizationPercent: number;
}

export class RateLimitExceededError extends Error {
  readonly provider: ProviderName;
  readonly waitTimeMs: number;

  constructor(provider: ProviderName, waitTimeMs: number) {
    super(
      `Rate limit exceeded for provider "${provider}". ` +
        `Retry after ${Math.ceil(waitTimeMs / 1000)}s.`
    );
    this.name = 'RateLimitExceededError';
    this.provider = provider;
    this.waitTimeMs = waitTimeMs;
  }
}
