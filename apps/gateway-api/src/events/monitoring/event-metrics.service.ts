import { Injectable, Logger } from '@nestjs/common';

/**
 * Metrics collection for Kafka event processing.
 *
 * Tracks:
 * - Event publish counts per topic
 * - Event processing latency
 * - Error rates per topic
 * - Consumer lag (placeholder for production Prometheus integration)
 * - Throughput rates
 */
@Injectable()
export class EventMetricsService {
  private readonly logger = new Logger(EventMetricsService.name);

  private readonly publishCounts = new Map<string, number>();
  private readonly errorCounts = new Map<string, number>();
  private readonly latencies = new Map<string, number[]>();
  private startTime = Date.now();

  /**
   * Record a successful event publish.
   */
  recordPublish(topic: string): void {
    const current = this.publishCounts.get(topic) || 0;
    this.publishCounts.set(topic, current + 1);
  }

  /**
   * Record a publish or processing error.
   */
  recordError(topic: string): void {
    const current = this.errorCounts.get(topic) || 0;
    this.errorCounts.set(topic, current + 1);
  }

  /**
   * Record event processing latency in milliseconds.
   */
  recordLatency(topic: string, latencyMs: number): void {
    const existing = this.latencies.get(topic) || [];
    existing.push(latencyMs);

    // Keep only the last 1000 latency samples per topic
    if (existing.length > 1000) {
      existing.shift();
    }

    this.latencies.set(topic, existing);
  }

  /**
   * Get metrics for all topics.
   */
  getMetrics(): {
    topics: Record<string, {
      publishCount: number;
      errorCount: number;
      errorRate: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      p99LatencyMs: number;
    }>;
    global: {
      totalPublished: number;
      totalErrors: number;
      overallErrorRate: number;
      uptimeSeconds: number;
      eventsPerSecond: number;
    };
  } {
    const allTopics = new Set([
      ...this.publishCounts.keys(),
      ...this.errorCounts.keys(),
    ]);

    const topics: Record<string, {
      publishCount: number;
      errorCount: number;
      errorRate: number;
      avgLatencyMs: number;
      p95LatencyMs: number;
      p99LatencyMs: number;
    }> = {};

    let totalPublished = 0;
    let totalErrors = 0;

    for (const topic of allTopics) {
      const publishCount = this.publishCounts.get(topic) || 0;
      const errorCount = this.errorCounts.get(topic) || 0;
      const topicLatencies = this.latencies.get(topic) || [];

      totalPublished += publishCount;
      totalErrors += errorCount;

      const sorted = [...topicLatencies].sort((a, b) => a - b);
      const avgLatencyMs = sorted.length > 0
        ? sorted.reduce((sum, l) => sum + l, 0) / sorted.length
        : 0;
      const p95LatencyMs = sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.95)] || 0
        : 0;
      const p99LatencyMs = sorted.length > 0
        ? sorted[Math.floor(sorted.length * 0.99)] || 0
        : 0;

      topics[topic] = {
        publishCount,
        errorCount,
        errorRate: publishCount > 0 ? errorCount / publishCount : 0,
        avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
        p95LatencyMs,
        p99LatencyMs,
      };
    }

    const uptimeSeconds = (Date.now() - this.startTime) / 1000;

    return {
      topics,
      global: {
        totalPublished,
        totalErrors,
        overallErrorRate: totalPublished > 0 ? totalErrors / totalPublished : 0,
        uptimeSeconds: Math.round(uptimeSeconds),
        eventsPerSecond: uptimeSeconds > 0
          ? Math.round((totalPublished / uptimeSeconds) * 100) / 100
          : 0,
      },
    };
  }

  /**
   * Get metrics formatted for Prometheus exposition format.
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    lines.push('# HELP foodbot_kafka_events_published_total Total number of events published');
    lines.push('# TYPE foodbot_kafka_events_published_total counter');
    for (const [topic, data] of Object.entries(metrics.topics)) {
      lines.push(`foodbot_kafka_events_published_total{topic="${topic}"} ${data.publishCount}`);
    }

    lines.push('');
    lines.push('# HELP foodbot_kafka_events_errors_total Total number of event errors');
    lines.push('# TYPE foodbot_kafka_events_errors_total counter');
    for (const [topic, data] of Object.entries(metrics.topics)) {
      lines.push(`foodbot_kafka_events_errors_total{topic="${topic}"} ${data.errorCount}`);
    }

    lines.push('');
    lines.push('# HELP foodbot_kafka_events_latency_avg_ms Average event latency in milliseconds');
    lines.push('# TYPE foodbot_kafka_events_latency_avg_ms gauge');
    for (const [topic, data] of Object.entries(metrics.topics)) {
      lines.push(`foodbot_kafka_events_latency_avg_ms{topic="${topic}"} ${data.avgLatencyMs}`);
    }

    lines.push('');
    lines.push('# HELP foodbot_kafka_events_latency_p95_ms P95 event latency in milliseconds');
    lines.push('# TYPE foodbot_kafka_events_latency_p95_ms gauge');
    for (const [topic, data] of Object.entries(metrics.topics)) {
      lines.push(`foodbot_kafka_events_latency_p95_ms{topic="${topic}"} ${data.p95LatencyMs}`);
    }

    lines.push('');
    lines.push('# HELP foodbot_kafka_uptime_seconds Service uptime in seconds');
    lines.push('# TYPE foodbot_kafka_uptime_seconds gauge');
    lines.push(`foodbot_kafka_uptime_seconds ${metrics.global.uptimeSeconds}`);

    lines.push('');
    lines.push('# HELP foodbot_kafka_events_per_second Current event throughput');
    lines.push('# TYPE foodbot_kafka_events_per_second gauge');
    lines.push(`foodbot_kafka_events_per_second ${metrics.global.eventsPerSecond}`);

    return lines.join('\n');
  }

  /**
   * Reset all metrics (for testing).
   */
  reset(): void {
    this.publishCounts.clear();
    this.errorCounts.clear();
    this.latencies.clear();
    this.startTime = Date.now();
  }
}
