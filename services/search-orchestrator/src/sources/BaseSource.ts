/**
 * Abstract base class for all search data sources.
 * Provides common functionality: circuit breaker, timeout handling, metrics tracking.
 */

import pino from 'pino';

import type {
  SearchSource,
  SourceName,
  SourceHealthStatus,
  SourceQueryResult,
  SourceConfig,
  CircuitBreakerState,
  SourceMetrics,
  SourceError,
} from '../types/source.types';
import type {
  SearchRequest,
  AutocompleteRequest,
  AutocompleteSuggestion,
} from '../types/search.types';

export abstract class BaseSource implements SearchSource {
  abstract readonly name: SourceName;

  protected readonly logger: pino.Logger;
  protected readonly config: SourceConfig;

  private circuitState: CircuitBreakerState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private latencies: number[] = [];
  private totalRequests = 0;
  private successCount = 0;
  private errorCount = 0;
  private timeoutCount = 0;

  private static readonly MAX_LATENCY_SAMPLES = 1000;

  constructor(config: SourceConfig, logger: pino.Logger) {
    this.config = config;
    this.logger = logger.child({ source: config.name });
  }

  async search(request: SearchRequest): Promise<SourceQueryResult> {
    if (!this.isAvailable()) {
      return this.createSkippedResult(request);
    }

    this.totalRequests++;
    const startTime = Date.now();

    try {
      const result = await this.executeSearch(request);
      const latencyMs = Date.now() - startTime;

      this.recordLatency(latencyMs);
      this.recordSuccess();

      return {
        ...result,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.recordLatency(latencyMs);

      const sourceError = this.classifyError(error);
      this.recordFailure(sourceError);

      this.logger.error({ error: sourceError, latencyMs }, `Search failed on ${this.name}`);

      return {
        source: this.config.name,
        results: [],
        totalCount: 0,
        latencyMs,
        error: sourceError,
      };
    }
  }

  async autocomplete(request: AutocompleteRequest): Promise<AutocompleteSuggestion[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      return await this.executeAutocomplete(request);
    } catch (error) {
      this.logger.error({ error }, `Autocomplete failed on ${this.name}`);
      return [];
    }
  }

  async healthCheck(): Promise<SourceHealthStatus> {
    const startTime = Date.now();

    try {
      await this.executeHealthCheck();
      const latencyMs = Date.now() - startTime;

      return {
        name: this.config.name,
        status: this.circuitState === 'closed' ? 'healthy' : 'degraded',
        latencyMs,
        lastChecked: new Date(),
        errorCount: this.errorCount,
        consecutiveFailures: this.failureCount,
      };
    } catch (_error) {
      const latencyMs = Date.now() - startTime;

      return {
        name: this.config.name,
        status: 'unavailable',
        latencyMs,
        lastChecked: new Date(),
        errorCount: this.errorCount,
        consecutiveFailures: this.failureCount,
      };
    }
  }

  isAvailable(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.circuitBreaker.resetTimeoutMs) {
        this.circuitState = 'half-open';
        this.halfOpenAttempts = 0;
        this.logger.info(`Circuit breaker transitioning to half-open for ${this.name}`);
        return true;
      }
      return false;
    }

    if (this.circuitState === 'half-open') {
      return this.halfOpenAttempts < this.config.circuitBreaker.halfOpenRequests;
    }

    return true;
  }

  getMetrics(): SourceMetrics {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);
    const avgLatency =
      sortedLatencies.length > 0
        ? sortedLatencies.reduce((sum, val) => sum + val, 0) / sortedLatencies.length
        : 0;

    return {
      source: this.config.name,
      totalRequests: this.totalRequests,
      successCount: this.successCount,
      errorCount: this.errorCount,
      timeoutCount: this.timeoutCount,
      averageLatencyMs: Math.round(avgLatency),
      p95LatencyMs: this.getPercentile(sortedLatencies, 95),
      p99LatencyMs: this.getPercentile(sortedLatencies, 99),
      circuitBreakerState: this.circuitState,
    };
  }

  protected abstract executeSearch(request: SearchRequest): Promise<SourceQueryResult>;
  protected abstract executeAutocomplete(request: AutocompleteRequest): Promise<AutocompleteSuggestion[]>;
  protected abstract executeHealthCheck(): Promise<void>;

  private createSkippedResult(_request: SearchRequest): SourceQueryResult {
    return {
      source: this.config.name,
      results: [],
      totalCount: 0,
      latencyMs: 0,
      error: {
        code: 'SOURCE_UNAVAILABLE',
        message: `Source ${this.name} is unavailable (circuit breaker: ${this.circuitState})`,
        source: this.config.name,
        retryable: true,
        timestamp: new Date(),
      },
    };
  }

  private classifyError(error: unknown): SourceError {
    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('timeout'));

    if (isTimeout) {
      this.timeoutCount++;
    }

    return {
      code: isTimeout ? 'TIMEOUT' : 'SOURCE_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      source: this.config.name,
      retryable: isTimeout,
      timestamp: new Date(),
    };
  }

  private recordSuccess(): void {
    this.successCount++;

    if (this.circuitState === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.config.circuitBreaker.halfOpenRequests) {
        this.circuitState = 'closed';
        this.failureCount = 0;
        this.logger.info(`Circuit breaker closed for ${this.name}`);
      }
    } else {
      this.failureCount = 0;
    }
  }

  private recordFailure(_error: SourceError): void {
    this.errorCount++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.circuitState === 'half-open') {
      this.circuitState = 'open';
      this.logger.warn(`Circuit breaker re-opened for ${this.name}`);
    } else if (this.failureCount >= this.config.circuitBreaker.failureThreshold) {
      this.circuitState = 'open';
      this.logger.warn(
        `Circuit breaker opened for ${this.name} after ${this.failureCount} failures`,
      );
    }
  }

  private recordLatency(ms: number): void {
    this.latencies.push(ms);
    if (this.latencies.length > BaseSource.MAX_LATENCY_SAMPLES) {
      this.latencies.shift();
    }
  }

  private getPercentile(sorted: number[], percentile: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }
}
