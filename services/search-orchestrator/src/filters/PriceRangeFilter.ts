/**
 * Price range filter - filters results by price range.
 */

import type { UnifiedSearchResult, PriceRange } from '../types/search.types';

const PRICE_RANGE_MAP: Record<string, number> = {
  budget: 1,
  moderate: 2,
  expensive: 3,
  premium: 4,
};

export class PriceRangeFilter {
  apply(results: UnifiedSearchResult[], priceRange: PriceRange): UnifiedSearchResult[] {
    return results.filter((result) => {
      if (result.type === 'restaurant' && result.restaurant) {
        const priceLevel = PRICE_RANGE_MAP[result.restaurant.priceRange] ?? 2;

        if (priceRange.min !== undefined && priceLevel < priceRange.min) {
          return false;
        }
        if (priceRange.max !== undefined && priceLevel > priceRange.max) {
          return false;
        }
        return true;
      }

      if (result.type === 'dish' && result.dish) {
        const price = result.dish.discountedPrice ?? result.dish.price;

        if (priceRange.min !== undefined && price < priceRange.min) {
          return false;
        }
        if (priceRange.max !== undefined && price > priceRange.max) {
          return false;
        }
        return true;
      }

      return true;
    });
  }
}
