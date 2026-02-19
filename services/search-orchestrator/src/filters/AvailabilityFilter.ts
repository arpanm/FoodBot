/**
 * Availability filter - filters results by availability status.
 */

import type { UnifiedSearchResult } from '../types/search.types';

export class AvailabilityFilter {
  apply(results: UnifiedSearchResult[], isAvailable: boolean): UnifiedSearchResult[] {
    return results.filter((result) => {
      if (result.type === 'restaurant' && result.restaurant) {
        return result.restaurant.isAvailable === isAvailable;
      }

      if (result.type === 'dish' && result.dish) {
        return result.dish.isAvailable === isAvailable;
      }

      return true;
    });
  }
}
