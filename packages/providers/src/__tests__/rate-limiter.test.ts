import { RateLimiter, RateLimitExceededError } from '../manager/rate-limiter';

describe('RateLimiter', () => {
  let currentTime: number;
  const mockClock = (): number => currentTime;

  beforeEach(() => {
    currentTime = 1000000;
  });

  function createLimiter(
    overrides?: { maxTokens?: number; refillRate?: number; refillIntervalMs?: number }
  ): RateLimiter {
    return new RateLimiter(
      {
        maxTokens: overrides?.maxTokens ?? 10,
        refillRate: overrides?.refillRate ?? 10,
        refillIntervalMs: overrides?.refillIntervalMs ?? 60000,
      },
      mockClock
    );
  }

  describe('initial state', () => {
    it('should start with full tokens', () => {
      const limiter = createLimiter({ maxTokens: 10 });
      expect(limiter.getRemainingTokens()).toBe(10);
    });
  });

  describe('tryAcquire', () => {
    it('should acquire a token successfully', () => {
      const limiter = createLimiter({ maxTokens: 5 });
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.getRemainingTokens()).toBe(4);
    });

    it('should return false when no tokens available', () => {
      const limiter = createLimiter({ maxTokens: 2 });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);
    });

    it('should consume tokens one at a time', () => {
      const limiter = createLimiter({ maxTokens: 5 });

      for (let i = 0; i < 5; i++) {
        expect(limiter.tryAcquire()).toBe(true);
      }

      expect(limiter.getRemainingTokens()).toBe(0);
      expect(limiter.tryAcquire()).toBe(false);
    });
  });

  describe('token refill', () => {
    it('should refill tokens over time', () => {
      const limiter = createLimiter({
        maxTokens: 10,
        refillRate: 10,
        refillIntervalMs: 60000,
      });

      // Use all tokens
      for (let i = 0; i < 10; i++) {
        limiter.tryAcquire();
      }
      expect(limiter.getRemainingTokens()).toBe(0);

      // Advance half the refill interval
      currentTime += 30000;
      expect(limiter.getRemainingTokens()).toBe(5);
    });

    it('should not exceed max tokens on refill', () => {
      const limiter = createLimiter({
        maxTokens: 10,
        refillRate: 10,
        refillIntervalMs: 60000,
      });

      // Advance way past refill interval
      currentTime += 300000;

      expect(limiter.getRemainingTokens()).toBe(10);
    });

    it('should refill proportionally', () => {
      const limiter = createLimiter({
        maxTokens: 100,
        refillRate: 100,
        refillIntervalMs: 60000,
      });

      // Use 50 tokens
      for (let i = 0; i < 50; i++) {
        limiter.tryAcquire();
      }

      // Advance 25% of interval
      currentTime += 15000;

      // Should have 50 remaining + 25 refilled = 75
      expect(limiter.getRemainingTokens()).toBe(75);
    });

    it('should allow acquire after refill', () => {
      const limiter = createLimiter({
        maxTokens: 1,
        refillRate: 1,
        refillIntervalMs: 1000,
      });

      expect(limiter.tryAcquire()).toBe(true);
      expect(limiter.tryAcquire()).toBe(false);

      // Advance full interval
      currentTime += 1000;

      expect(limiter.tryAcquire()).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset tokens to max', () => {
      const limiter = createLimiter({ maxTokens: 10 });

      for (let i = 0; i < 10; i++) {
        limiter.tryAcquire();
      }

      expect(limiter.getRemainingTokens()).toBe(0);
      limiter.reset();
      expect(limiter.getRemainingTokens()).toBe(10);
    });
  });

  describe('RateLimitExceededError', () => {
    it('should have correct name', () => {
      const error = new RateLimitExceededError('test');
      expect(error.name).toBe('RateLimitExceededError');
      expect(error.message).toBe('test');
    });
  });
});
