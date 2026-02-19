/**
 * Provider Configuration
 * Central configuration for all restaurant data providers
 */

export interface ProviderConfig {
  enabled: boolean;
  priority: number;
  timeout: number;
  cacheTtl: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface ProvidersConfig {
  googlePlaces: ProviderConfig;
  mock: ProviderConfig;
}

export const DEFAULT_PROVIDERS_CONFIG: ProvidersConfig = {
  googlePlaces: {
    enabled: false, // Disabled by default, enable via env var
    priority: 1, // Higher priority
    timeout: 5000, // 5 seconds
    cacheTtl: 3600, // 1 hour
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000, // 1 minute
    },
  },
  mock: {
    enabled: true, // Always enabled for fallback
    priority: 10, // Lower priority
    timeout: 1000, // 1 second
    cacheTtl: 300, // 5 minutes
  },
};

/**
 * Provider selection strategy
 */
export enum ProviderStrategy {
  PRIMARY = 'primary', // Use only primary provider
  FALLBACK = 'fallback', // Use fallback if primary fails
  ALL = 'all', // Query all providers and merge results
  FASTEST = 'fastest', // Use first provider that responds
}

export const DEFAULT_PROVIDER_STRATEGY = ProviderStrategy.FALLBACK;
