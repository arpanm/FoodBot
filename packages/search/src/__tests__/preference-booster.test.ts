import {
  applyPreferenceBoosts,
  InMemoryPreferenceProvider,
} from '../ranking/preference-booster';
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
      ...overrides,
    },
    fusedScore: 1.0,
  };
}

describe('PreferenceBooster', () => {
  let provider: InMemoryPreferenceProvider;

  beforeEach(() => {
    provider = new InMemoryPreferenceProvider();
  });

  describe('applyPreferenceBoosts', () => {
    it('should boost results based on cuisine preferences', async () => {
      provider.setPreferences('user-1', {
        cuisineBoosts: new Map([['Indian', 1.5]]),
        dietaryBoosts: new Map(),
      });

      const results: FusedResult[] = [
        makeFusedResult('1', { cuisine: 'Indian' }),
        makeFusedResult('2', { cuisine: 'Italian' }),
      ];

      const boosted = await applyPreferenceBoosts(
        results,
        'user-1',
        provider
      );

      expect(boosted[0]!.fusedScore).toBeGreaterThan(boosted[1]!.fusedScore);
    });

    it('should boost results based on dietary preferences', async () => {
      provider.setPreferences('user-1', {
        cuisineBoosts: new Map(),
        dietaryBoosts: new Map([['vegetarian', 1.8]]),
      });

      const results: FusedResult[] = [
        makeFusedResult('1', { dietary: ['vegetarian'] }),
        makeFusedResult('2', { dietary: [] }),
      ];

      const boosted = await applyPreferenceBoosts(
        results,
        'user-1',
        provider
      );

      expect(boosted[0]!.fusedScore).toBeGreaterThan(boosted[1]!.fusedScore);
    });

    it('should boost high-rated items with ratingBoost', async () => {
      provider.setPreferences('user-1', {
        cuisineBoosts: new Map(),
        dietaryBoosts: new Map(),
        ratingBoost: 0.3,
      });

      const results: FusedResult[] = [
        makeFusedResult('1', { rating: 4.8 }),
        makeFusedResult('2', { rating: 3.0 }),
      ];

      const boosted = await applyPreferenceBoosts(
        results,
        'user-1',
        provider
      );

      expect(boosted[0]!.fusedScore).toBeGreaterThan(boosted[1]!.fusedScore);
    });

    it('should return unchanged results when no userId', async () => {
      const results: FusedResult[] = [makeFusedResult('1')];

      const boosted = await applyPreferenceBoosts(
        results,
        undefined,
        provider
      );

      expect(boosted[0]!.fusedScore).toBe(1.0);
    });

    it('should return unchanged results when user has no prefs', async () => {
      const results: FusedResult[] = [makeFusedResult('1')];

      const boosted = await applyPreferenceBoosts(
        results,
        'unknown-user',
        provider
      );

      expect(boosted[0]!.fusedScore).toBe(1.0);
    });

    it('should include personalizedScore in boosted results', async () => {
      provider.setPreferences('user-1', {
        cuisineBoosts: new Map([['Indian', 2.0]]),
        dietaryBoosts: new Map(),
      });

      const results: FusedResult[] = [
        makeFusedResult('1', { cuisine: 'Indian' }),
      ];

      const boosted = await applyPreferenceBoosts(
        results,
        'user-1',
        provider
      );

      expect(boosted[0]!.personalizedScore).toBeDefined();
      expect(boosted[0]!.personalizedScore).toBeGreaterThan(1.0);
    });

    it('should apply moderate rating boost for 4.0+ ratings', async () => {
      provider.setPreferences('user-1', {
        cuisineBoosts: new Map(),
        dietaryBoosts: new Map(),
        ratingBoost: 0.4,
      });

      const results: FusedResult[] = [
        makeFusedResult('1', { rating: 4.2 }),
      ];

      const boosted = await applyPreferenceBoosts(
        results,
        'user-1',
        provider
      );

      expect(boosted[0]!.fusedScore).toBeGreaterThan(1.0);
      expect(boosted[0]!.fusedScore).toBeLessThan(1.5);
    });
  });

  describe('InMemoryPreferenceProvider', () => {
    it('should return null for unknown user', async () => {
      const prefs = await provider.getPreferences('unknown');
      expect(prefs).toBeNull();
    });

    it('should store and retrieve preferences', async () => {
      provider.setPreferences('user-1', {
        cuisineBoosts: new Map([['Indian', 1.5]]),
        dietaryBoosts: new Map(),
      });

      const prefs = await provider.getPreferences('user-1');
      expect(prefs).not.toBeNull();
      expect(prefs!.cuisineBoosts.get('Indian')).toBe(1.5);
    });
  });
});
