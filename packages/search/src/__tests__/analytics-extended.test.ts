import { QueryLogger } from '../analytics/query-logger';
import { ClickTracker } from '../analytics/click-tracker';
import { ConversionTracker } from '../analytics/conversion-tracker';

describe('QueryLogger extended', () => {
  let logger: QueryLogger;

  beforeEach(() => {
    logger = new QueryLogger();
  });

  it('should filter logs by query text', () => {
    logger.log({
      queryId: 'q-1',
      query: 'pizza',
      resultCount: 10,
      latencyMs: 50,
      timestamp: Date.now(),
    });
    logger.log({
      queryId: 'q-2',
      query: 'burger',
      resultCount: 5,
      latencyMs: 30,
      timestamp: Date.now(),
    });
    logger.log({
      queryId: 'q-3',
      query: 'Pizza',
      resultCount: 8,
      latencyMs: 40,
      timestamp: Date.now(),
    });

    const logs = logger.getLogsByQuery('pizza');
    expect(logs).toHaveLength(2);
  });
});

describe('ClickTracker extended', () => {
  let tracker: ClickTracker;

  beforeEach(() => {
    tracker = new ClickTracker();
  });

  it('should enforce max events limit', () => {
    const smallTracker = new ClickTracker(5);
    for (let i = 0; i < 10; i++) {
      smallTracker.trackClick({
        queryId: `q-${i}`,
        resultId: `doc-${i}`,
        position: i + 1,
        timestamp: Date.now(),
      });
    }
    expect(smallTracker.getClickCount()).toBe(5);
  });

  it('should get clicks by result ID', () => {
    tracker.trackClick({
      queryId: 'q-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });
    tracker.trackClick({
      queryId: 'q-2',
      resultId: 'doc-1',
      position: 2,
      timestamp: Date.now(),
    });
    tracker.trackClick({
      queryId: 'q-3',
      resultId: 'doc-2',
      position: 1,
      timestamp: Date.now(),
    });

    expect(tracker.getClicksByResult('doc-1')).toHaveLength(2);
    expect(tracker.getClicksByResult('doc-2')).toHaveLength(1);
  });

  it('should clear all events', () => {
    tracker.trackClick({
      queryId: 'q-1',
      resultId: 'doc-1',
      position: 1,
      timestamp: Date.now(),
    });
    tracker.clear();
    expect(tracker.getClickCount()).toBe(0);
  });
});

describe('ConversionTracker extended', () => {
  let tracker: ConversionTracker;

  beforeEach(() => {
    tracker = new ConversionTracker();
  });

  it('should enforce max events limit', () => {
    const smallTracker = new ConversionTracker(3);
    for (let i = 0; i < 10; i++) {
      smallTracker.trackConversion({
        queryId: `q-${i}`,
        resultId: `doc-${i}`,
        orderId: `order-${i}`,
        timestamp: Date.now(),
      });
    }
    expect(smallTracker.getConversionCount()).toBe(3);
  });

  it('should get conversions by user', () => {
    tracker.trackConversion({
      queryId: 'q-1',
      userId: 'user-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });
    tracker.trackConversion({
      queryId: 'q-2',
      userId: 'user-2',
      resultId: 'doc-2',
      orderId: 'order-2',
      timestamp: Date.now(),
    });

    expect(tracker.getConversionsByUser('user-1')).toHaveLength(1);
    expect(tracker.getConversionsByUser('user-3')).toHaveLength(0);
  });

  it('should get conversions by result', () => {
    tracker.trackConversion({
      queryId: 'q-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });

    expect(tracker.getConversionsByResult('doc-1')).toHaveLength(1);
    expect(tracker.getConversionsByResult('doc-2')).toHaveLength(0);
  });

  it('should clear all events', () => {
    tracker.trackConversion({
      queryId: 'q-1',
      resultId: 'doc-1',
      orderId: 'order-1',
      timestamp: Date.now(),
    });
    tracker.clear();
    expect(tracker.getConversionCount()).toBe(0);
  });
});
