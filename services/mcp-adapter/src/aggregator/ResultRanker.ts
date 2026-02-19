/**
 * Ranks restaurant search results based on relevance, quality, and user preferences.
 */

import type { Restaurant, SearchQuery } from '../types/provider.types.js';

export interface RankingWeights {
  relevance: number;
  rating: number;
  reviewCount: number;
  deliveryTime: number;
  distance: number;
  availability: number;
  priceMatch: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  relevance: 0.30,
  rating: 0.25,
  reviewCount: 0.10,
  deliveryTime: 0.15,
  distance: 0.10,
  availability: 0.05,
  priceMatch: 0.05,
};

export class ResultRanker {
  private readonly weights: RankingWeights;

  constructor(weights?: Partial<RankingWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
  }

  /**
   * Rank restaurants by computed score.
   */
  rank(restaurants: Restaurant[], query: SearchQuery): Restaurant[] {
    const scored = restaurants.map((restaurant) => ({
      restaurant,
      score: this.computeScore(restaurant, query),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.restaurant);
  }

  /**
   * Compute a ranking score for a restaurant.
   */
  computeScore(restaurant: Restaurant, query: SearchQuery): number {
    let score = 0;

    // Relevance: name/cuisine match with query
    score +=
      this.weights.relevance * this.computeRelevance(restaurant, query.query);

    // Rating: normalized to 0-1
    score += this.weights.rating * (restaurant.rating / 5.0);

    // Review count: logarithmic normalization
    score +=
      this.weights.reviewCount *
      Math.min(1, Math.log10(restaurant.reviewCount + 1) / 4);

    // Delivery time: inverse (lower is better), normalized
    const maxDelivery = 60;
    score +=
      this.weights.deliveryTime *
      Math.max(0, 1 - restaurant.deliveryTimeMinutes / maxDelivery);

    // Distance: inverse (closer is better), normalized
    const maxDistance = query.radiusKm || 10;
    score +=
      this.weights.distance *
      Math.max(0, 1 - restaurant.distanceKm / maxDistance);

    // Availability: binary
    score += this.weights.availability * (restaurant.isAvailable ? 1 : 0);

    // Price match: if user specified price range
    if (query.priceRange?.length) {
      score +=
        this.weights.priceMatch *
        (query.priceRange.includes(restaurant.priceRange) ? 1 : 0);
    } else {
      score += this.weights.priceMatch * 0.5;
    }

    return score;
  }

  private computeRelevance(restaurant: Restaurant, query: string): number {
    if (!query) {
      return 0.5;
    }

    const q = query.toLowerCase();
    const name = restaurant.name.toLowerCase();
    const cuisines = restaurant.cuisines.map((c: string) => c.toLowerCase());

    // Exact name match
    if (name === q) {
      return 1.0;
    }

    // Name contains query
    if (name.includes(q)) {
      return 0.9;
    }

    // Cuisine match
    if (cuisines.some((c: string) => c.includes(q) || q.includes(c))) {
      return 0.8;
    }

    // Partial word match
    const queryWords = q.split(/\s+/);
    const nameWords = name.split(/\s+/);
    const matchCount = queryWords.filter((qw: string) =>
      nameWords.some((nw: string) => nw.includes(qw) || qw.includes(nw))
    ).length;

    if (matchCount > 0) {
      return 0.5 + (0.3 * matchCount) / queryWords.length;
    }

    return 0.1;
  }
}
