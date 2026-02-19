import * as promClient from 'prom-client';

export interface MetricsConfig {
  defaultLabels?: Record<string, string>;
  enableDefaultMetrics?: boolean;
  prefix?: string;
}

/**
 * Prometheus metrics service
 * Provides metrics collection for monitoring and alerting
 */
export class MetricsService {
  private registry: promClient.Registry;
  private prefix: string;

  // HTTP Metrics
  private httpRequestDuration: promClient.Histogram;
  private httpRequestTotal: promClient.Counter;
  private httpRequestErrors: promClient.Counter;

  // Database Metrics
  private dbQueryDuration: promClient.Histogram;
  private dbConnectionPool: promClient.Gauge;

  // Cache Metrics
  private cacheHits: promClient.Counter;
  private cacheMisses: promClient.Counter;

  // Job Processing Metrics
  private jobDuration: promClient.Histogram;
  private jobTotal: promClient.Counter;
  private jobErrors: promClient.Counter;
  private activeJobs: promClient.Gauge;

  // Custom Business Metrics
  private orderTotal: promClient.Counter;
  private orderValue: promClient.Histogram;

  constructor(config: MetricsConfig = {}) {
    const {
      defaultLabels = {},
      enableDefaultMetrics = true,
      prefix = 'foodbot_',
    } = config;

    this.prefix = prefix;
    this.registry = new promClient.Registry();

    // Set default labels
    this.registry.setDefaultLabels({
      app: 'foodbot',
      environment: process.env.NODE_ENV || 'development',
      ...defaultLabels,
    });

    // Enable default system metrics
    if (enableDefaultMetrics) {
      promClient.collectDefaultMetrics({
        register: this.registry,
        prefix: this.prefix,
      });
    }

    // Initialize HTTP metrics
    this.httpRequestDuration = new promClient.Histogram({
      name: `${this.prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.httpRequestTotal = new promClient.Counter({
      name: `${this.prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestErrors = new promClient.Counter({
      name: `${this.prefix}http_request_errors_total`,
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Initialize database metrics
    this.dbQueryDuration = new promClient.Histogram({
      name: `${this.prefix}db_query_duration_seconds`,
      help: 'Database query duration in seconds',
      labelNames: ['query_type', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
      registers: [this.registry],
    });

    this.dbConnectionPool = new promClient.Gauge({
      name: `${this.prefix}db_connection_pool`,
      help: 'Database connection pool status',
      labelNames: ['state'],
      registers: [this.registry],
    });

    // Initialize cache metrics
    this.cacheHits = new promClient.Counter({
      name: `${this.prefix}cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    this.cacheMisses = new promClient.Counter({
      name: `${this.prefix}cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['cache_name'],
      registers: [this.registry],
    });

    // Initialize job metrics
    this.jobDuration = new promClient.Histogram({
      name: `${this.prefix}job_duration_seconds`,
      help: 'Job processing duration in seconds',
      labelNames: ['job_type', 'status'],
      buckets: [0.1, 1, 5, 10, 30, 60, 120],
      registers: [this.registry],
    });

    this.jobTotal = new promClient.Counter({
      name: `${this.prefix}jobs_total`,
      help: 'Total number of jobs processed',
      labelNames: ['job_type', 'status'],
      registers: [this.registry],
    });

    this.jobErrors = new promClient.Counter({
      name: `${this.prefix}job_errors_total`,
      help: 'Total number of job errors',
      labelNames: ['job_type', 'error_type'],
      registers: [this.registry],
    });

    this.activeJobs = new promClient.Gauge({
      name: `${this.prefix}active_jobs`,
      help: 'Number of currently active jobs',
      labelNames: ['job_type'],
      registers: [this.registry],
    });

    // Initialize business metrics
    this.orderTotal = new promClient.Counter({
      name: `${this.prefix}orders_total`,
      help: 'Total number of orders',
      labelNames: ['status', 'restaurant_id'],
      registers: [this.registry],
    });

    this.orderValue = new promClient.Histogram({
      name: `${this.prefix}order_value`,
      help: 'Order value distribution',
      labelNames: ['restaurant_id'],
      buckets: [5, 10, 20, 50, 100, 200, 500],
      registers: [this.registry],
    });
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };
    this.httpRequestDuration.observe(labels, duration);
    this.httpRequestTotal.inc(labels);
  }

  /**
   * Record HTTP request error
   */
  recordHttpError(method: string, route: string, errorType: string): void {
    this.httpRequestErrors.inc({ method, route, error_type: errorType });
  }

  /**
   * Record database query duration
   */
  recordDbQuery(queryType: string, table: string, duration: number): void {
    this.dbQueryDuration.observe({ query_type: queryType, table }, duration);
  }

  /**
   * Update database connection pool metrics
   */
  updateDbConnectionPool(idle: number, active: number, waiting: number): void {
    this.dbConnectionPool.set({ state: 'idle' }, idle);
    this.dbConnectionPool.set({ state: 'active' }, active);
    this.dbConnectionPool.set({ state: 'waiting' }, waiting);
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheName: string): void {
    this.cacheHits.inc({ cache_name: cacheName });
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheName: string): void {
    this.cacheMisses.inc({ cache_name: cacheName });
  }

  /**
   * Record job processing
   */
  recordJob(jobType: string, status: 'success' | 'failure', duration: number): void {
    this.jobDuration.observe({ job_type: jobType, status }, duration);
    this.jobTotal.inc({ job_type: jobType, status });
  }

  /**
   * Record job error
   */
  recordJobError(jobType: string, errorType: string): void {
    this.jobErrors.inc({ job_type: jobType, error_type: errorType });
  }

  /**
   * Set active jobs count
   */
  setActiveJobs(jobType: string, count: number): void {
    this.activeJobs.set({ job_type: jobType }, count);
  }

  /**
   * Record order
   */
  recordOrder(status: string, restaurantId: string, value: number): void {
    this.orderTotal.inc({ status, restaurant_id: restaurantId });
    this.orderValue.observe({ restaurant_id: restaurantId }, value);
  }

  /**
   * Create custom counter
   */
  createCounter(
    name: string,
    help: string,
    labelNames: string[] = []
  ): promClient.Counter {
    return new promClient.Counter({
      name: `${this.prefix}${name}`,
      help,
      labelNames,
      registers: [this.registry],
    });
  }

  /**
   * Create custom gauge
   */
  createGauge(name: string, help: string, labelNames: string[] = []): promClient.Gauge {
    return new promClient.Gauge({
      name: `${this.prefix}${name}`,
      help,
      labelNames,
      registers: [this.registry],
    });
  }

  /**
   * Create custom histogram
   */
  createHistogram(
    name: string,
    help: string,
    labelNames: string[] = [],
    buckets?: number[]
  ): promClient.Histogram {
    return new promClient.Histogram({
      name: `${this.prefix}${name}`,
      help,
      labelNames,
      buckets,
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get registry instance
   */
  getRegistry(): promClient.Registry {
    return this.registry;
  }

  /**
   * Reset all metrics (useful for testing)
   */
  reset(): void {
    this.registry.resetMetrics();
  }
}

/**
 * Global metrics instance
 */
export const metrics = new MetricsService();
