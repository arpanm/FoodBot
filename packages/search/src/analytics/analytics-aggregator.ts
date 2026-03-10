import type {
  SearchStats,
  QualityMetrics,
  QueryFrequency,
} from '../types/analytics.types';
import type { QueryLogger } from './query-logger';
import type { ClickTracker } from './click-tracker';
import type { ConversionTracker } from './conversion-tracker';

export class AnalyticsAggregator {
  constructor(
    private readonly queryLogger: QueryLogger,
    private readonly clickTracker: ClickTracker,
    private readonly conversionTracker: ConversionTracker
  ) {}

  getSearchStats(): SearchStats {
    const logs = this.queryLogger.getRecentLogs(10000);

    if (logs.length === 0) {
      return emptyStats();
    }

    const uniqueQueries = new Set(logs.map((l) => l.query.toLowerCase()));
    const totalLatency = logs.reduce((sum, l) => sum + l.latencyMs, 0);
    const zeroResults = logs.filter((l) => l.resultCount === 0).length;
    const totalResults = logs.reduce((sum, l) => sum + l.resultCount, 0);

    return {
      totalQueries: logs.length,
      uniqueQueries: uniqueQueries.size,
      avgLatencyMs: totalLatency / logs.length,
      zeroResultRate: zeroResults / logs.length,
      avgResultCount: totalResults / logs.length,
    };
  }

  getQualityMetrics(): QualityMetrics {
    const queryCount = this.queryLogger.getLogCount();
    const clickCount = this.clickTracker.getClickCount();
    const conversionCount = this.conversionTracker.getConversionCount();

    return {
      clickThroughRate: safeRate(clickCount, queryCount),
      conversionRate: safeRate(conversionCount, queryCount),
      meanReciprocalRank: this.computeMrr(),
      avgClickPosition: this.clickTracker.getAverageClickPosition(),
      topQueries: this.getTopQueries(10),
      zeroResultQueries: this.getZeroResultQueries(10),
    };
  }

  getTopQueries(limit: number = 10): QueryFrequency[] {
    const logs = this.queryLogger.getRecentLogs(10000);
    return computeTopQueries(logs, limit);
  }

  getZeroResultQueries(limit: number = 10): QueryFrequency[] {
    const zeroLogs = this.queryLogger.getZeroResultQueries();
    return computeTopQueries(zeroLogs, limit);
  }

  private computeMrr(): number {
    const logs = this.queryLogger.getRecentLogs(10000);

    if (logs.length === 0) {
      return 0;
    }

    let totalRr = 0;
    let queriesWithClicks = 0;

    for (const log of logs) {
      const clicks = this.clickTracker.getClicksByQuery(log.queryId);
      if (clicks.length > 0) {
        const minPosition = Math.min(...clicks.map((c) => c.position));
        totalRr += 1 / minPosition;
        queriesWithClicks++;
      }
    }

    return queriesWithClicks > 0 ? totalRr / queriesWithClicks : 0;
  }
}

function emptyStats(): SearchStats {
  return {
    totalQueries: 0,
    uniqueQueries: 0,
    avgLatencyMs: 0,
    zeroResultRate: 0,
    avgResultCount: 0,
  };
}

function safeRate(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function computeTopQueries(
  logs: Array<{ query: string }>,
  limit: number
): QueryFrequency[] {
  const counts = new Map<string, number>();

  for (const log of logs) {
    const query = log.query.toLowerCase();
    counts.set(query, (counts.get(query) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
