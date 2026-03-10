import { QueryLogger } from '../analytics/query-logger';
import { ClickTracker } from '../analytics/click-tracker';
import { ConversionTracker } from '../analytics/conversion-tracker';
import { AnalyticsAggregator } from '../analytics/analytics-aggregator';

describe('QueryLogger', () => {
  let logger: QueryLogger;

  beforeEach(() => {
    logger = new QueryLogger();
  });

  it('should log queries', () => {
    logger.log({
      queryId: 'q-1',
      userId: 'user-1',
      query: 'pizza',
      resultCount: 10,
      latencyMs: 50,
      timestamp: Date.now(),
    });

    expect(logger.getLogCount()).toBe(1);
  });

  it('should retrieve recent logs', () => {
    for (let i = 0; i < 5; i++) {
      logger.log({
        queryId: `q-${i}`,
        query: `query-${i}`,
        resultCount: i,
        latencyMs: 50,
        timestamp: Date.now(),
      });
    }

    const recent = logger.getRecentLogs(3);
    expect(recent).toHaveLength(3);
  });

  it('should filter logs by user', () => {
    logger.log({
      queryId: 'q-1',
      userId: 'user-1',
      query: 'pizza',
      resultCount: 5,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    logger.log({
      queryId: 'q-2',
      userId: 'user-2',
      query: 'burger',
      resultCount: 3,
      latencyMs: 30,
      timestamp: Date.now(),
    });

    const userLogs = logger.getLogsByUser('user-1');
    expect(userLogs).toHaveLength(1);
    expect(userLogs[0]!.query).toBe('pizza');
  });

  it('should find zero result queries', () => {
    logger.log({
      queryId: 'q-1',
      query: 'pizza',
      resultCount: 10,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    logger.log({
      queryId: 'q-2',
      query: 'xyzfood',
      resultCount: 0,
      latencyMs: 20,
      timestamp: Date.now(),
    });

    const zeroResults = logger.getZeroResultQueries();
    expect(zeroResults).toHaveLength(1);
    expect(zeroResults[0]!.query).toBe('xyzfood');
  });

  it('should enforce max log limit', () => {
    const smallLogger = new QueryLogger(5);
    for (let i = 0; i < 10; i++) {
      smallLogger.log({
        queryId: `q-${i}`,
        query: `query-${i}`,
        resultCount: 1,
        latencyMs: 50,
        timestamp: Date.now(),
      });
    }
    expect(smallLogger.getLogCount()).toBe(5);
  });

  it('should clear logs', () => {
    logger.log({
      queryId: 'q-1',
      query: 'pizza',
      resultCount: 5,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    logger.clear();
    expect(logger.getLogCount()).toBe(0);
  });
});

describe('ClickTracker', () => {
  let tracker: ClickTracker;

  beforeEach(() => {
    tracker = new ClickTracker();
  });

  it('should track click events', () => {
    tracker.trackClick({
      queryId: 'q-1',
      userId: 'user-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });

    expect(tracker.getClickCount()).toBe(1);
  });

  it('should retrieve clicks by query', () => {
    tracker.trackClick({
      queryId: 'q-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });
    tracker.trackClick({
      queryId: 'q-2',
      resultId: 'doc-2',
      position: 2,
      timestamp: Date.now(),
    });

    const clicks = tracker.getClicksByQuery('q-1');
    expect(clicks).toHaveLength(1);
  });

  it('should calculate average click position', () => {
    tracker.trackClick({
      queryId: 'q-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });
    tracker.trackClick({
      queryId: 'q-2',
      resultId: 'doc-2',
      position: 3,
      timestamp: Date.now(),
    });

    expect(tracker.getAverageClickPosition()).toBe(2);
  });

  it('should return 0 for average when no clicks', () => {
    expect(tracker.getAverageClickPosition()).toBe(0);
  });

  it('should retrieve clicks by user', () => {
    tracker.trackClick({
      queryId: 'q-1',
      userId: 'user-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });

    expect(tracker.getClicksByUser('user-1')).toHaveLength(1);
    expect(tracker.getClicksByUser('user-2')).toHaveLength(0);
  });
});

describe('ConversionTracker', () => {
  let tracker: ConversionTracker;

  beforeEach(() => {
    tracker = new ConversionTracker();
  });

  it('should track conversion events', () => {
    tracker.trackConversion({
      queryId: 'q-1',
      userId: 'user-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });

    expect(tracker.getConversionCount()).toBe(1);
  });

  it('should count unique orders', () => {
    tracker.trackConversion({
      queryId: 'q-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });
    tracker.trackConversion({
      queryId: 'q-2',
      resultId: 'doc-2',
      orderId: 'order-1',
      timestamp: Date.now(),
    });
    tracker.trackConversion({
      queryId: 'q-3',
      resultId: 'doc-3',
      orderId: 'order-2',
      timestamp: Date.now(),
    });

    expect(tracker.getUniqueOrderCount()).toBe(2);
  });

  it('should retrieve conversions by query', () => {
    tracker.trackConversion({
      queryId: 'q-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });

    expect(tracker.getConversionsByQuery('q-1')).toHaveLength(1);
    expect(tracker.getConversionsByQuery('q-2')).toHaveLength(0);
  });
});

describe('AnalyticsAggregator', () => {
  let queryLogger: QueryLogger;
  let clickTracker: ClickTracker;
  let conversionTracker: ConversionTracker;
  let aggregator: AnalyticsAggregator;

  beforeEach(() => {
    queryLogger = new QueryLogger();
    clickTracker = new ClickTracker();
    conversionTracker = new ConversionTracker();
    aggregator = new AnalyticsAggregator(
      queryLogger,
      clickTracker,
      conversionTracker
    );
  });

  it('should return empty stats when no data', () => {
    const stats = aggregator.getSearchStats();
    expect(stats.totalQueries).toBe(0);
    expect(stats.avgLatencyMs).toBe(0);
  });

  it('should compute search stats', () => {
    queryLogger.log({
      queryId: 'q-1',
      query: 'pizza',
      resultCount: 10,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    queryLogger.log({
      queryId: 'q-2',
      query: 'burger',
      resultCount: 5,
      latencyMs: 30,
      timestamp: Date.now(),
    });
    queryLogger.log({
      queryId: 'q-3',
      query: 'pizza',
      resultCount: 0,
      latencyMs: 20,
      timestamp: Date.now(),
    });

    const stats = aggregator.getSearchStats();
    expect(stats.totalQueries).toBe(3);
    expect(stats.uniqueQueries).toBe(2);
    expect(stats.avgLatencyMs).toBeCloseTo(33.33, 1);
    expect(stats.zeroResultRate).toBeCloseTo(1 / 3, 2);
  });

  it('should compute quality metrics', () => {
    queryLogger.log({
      queryId: 'q-1',
      query: 'pizza',
      resultCount: 10,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    clickTracker.trackClick({
      queryId: 'q-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });
    conversionTracker.trackConversion({
      queryId: 'q-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });

    const metrics = aggregator.getQualityMetrics();
    expect(metrics.clickThroughRate).toBe(1);
    expect(metrics.conversionRate).toBe(1);
    expect(metrics.meanReciprocalRank).toBe(1);
  });

  it('should get top queries', () => {
    queryLogger.log({
      queryId: 'q-1',
      query: 'pizza',
      resultCount: 10,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    queryLogger.log({
      queryId: 'q-2',
      query: 'pizza',
      resultCount: 8,
      latencyMs: 40,
      timestamp: Date.now(),
    });
    queryLogger.log({
      queryId: 'q-3',
      query: 'burger',
      resultCount: 5,
      latencyMs: 30,
      timestamp: Date.now(),
    });

    const topQueries = aggregator.getTopQueries(5);
    expect(topQueries[0]!.query).toBe('pizza');
    expect(topQueries[0]!.count).toBe(2);
  });

  it('should get zero result queries', () => {
    queryLogger.log({
      queryId: 'q-1',
      query: 'xyzfood',
      resultCount: 0,
      latencyMs: 20,
      timestamp: Date.now(),
    });
    queryLogger.log({
      queryId: 'q-2',
      query: 'xyzfood',
      resultCount: 0,
      latencyMs: 25,
      timestamp: Date.now(),
    });

    const zeroQueries = aggregator.getZeroResultQueries(5);
    expect(zeroQueries[0]!.query).toBe('xyzfood');
    expect(zeroQueries[0]!.count).toBe(2);
  });
});
