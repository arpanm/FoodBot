import {
  applyContextualBoosts,
  detectTimeOfDay,
} from '../ranking/contextual-ranker';
import type { FusedResult, SearchContext } from '../types/search.types';

function makeFusedResult(
  id: string,
  overrides: Partial<FusedResult['document']> = {}
): FusedResult {
  return {
    document: {
      id,
      name: `Item ${id}`,
      description: 'Description',
      cuisine: 'American',
      price: 200,
      rating: 4.0,
      dietary: [],
      deliveryTime: 30,
      tags: [],
      ...overrides,
    },
    fusedScore: 1.0,
  };
}

describe('ContextualRanker', () => {
  describe('detectTimeOfDay', () => {
    it('should detect morning for 6am-10am', () => {
      expect(detectTimeOfDay(6)).toBe('morning');
      expect(detectTimeOfDay(10)).toBe('morning');
    });

    it('should detect lunch for 11am-2pm', () => {
      expect(detectTimeOfDay(11)).toBe('lunch');
      expect(detectTimeOfDay(14)).toBe('lunch');
    });

    it('should detect evening for 3pm-8pm', () => {
      expect(detectTimeOfDay(15)).toBe('evening');
      expect(detectTimeOfDay(20)).toBe('evening');
    });

    it('should detect late_night for 9pm-4am', () => {
      expect(detectTimeOfDay(21)).toBe('late_night');
      expect(detectTimeOfDay(2)).toBe('late_night');
    });
  });

  describe('time-of-day boosting', () => {
    it('should boost breakfast items in the morning', () => {
      const breakfastItem = makeFusedResult('1', {
        cuisine: 'cafe',
        tags: ['breakfast'],
      });
      const dinnerItem = makeFusedResult('2', {
        cuisine: 'Indian',
        tags: ['dinner'],
      });

      const context: SearchContext = { timeOfDay: 'morning' };
      const [boosted1, boosted2] = applyContextualBoosts(
        [breakfastItem, dinnerItem],
        context
      );

      expect(boosted1!.fusedScore).toBeGreaterThan(boosted2!.fusedScore);
    });

    it('should boost lunch items during lunch hours', () => {
      const lunchItem = makeFusedResult('1', {
        cuisine: 'indian',
        tags: ['thali'],
      });
      const otherItem = makeFusedResult('2', {
        cuisine: 'bakery',
        tags: ['pastry'],
      });

      const context: SearchContext = { timeOfDay: 'lunch' };
      const boosted = applyContextualBoosts(
        [lunchItem, otherItem],
        context
      );

      expect(boosted[0]!.fusedScore).toBeGreaterThan(otherItem.fusedScore);
    });

    it('should boost late night items during late_night', () => {
      const lateNightItem = makeFusedResult('1', {
        cuisine: 'american',
        tags: ['fast food'],
      });
      const context: SearchContext = { timeOfDay: 'late_night' };
      const [boosted] = applyContextualBoosts([lateNightItem], context);
      expect(boosted!.fusedScore).toBeGreaterThan(1.0);
    });

    it('should not modify scores without context', () => {
      const item = makeFusedResult('1');
      const [result] = applyContextualBoosts([item]);
      expect(result!.fusedScore).toBe(1.0);
    });
  });

  describe('day-of-week boosting', () => {
    it('should boost weekend items on Saturday (day 6)', () => {
      const weekendItem = makeFusedResult('1', {
        tags: ['brunch', 'family'],
      });
      const context: SearchContext = { dayOfWeek: 6 };
      const [boosted] = applyContextualBoosts([weekendItem], context);
      expect(boosted!.fusedScore).toBeGreaterThan(1.0);
    });

    it('should boost weekend items on Sunday (day 0)', () => {
      const weekendItem = makeFusedResult('1', { tags: ['buffet'] });
      const context: SearchContext = { dayOfWeek: 0 };
      const [boosted] = applyContextualBoosts([weekendItem], context);
      expect(boosted!.fusedScore).toBeGreaterThan(1.0);
    });

    it('should not boost on weekdays', () => {
      const item = makeFusedResult('1', { tags: ['brunch'] });
      const context: SearchContext = { dayOfWeek: 3 };
      const [boosted] = applyContextualBoosts([item], context);
      expect(boosted!.fusedScore).toBe(1.0);
    });
  });

  describe('location proximity boosting', () => {
    it('should boost nearby restaurants', () => {
      const nearbyItem = makeFusedResult('1', {
        location: { lat: 28.6140, lng: 77.2091 },
      });
      const context: SearchContext = {
        location: { lat: 28.6139, lng: 77.2090 },
      };
      const [boosted] = applyContextualBoosts([nearbyItem], context);
      expect(boosted!.fusedScore).toBeGreaterThan(1.0);
    });

    it('should penalize distant restaurants', () => {
      const farItem = makeFusedResult('1', {
        location: { lat: 19.0760, lng: 72.8777 },
      });
      const context: SearchContext = {
        location: { lat: 28.6139, lng: 77.2090 },
      };
      const [boosted] = applyContextualBoosts([farItem], context);
      expect(boosted!.fusedScore).toBeLessThan(1.0);
    });

    it('should not modify score for items without location', () => {
      const noLocationItem = makeFusedResult('1');
      const context: SearchContext = {
        location: { lat: 28.6139, lng: 77.2090 },
      };
      const [boosted] = applyContextualBoosts([noLocationItem], context);
      expect(boosted!.fusedScore).toBe(1.0);
    });
  });
});
