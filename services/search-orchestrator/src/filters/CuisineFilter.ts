/**
 * Cuisine filter - filters results by cuisine type.
 */

import type { UnifiedSearchResult } from '../types/search.types';

export class CuisineFilter {
  apply(results: UnifiedSearchResult[], cuisines: string[]): UnifiedSearchResult[] {
    if (cuisines.length === 0) return results;

    const normalizedCuisines = cuisines.map((c) => c.toLowerCase());

    return results.filter((result) => {
      if (result.type === 'restaurant' && result.restaurant) {
        return result.restaurant.cuisineTypes.some((c) =>
          normalizedCuisines.includes(c.toLowerCase()),
        );
      }
      // Dishes pass through cuisine filter (they don't have cuisine types)
      return true;
    });
  }
}
