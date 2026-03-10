import { AbTestRouter } from '../ranking/ab-test-router';
import type { Experiment } from '../ranking/ab-test-router';

describe('AbTestRouter', () => {
  let router: AbTestRouter;

  const experiment: Experiment = {
    id: 'exp-1',
    name: 'Search Ranking V2',
    active: true,
    variants: [
      {
        id: 'control',
        name: 'Control',
        weight: 50,
        config: { algorithm: 'bm25' },
      },
      {
        id: 'treatment',
        name: 'Treatment',
        weight: 50,
        config: { algorithm: 'hybrid' },
      },
    ],
  };

  beforeEach(() => {
    router = new AbTestRouter();
    router.registerExperiment(experiment);
  });

  describe('registerExperiment', () => {
    it('should register an experiment', () => {
      const exp = router.getExperiment('exp-1');
      expect(exp).toBeDefined();
      expect(exp!.name).toBe('Search Ranking V2');
    });

    it('should return undefined for unknown experiment', () => {
      expect(router.getExperiment('unknown')).toBeUndefined();
    });
  });

  describe('assignVariant', () => {
    it('should assign a variant to a user', () => {
      const assignment = router.assignVariant('user-1', 'exp-1');
      expect(assignment).not.toBeNull();
      expect(assignment!.experimentId).toBe('exp-1');
      expect(['control', 'treatment']).toContain(assignment!.variantId);
    });

    it('should consistently assign same variant to same user', () => {
      const a1 = router.assignVariant('user-1', 'exp-1');
      const a2 = router.assignVariant('user-1', 'exp-1');
      expect(a1!.variantId).toBe(a2!.variantId);
    });

    it('should return null for inactive experiment', () => {
      router.registerExperiment({
        id: 'exp-inactive',
        name: 'Inactive',
        active: false,
        variants: experiment.variants,
      });

      const assignment = router.assignVariant('user-1', 'exp-inactive');
      expect(assignment).toBeNull();
    });

    it('should return null for unknown experiment', () => {
      const assignment = router.assignVariant('user-1', 'unknown');
      expect(assignment).toBeNull();
    });

    it('should return null for experiment with no variants', () => {
      router.registerExperiment({
        id: 'exp-empty',
        name: 'Empty',
        active: true,
        variants: [],
      });

      const assignment = router.assignVariant('user-1', 'exp-empty');
      expect(assignment).toBeNull();
    });

    it('should include variant config in assignment', () => {
      const assignment = router.assignVariant('user-1', 'exp-1');
      expect(assignment!.config).toBeDefined();
      expect(typeof assignment!.config).toBe('object');
    });

    it('should include variant name in assignment', () => {
      const assignment = router.assignVariant('user-1', 'exp-1');
      expect(['Control', 'Treatment']).toContain(assignment!.variantName);
    });
  });

  describe('impressions tracking', () => {
    it('should track impressions per variant', () => {
      router.assignVariant('user-1', 'exp-1');
      router.assignVariant('user-2', 'exp-1');
      router.assignVariant('user-3', 'exp-1');

      const impressions = router.getImpressions('exp-1');
      let total = 0;
      for (const count of impressions.values()) {
        total += count;
      }
      expect(total).toBe(3);
    });

    it('should return empty map for unknown experiment', () => {
      const impressions = router.getImpressions('unknown');
      expect(impressions.size).toBe(0);
    });
  });

  describe('multiple experiments', () => {
    it('should support multiple concurrent experiments', () => {
      router.registerExperiment({
        id: 'exp-2',
        name: 'UI Test',
        active: true,
        variants: [
          { id: 'v-a', name: 'A', weight: 50, config: {} },
          { id: 'v-b', name: 'B', weight: 50, config: {} },
        ],
      });

      const a1 = router.assignVariant('user-1', 'exp-1');
      const a2 = router.assignVariant('user-1', 'exp-2');

      expect(a1).not.toBeNull();
      expect(a2).not.toBeNull();
      expect(a1!.experimentId).toBe('exp-1');
      expect(a2!.experimentId).toBe('exp-2');
    });
  });

  describe('distribution', () => {
    it('should distribute users across variants', () => {
      const counts = new Map<string, number>();

      for (let i = 0; i < 100; i++) {
        const assignment = router.assignVariant(`user-${i}`, 'exp-1');
        if (assignment) {
          const current = counts.get(assignment.variantId) ?? 0;
          counts.set(assignment.variantId, current + 1);
        }
      }

      expect(counts.get('control')).toBeGreaterThan(0);
      expect(counts.get('treatment')).toBeGreaterThan(0);
    });
  });
});
