import type { IFoodProvider } from '../types/provider-interface.js';
import type {
  AggregatedRestaurant,
  AggregatedResults,
  Location,
  ProviderConfig,
  ProviderName,
} from '../types/provider.types.js';
import { CircuitBreaker, CircuitBreakerOpenError } from './circuit-breaker.js';
import { RateLimiter, RateLimitExceededError } from './rate-limiter.js';

interface RegisteredProvider {
  config: ProviderConfig;
  provider: IFoodProvider;
  circuitBreaker: CircuitBreaker;
  rateLimiter: RateLimiter;
}

export class ProviderManager {
  private readonly providers: Map<ProviderName, RegisteredProvider> = new Map();
  private readonly clock: () => number;

  constructor(clock?: () => number) {
    this.clock = clock ?? (() => Date.now());
  }

  registerProvider(config: ProviderConfig, provider: IFoodProvider): void {
    if (this.providers.has(config.name)) {
      throw new ProviderManagerError(`Provider ${config.name} is already registered`);
    }

    this.providers.set(config.name, {
      config,
      provider,
      circuitBreaker: new CircuitBreaker(
        { failureThreshold: 5, resetTimeoutMs: 30000, monitorWindowMs: 60000 },
        this.clock
      ),
      rateLimiter: new RateLimiter(
        { maxTokens: config.rateLimit, refillRate: config.rateLimit, refillIntervalMs: 60000 },
        this.clock
      ),
    });
  }

  getProvider(name: ProviderName): IFoodProvider {
    const registered = this.providers.get(name);
    if (!registered) {
      throw new ProviderManagerError(`Provider ${name} is not registered`);
    }
    return registered.provider;
  }

  getAllProviders(): IFoodProvider[] {
    return Array.from(this.providers.values()).map((r) => r.provider);
  }

  async getHealthyProviders(): Promise<IFoodProvider[]> {
    const results: IFoodProvider[] = [];

    for (const [, registered] of this.providers) {
      if (!registered.config.enabled) {
        continue;
      }

      const cbState = registered.circuitBreaker.getState();
      if (cbState === 'OPEN') {
        continue;
      }

      try {
        const health = await registered.provider.getHealth();
        if (health !== 'down') {
          results.push(registered.provider);
        }
      } catch {
        // Provider health check failed; skip it
      }
    }

    return results;
  }

  async searchAcrossProviders(
    query: string,
    location: Location
  ): Promise<AggregatedResults> {
    const allRestaurants: AggregatedRestaurant[] = [];
    const activeProviders: ProviderName[] = [];

    const sortedProviders = this.getSortedEnabledProviders();

    const searchPromises = sortedProviders.map(async ([name, registered]) => {
      try {
        return await this.executeWithProtection(registered, async () => {
          const restaurants = await registered.provider.searchRestaurants(query, location);
          return { name, restaurants };
        });
      } catch {
        return null;
      }
    });

    const results = await Promise.allSettled(searchPromises);

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== null) {
        const { name, restaurants } = result.value;
        activeProviders.push(name);

        for (const restaurant of restaurants) {
          allRestaurants.push({ ...restaurant, providerName: name });
        }
      }
    }

    return {
      restaurants: allRestaurants,
      totalResults: allRestaurants.length,
      providers: activeProviders,
    };
  }

  private async executeWithProtection<T>(
    registered: RegisteredProvider,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!registered.rateLimiter.tryAcquire()) {
      throw new RateLimitExceededError(
        `Rate limit exceeded for provider ${registered.config.name}`
      );
    }

    return registered.circuitBreaker.execute(fn);
  }

  private getSortedEnabledProviders(): Array<[ProviderName, RegisteredProvider]> {
    return Array.from(this.providers.entries())
      .filter(([, r]) => r.config.enabled)
      .sort(([, a], [, b]) => a.config.priority - b.config.priority);
  }
}

export class ProviderManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderManagerError';
  }
}

export { CircuitBreakerOpenError, RateLimitExceededError };
