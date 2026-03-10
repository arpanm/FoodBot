/**
 * MCP Adapter Application - wires up all providers, middleware, and routes.
 */

import { loadConfig, type AdapterConfig } from './config/adapter.config.js';
import { loadSwiggyConfig } from './config/swiggy.config.js';
import { loadZomatoConfig } from './config/zomato.config.js';
import { CacheManager, InMemoryCacheBackend } from './cache/CacheManager.js';
import { TokenManager, InMemoryTokenStore } from './auth/token-manager.js';
import { SwiggyAuth } from './providers/swiggy/swiggyAuth.js';
import { SwiggyAPIProvider } from './providers/swiggy/SwiggyAPIProvider.js';
import { ZomatoAuth } from './providers/zomato/zomatoAuth.js';
import { ZomatoAPIProvider } from './providers/zomato/ZomatoAPIProvider.js';
import { InternalProvider } from './providers/internal/InternalProvider.js';
import { MockProvider } from './providers/mock/MockProvider.js';
import { ResultAggregator } from './aggregator/ResultAggregator.js';
import { CircuitBreaker } from './resilience/CircuitBreaker.js';
import { RateLimiter } from './resilience/RateLimiter.js';
import { FallbackManager } from './resilience/Fallback.js';
import { RetryManager } from './resilience/RetryManager.js';
import type { Provider } from './types/provider.types.js';

export interface AppContext {
  config: AdapterConfig;
  cache: CacheManager;
  tokenManager: TokenManager;
  aggregator: ResultAggregator;
  fallbackManager: FallbackManager;
  providers: Map<string, Provider>;
  circuitBreakers: Map<string, CircuitBreaker>;
  rateLimiters: Map<string, RateLimiter>;
}

export function createApp(): AppContext {
  const config = loadConfig();
  const swiggyConfig = loadSwiggyConfig();
  const zomatoConfig = loadZomatoConfig();

  // Cache
  const cacheBackend = new InMemoryCacheBackend();
  const cache = new CacheManager(cacheBackend);

  // Token management
  const tokenStore = new InMemoryTokenStore();
  const tokenManager = new TokenManager(tokenStore, {
    primaryKeyHex: config.encryption.tokenEncryptionKey,
    primaryKeyVersion: 1,
  });

  // Auth managers
  const swiggyAuth = new SwiggyAuth(tokenManager);
  const zomatoAuth = new ZomatoAuth(tokenManager);

  // Providers
  const providers = new Map<string, Provider>();
  const circuitBreakers = new Map<string, CircuitBreaker>();
  const rateLimiters = new Map<string, RateLimiter>();

  if (config.providers.includes('swiggy')) {
    const provider = new SwiggyAPIProvider(swiggyAuth, cache, swiggyConfig);
    providers.set('swiggy', provider);
    circuitBreakers.set('swiggy', new CircuitBreaker('swiggy', swiggyConfig.circuitBreaker));
    rateLimiters.set('swiggy', new RateLimiter('swiggy'));
  }

  if (config.providers.includes('zomato')) {
    const provider = new ZomatoAPIProvider(zomatoAuth, cache, zomatoConfig);
    providers.set('zomato', provider);
    circuitBreakers.set('zomato', new CircuitBreaker('zomato', zomatoConfig.circuitBreaker));
    rateLimiters.set('zomato', new RateLimiter('zomato'));
  }

  if (config.providers.includes('internal')) {
    const provider = new InternalProvider(cache, true);
    providers.set('internal', provider);
    circuitBreakers.set('internal', new CircuitBreaker('internal', {
      failureThreshold: 10,
      failureWindowMs: 60_000,
      openDurationMs: 15_000,
      successThresholdToClose: 2,
    }));
    rateLimiters.set('internal', new RateLimiter('internal'));
  }

  // Mock provider is always registered
  const mockProvider = new MockProvider();
  providers.set('mock', mockProvider);
  circuitBreakers.set('mock', new CircuitBreaker('mock'));
  rateLimiters.set('mock', new RateLimiter('mock'));

  // Aggregator
  const aggregator = new ResultAggregator();
  for (const provider of providers.values()) {
    aggregator.registerProvider(provider);
  }

  // Fallback manager
  const fallbackManager = new FallbackManager({
    providerPriority: config.providerPriority,
    timeoutMs: 10_000,
  });

  for (const [name, provider] of providers) {
    const cb = circuitBreakers.get(name)!;
    const rl = rateLimiters.get(name)!;
    const rm = new RetryManager(provider.name);
    fallbackManager.registerProvider(provider, cb, rl, rm);
  }

  return {
    config,
    cache,
    tokenManager,
    aggregator,
    fallbackManager,
    providers,
    circuitBreakers,
    rateLimiters,
  };
}
