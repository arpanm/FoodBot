import { WeightCalculator } from '../preference/weight-calculator';

describe('WeightCalculator', () => {
  let calculator: WeightCalculator;

  beforeEach(() => {
    calculator = new WeightCalculator();
  });

  describe('calculateWeight', () => {
    it('should calculate weight from components', () => {
      const weight = calculator.calculateWeight({
        frequency: 0.8,
        recencyDecay: 0.9,
        rating: 0.8,
        contextMultiplier: 1.0,
      });
      expect(weight).toBeCloseTo(0.576, 2);
    });

    it('should clamp weight to max 1.0', () => {
      const weight = calculator.calculateWeight({
        frequency: 1.0,
        recencyDecay: 1.0,
        rating: 1.0,
        contextMultiplier: 1.5,
      });
      expect(weight).toBe(1.0);
    });

    it('should clamp weight to min 0', () => {
      const weight = calculator.calculateWeight({
        frequency: 0,
        recencyDecay: 1.0,
        rating: 1.0,
        contextMultiplier: 1.0,
      });
      expect(weight).toBe(0);
    });

    it('should handle zero context multiplier', () => {
      const weight = calculator.calculateWeight({
        frequency: 0.8,
        recencyDecay: 0.9,
        rating: 0.8,
        contextMultiplier: 0,
      });
      expect(weight).toBe(0);
    });
  });

  describe('calculateFrequencyScore', () => {
    it('should calculate frequency as ratio', () => {
      expect(calculator.calculateFrequencyScore(5, 10)).toBe(0.5);
    });

    it('should cap at 1.0', () => {
      expect(calculator.calculateFrequencyScore(15, 10)).toBe(1.0);
    });

    it('should return 0 for zero maxOrders', () => {
      expect(calculator.calculateFrequencyScore(5, 0)).toBe(0);
    });

    it('should handle zero orderCount', () => {
      expect(calculator.calculateFrequencyScore(0, 10)).toBe(0);
    });
  });

  describe('calculateRecencyDecay', () => {
    it('should return 1.0 for 0 days', () => {
      expect(calculator.calculateRecencyDecay(0)).toBe(1.0);
    });

    it('should return 0.5 for half-life (30 days)', () => {
      expect(calculator.calculateRecencyDecay(30)).toBeCloseTo(0.5, 5);
    });

    it('should return ~0.25 for 60 days', () => {
      expect(calculator.calculateRecencyDecay(60)).toBeCloseTo(0.25, 2);
    });

    it('should return 1.0 for negative days', () => {
      expect(calculator.calculateRecencyDecay(-5)).toBe(1.0);
    });

    it('should approach 0 for very old orders', () => {
      const decay = calculator.calculateRecencyDecay(365);
      expect(decay).toBeLessThan(0.01);
    });
  });

  describe('calculateRatingScore', () => {
    it('should normalize 5-star rating to 1.0', () => {
      expect(calculator.calculateRatingScore(5)).toBe(1.0);
    });

    it('should normalize 4-star rating to 0.8', () => {
      expect(calculator.calculateRatingScore(4)).toBeCloseTo(0.8, 5);
    });

    it('should return 0.7 for null rating', () => {
      expect(calculator.calculateRatingScore(null)).toBe(0.7);
    });

    it('should handle 0 rating', () => {
      expect(calculator.calculateRatingScore(0)).toBe(0);
    });
  });

  describe('calculateContextMultiplier', () => {
    it('should return 1.0 for no context match', () => {
      expect(calculator.calculateContextMultiplier(false, false)).toBe(1.0);
    });

    it('should boost 1.2x for day match', () => {
      expect(calculator.calculateContextMultiplier(true, false)).toBeCloseTo(1.2, 5);
    });

    it('should boost 1.3x for time match', () => {
      expect(calculator.calculateContextMultiplier(false, true)).toBeCloseTo(1.3, 5);
    });

    it('should boost 1.56x for both day and time match', () => {
      expect(calculator.calculateContextMultiplier(true, true)).toBeCloseTo(1.56, 2);
    });
  });

  describe('computeFullWeight', () => {
    it('should compute full weight from raw parameters', () => {
      const weight = calculator.computeFullWeight(5, 10, 0, 5, false, false);
      // frequency=0.5, recency=1.0, rating=1.0, context=1.0
      expect(weight).toBeCloseTo(0.5, 2);
    });

    it('should apply context boost', () => {
      const withoutContext = calculator.computeFullWeight(5, 10, 0, 5, false, false);
      const withContext = calculator.computeFullWeight(5, 10, 0, 5, true, true);
      expect(withContext).toBeGreaterThan(withoutContext);
    });

    it('should apply decay for older orders', () => {
      const recent = calculator.computeFullWeight(5, 10, 1, 5, false, false);
      const old = calculator.computeFullWeight(5, 10, 60, 5, false, false);
      expect(recent).toBeGreaterThan(old);
    });
  });

  describe('isAboveThreshold', () => {
    it('should return true for weight above threshold', () => {
      expect(calculator.isAboveThreshold(0.1)).toBe(true);
    });

    it('should return false for weight below threshold', () => {
      expect(calculator.isAboveThreshold(0.01)).toBe(false);
    });

    it('should return true at exact threshold', () => {
      expect(calculator.isAboveThreshold(0.05)).toBe(true);
    });
  });

  describe('custom config', () => {
    it('should use custom half-life', () => {
      const customCalc = new WeightCalculator({ halfLifeDays: 15 });
      // With half-life of 15 days, 15 days should give 0.5
      expect(customCalc.calculateRecencyDecay(15)).toBeCloseTo(0.5, 5);
    });

    it('should expose config', () => {
      const config = calculator.getConfig();
      expect(config.halfLifeDays).toBe(30);
      expect(config.minimumWeight).toBe(0.05);
      expect(config.maxAgeDays).toBe(90);
    });
  });
});
