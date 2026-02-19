/**
 * Rating filter - filters results by minimum rating.
 */

import type { UnifiedSearchResult } from '../types/search.types';

export class RatingFilter {
  apply(results: UnifiedSearchResult[], minRating: number): UnifiedSearchResult[] {
    return results.filter((result) => {
      if (result.type === 'restaurant' && result.restaurant) {
        return result.restaurant.rating >= minRating;
      }

      if (result.type === 'dish' && result.dish) {
        return result.dish.rating >= minRating;
      }

      return true;
    });
  }
}
