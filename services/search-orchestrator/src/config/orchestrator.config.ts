/**
 * Orchestrator configuration.
 * Defines timeouts, strategy defaults, and performance thresholds.
 */

import type { SearchStrategyType } from '../types/search.types';
import type { ScoringConfig } from '../types/result.types';

export interface OrchestratorConfig {
  defaultStrategy: SearchStrategyType;
  maxTotalTimeoutMs: number;
  cacheTtlSeconds: number;
  suggestionsCacheTtlSeconds: number;
  popularSearchesCacheTtlSeconds: number;
  maxResultsPerPage: number;
  defaultPageSize: number;
  scoring: ScoringConfig;
  metrics: MetricsConfig;
  logging: LoggingConfig;
}

export interface MetricsConfig {
  enabled: boolean;
  port: number;
  path: string;
  collectIntervalMs: number;
}

export interface LoggingConfig {
  level: string;
  prettyPrint: boolean;
}

export function getOrchestratorConfig(): OrchestratorConfig {
  return {
    defaultStrategy: (process.env.DEFAULT_SEARCH_STRATEGY as SearchStrategyType) || 'comprehensive',
    maxTotalTimeoutMs: parseInt(process.env.MAX_TOTAL_TIMEOUT_MS || '3000', 10),
    cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
    suggestionsCacheTtlSeconds: parseInt(process.env.SUGGESTIONS_CACHE_TTL || '180', 10),
    popularSearchesCacheTtlSeconds: parseInt(process.env.POPULAR_CACHE_TTL || '600', 10),
    maxResultsPerPage: parseInt(process.env.MAX_RESULTS_PER_PAGE || '100', 10),
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE || '20', 10),
    scoring: getScoringConfig(),
    metrics: {
      enabled: process.env.METRICS_ENABLED !== 'false',
      port: parseInt(process.env.METRICS_PORT || '9090', 10),
      path: process.env.METRICS_PATH || '/metrics',
      collectIntervalMs: parseInt(process.env.METRICS_COLLECT_INTERVAL || '10000', 10),
    },
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      prettyPrint: process.env.LOG_PRETTY === 'true',
    },
  };
}

function getScoringConfig(): ScoringConfig {
  return {
    weights: {
      relevance: 0.35,
      rating: 0.20,
      proximity: 0.15,
      availability: 0.10,
      deliveryTime: 0.08,
      userPreference: 0.07,
      popularity: 0.05,
    },
    boosts: {
      availableNow: 1.5,
      highRating: 1.3,
      nearbyDistance: 1.4,
      preferredCuisine: 1.2,
    },
    penalties: {
      longDeliveryTime: 0.7,
      lowRating: 0.5,
      farDistance: 0.6,
    },
  };
}
