/**
 * Fallback manager for graceful degradation across providers.
 * Implements the provider priority chain with automatic failover.
 */

import type { ProviderName } from '../types/common.types.js';
import type { Provider, SearchResult, SearchQuery } from '../types/provider.types.js';
import { CircuitBreaker, CircuitBreakerOpenError } from './CircuitBreaker.js';
import { RateLimiter, RateLimitExceededError } from './RateLimiter.js';
import { RetryManager } from './RetryManager.js';

export interface FallbackConfig {
  providerPriority: ProviderName[];
  timeoutMs: number;
}

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  providerPriority: ['swiggy', 'zomato', 'internal', 'mock'],
  timeoutMs: 10_000,
};

interface ProviderEntry {
  provider: Provider;
  circuitBreaker: CircuitBreaker;
  rateLimiter: RateLimiter;
  retryManager: RetryManager;
}

export class FallbackManager {
  private readonly providers: Map<ProviderName, ProviderEntry> = new Map();
  private readonly config: FallbackConfig;

  constructor(config?: Partial<FallbackConfig>) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
  }

  registerProvider(
    provider: Provider,
    circuitBreaker: CircuitBreaker,
    rateLimiter: RateLimiter,
    retryManager: RetryManager
  ): void {
    this.providers.set(provider.name, {
      provider,
      circuitBreaker,
      rateLimiter,
      retryManager,
    });
  }

  /**
   * Execute a search across providers with fallback.
   * Tries providers in priority order until one succeeds.
   */
  async executeWithFallback(
    query: SearchQuery,
    specificProviders?: ProviderName[]
  ): Promise<SearchResult> {
    const providerOrder = specificProviders ?? this.config.providerPriority;
    const errors: Array<{ provider: ProviderName; error: string }> = [];

    for (const providerName of providerOrder) {
      const entry = this.providers.get(providerName);
      if (!entry) {
        continue;
      }

      if (!entry.provider.isEnabled()) {
        continue;
      }

      if (!entry.circuitBreaker.isAllowed()) {
        errors.push({
          provider: providerName,
          error: 'Circuit breaker is open',
        });
        continue;
      }

      if (!entry.rateLimiter.tryAcquire()) {
        errors.push({
          provider: providerName,
          error: 'Rate limit exceeded',
        });
        continue;
      }

      try {
        const result = await entry.retryManager.execute(
          () => this.executeWithTimeout(entry.provider, query),
          `search:${providerName}`
        );
        entry.circuitBreaker.onSuccess();
        return result;
      } catch (error) {
        entry.circuitBreaker.onFailure();
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        errors.push({ provider: providerName, error: errorMessage });
        continue;
      }
    }

    throw new AllProvidersFailedError(errors);
  }

  /**
   * Get health status for all registered providers.
   */
  getHealthStatus(): Map<ProviderName, ProviderHealthSummary> {
    const status = new Map<ProviderName, ProviderHealthSummary>();

    for (const [name, entry] of this.providers) {
      status.set(name, {
        provider: name,
        enabled: entry.provider.isEnabled(),
        circuitBreakerState: entry.circuitBreaker.getState(),
        availableTokens: entry.rateLimiter.getAvailableTokens(),
      });
    }

    return status;
  }

  private async executeWithTimeout(
    provider: Provider,
    query: SearchQuery
  ): Promise<SearchResult> {
    return new Promise<SearchResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      provider
        .searchRestaurants(query)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

export interface ProviderHealthSummary {
  provider: ProviderName;
  enabled: boolean;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  availableTokens: number;
}

export class AllProvidersFailedError extends Error {
  readonly providerErrors: Array<{ provider: ProviderName; error: string }>;

  constructor(errors: Array<{ provider: ProviderName; error: string }>) {
    const summary = errors
      .map((e) => `${e.provider}: ${e.error}`)
      .join('; ');
    super(`All providers failed: ${summary}`);
    this.name = 'AllProvidersFailedError';
    this.providerErrors = errors;
  }
}
