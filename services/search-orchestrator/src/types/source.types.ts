/**
 * Source type definitions for the Search Orchestrator.
 * Defines contracts for data sources (Elasticsearch, MCP, Database).
 */

import type {
  SearchRequest,
  UnifiedSearchResult,
  AutocompleteRequest,
  AutocompleteSuggestion,
} from './search.types';

export type SourceName = 'elasticsearch' | 'mcp-adapter' | 'database';
export type SourceStatus = 'healthy' | 'degraded' | 'unavailable';

export interface SourceHealthStatus {
  name: SourceName;
  status: SourceStatus;
  latencyMs: number;
  lastChecked: Date;
  errorCount: number;
  consecutiveFailures: number;
}

export interface SourceQueryResult {
  source: SourceName;
  results: UnifiedSearchResult[];
  totalCount: number;
  latencyMs: number;
  error?: SourceError;
}

export interface SourceError {
  code: string;
  message: string;
  source: SourceName;
  retryable: boolean;
  timestamp: Date;
}

export interface SourceConfig {
  name: SourceName;
  enabled: boolean;
  timeoutMs: number;
  priority: number;
  maxRetries: number;
  circuitBreaker: CircuitBreakerConfig;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface SearchSource {
  readonly name: SourceName;
  search(request: SearchRequest): Promise<SourceQueryResult>;
  autocomplete(request: AutocompleteRequest): Promise<AutocompleteSuggestion[]>;
  healthCheck(): Promise<SourceHealthStatus>;
  isAvailable(): boolean;
}

export interface SourceMetrics {
  source: SourceName;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  timeoutCount: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  circuitBreakerState: CircuitBreakerState;
}
