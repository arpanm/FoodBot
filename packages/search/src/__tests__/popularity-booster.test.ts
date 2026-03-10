import {
  applyPopularityBoosts,
  computeTrendingScore,
} from '../ranking/popularity-booster';
import type { FusedResult } from '../types/search.types';

function makeFusedResult(
  id: string,
  overrides: Partial<FusedResult['document']> = {}
): FusedResult {
  return {
    document: {
      id,
      name: `Item ${id}`,
      description: 'Description',
      cuisine: 'Indian',
      price: 200,
      rating: 4.0,
      dietary: [],
      deliveryTime: 30,
      orderCount: 0,
      recentOrderCount: 0,
      ...overrides,
    },
    fusedScore: 1.0,
  };
}

describe('PopularityBooster', () => {
  describe('applyPopularityBoosts', () => {
    it('should boost popular items higher', () => {
      const results: FusedResult[] = [
        makeFusedResult('1', { orderCount: 1000, recentOrderCount: 100 }),
        makeFusedResult('2', { orderCount: 10, recentOrderCount: 1 }),
      ];

      const boosted = applyPopularityBoosts(results);

      expect(boosted[0]!.fusedScore).toBeGreaterThan(boosted[1]!.fusedScore);
    });

    it('should not exceed max boost', () => {
      const results: FusedResult[] = [
        makeFusedResult('1', { orderCount: 100000, recentOrderCount: 50000 }),
      ];

      const boosted = applyPopularityBoosts(results, {
        trendingWeight: 0.7,
        orderCountWeight: 0.3,
        maxBoost: 2.0,
      });

      expect(boosted[0]!.fusedScore).toBeLessThanOrEqual(2.0);
    });

    it('should use custom config', () => {
      const results: FusedResult[] = [
        makeFusedResult('1', { orderCount: 500, recentOrderCount: 50 }),
      ];

      const customBoosted = applyPopularityBoosts(results, {
        trendingWeight: 0.9,
        orderCountWeight: 0.1,
        maxBoost: 3.0,
      });

      expect(customBoosted[0]!.fusedScore).toBeGreaterThan(1.0);
    });

    it('should not boost items with zero orders', () => {
      const results: FusedResult[] = [
        makeFusedResult('1', { orderCount: 0, recentOrderCount: 0 }),
      ];

      const boosted = applyPopularityBoosts(results);
      expect(boosted[0]!.fusedScore).toBe(1.0);
    });

    it('should handle all items with same order count', () => {
      const results: FusedResult[] = [
        makeFusedResult('1', { orderCount: 50, recentOrderCount: 10 }),
        makeFusedResult('2', { orderCount: 50, recentOrderCount: 10 }),
      ];

      const boosted = applyPopularityBoosts(results);
      expect(boosted[0]!.fusedScore).toBe(boosted[1]!.fusedScore);
    });

    it('should handle missing orderCount and recentOrderCount', () => {
      const results: FusedResult[] = [
        {
          document: {
            id: '1',
            name: 'Item',
            description: 'Desc',
            cuisine: 'Indian',
            price: 200,
            rating: 4.0,
            dietary: [],
            deliveryTime: 30,
          },
          fusedScore: 1.0,
        },
      ];

      const boosted = applyPopularityBoosts(results);
      expect(boosted[0]!.fusedScore).toBe(1.0);
    });
  });

  describe('computeTrendingScore', () => {
    it('should return 0 for zero total orders', () => {
      expect(computeTrendingScore(0, 0)).toBe(0);
    });

    it('should return higher score for more recent orders', () => {
      const score1 = computeTrendingScore(50, 100);
      const score2 = computeTrendingScore(10, 100);
      expect(score1).toBeGreaterThan(score2);
    });

    it('should decay with daysSinceLastOrder', () => {
      const recent = computeTrendingScore(50, 100, 0);
      const older = computeTrendingScore(50, 100, 10);
      expect(recent).toBeGreaterThan(older);
    });

    it('should return positive score for active items', () => {
      const score = computeTrendingScore(20, 100, 1);
      expect(score).toBeGreaterThan(0);
    });
  });
});
