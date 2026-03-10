import { CircuitBreaker, CircuitBreakerOpenError } from '../manager/circuit-breaker';

describe('CircuitBreaker', () => {
  let currentTime: number;
  const mockClock = (): number => currentTime;

  beforeEach(() => {
    currentTime = 1000000;
  });

  function createBreaker(
    overrides?: { failureThreshold?: number; resetTimeoutMs?: number; monitorWindowMs?: number }
  ): CircuitBreaker {
    return new CircuitBreaker(
      {
        failureThreshold: overrides?.failureThreshold ?? 5,
        resetTimeoutMs: overrides?.resetTimeoutMs ?? 30000,
        monitorWindowMs: overrides?.monitorWindowMs ?? 60000,
      },
      mockClock
    );
  }

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      const cb = createBreaker();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should have zero failures initially', () => {
      const cb = createBreaker();
      expect(cb.getFailureCount()).toBe(0);
    });
  });

  describe('execute in CLOSED state', () => {
    it('should execute function successfully', async () => {
      const cb = createBreaker();
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should stay CLOSED on successful execution', async () => {
      const cb = createBreaker();
      await cb.execute(async () => 'ok');
      expect(cb.getState()).toBe('CLOSED');
    });

    it('should record failures but stay CLOSED below threshold', async () => {
      const cb = createBreaker({ failureThreshold: 5 });

      for (let i = 0; i < 4; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailureCount()).toBe(4);
    });
  });

  describe('transition to OPEN', () => {
    it('should open after reaching failure threshold', async () => {
      const cb = createBreaker({ failureThreshold: 3 });

      for (let i = 0; i < 3; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('OPEN');
    });

    it('should reject calls when OPEN', async () => {
      const cb = createBreaker({ failureThreshold: 3 });

      for (let i = 0; i < 3; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      await expect(
        cb.execute(async () => 'should not run')
      ).rejects.toThrow(CircuitBreakerOpenError);
    });

    it('should not count old failures outside monitor window', async () => {
      const cb = createBreaker({ failureThreshold: 3, monitorWindowMs: 10000 });

      // Record 2 failures
      for (let i = 0; i < 2; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      // Advance time past monitor window
      currentTime += 15000;

      // Record 1 more failure - old ones should be pruned
      await expect(
        cb.execute(async () => { throw new Error('fail'); })
      ).rejects.toThrow('fail');

      // Should still be CLOSED since old failures were pruned
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailureCount()).toBe(1);
    });
  });

  describe('transition to HALF_OPEN', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      const cb = createBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 });

      for (let i = 0; i < 3; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('OPEN');

      // Advance time past reset timeout
      currentTime += 6000;

      expect(cb.getState()).toBe('HALF_OPEN');
    });

    it('should transition back to CLOSED on successful HALF_OPEN request', async () => {
      const cb = createBreaker({ failureThreshold: 3, resetTimeoutMs: 5000 });

      for (let i = 0; i < 3; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      currentTime += 6000;

      const result = await cb.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailureCount()).toBe(0);
    });

    it('should transition back to OPEN on failed HALF_OPEN request', async () => {
      const cb = createBreaker({
        failureThreshold: 1,
        resetTimeoutMs: 5000,
        monitorWindowMs: 60000,
      });

      await expect(
        cb.execute(async () => { throw new Error('fail'); })
      ).rejects.toThrow('fail');

      expect(cb.getState()).toBe('OPEN');

      currentTime += 6000;
      expect(cb.getState()).toBe('HALF_OPEN');

      await expect(
        cb.execute(async () => { throw new Error('still broken'); })
      ).rejects.toThrow('still broken');

      expect(cb.getState()).toBe('OPEN');
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', async () => {
      const cb = createBreaker({ failureThreshold: 2 });

      for (let i = 0; i < 2; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      expect(cb.getState()).toBe('OPEN');

      cb.reset();

      expect(cb.getState()).toBe('CLOSED');
      expect(cb.getFailureCount()).toBe(0);
    });

    it('should allow execution after reset', async () => {
      const cb = createBreaker({ failureThreshold: 2 });

      for (let i = 0; i < 2; i++) {
        await expect(
          cb.execute(async () => { throw new Error('fail'); })
        ).rejects.toThrow('fail');
      }

      cb.reset();

      const result = await cb.execute(async () => 'working again');
      expect(result).toBe('working again');
    });
  });

  describe('CircuitBreakerOpenError', () => {
    it('should have correct name', () => {
      const error = new CircuitBreakerOpenError('test');
      expect(error.name).toBe('CircuitBreakerOpenError');
      expect(error.message).toBe('test');
    });
  });
});
