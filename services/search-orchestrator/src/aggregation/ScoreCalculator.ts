/**
 * Score calculator for computing final relevance scores.
 * Combines source relevance with business-rule boosts and penalties.
 */

import pino from 'pino';

import type { UnifiedSearchResult, GeoLocation } from '../types/search.types';
import type {
  ScoreComponents,
  ScoringConfig,
  RankingContext,
  UserPreferences,
} from '../types/result.types';

export class ScoreCalculator {
  private readonly logger: pino.Logger;
  private readonly config: ScoringConfig;

  constructor(config: ScoringConfig, logger: pino.Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'ScoreCalculator' });
  }

  /**
   * Calculates the final score for a search result.
   * Combines relevance, rating, proximity, availability, and preference boosts.
   */
  calculateScore(
    result: UnifiedSearchResult,
    context: RankingContext,
  ): ScoreComponents {
    const relevanceScore = this.normalizeScore(result.score);
    const ratingBoost = this.calculateRatingBoost(result);
    const proximityBoost = this.calculateProximityBoost(result, context.userLocation);
    const availabilityBoost = this.calculateAvailabilityBoost(result);
    const deliveryTimePenalty = this.calculateDeliveryTimePenalty(result);
    const userPreferenceBoost = this.calculateUserPreferenceBoost(result, context.userPreferences);
    const popularityBoost = this.calculatePopularityBoost(result);

    const { weights } = this.config;

    const finalScore =
      relevanceScore * weights.relevance +
      ratingBoost * weights.rating +
      proximityBoost * weights.proximity +
      availabilityBoost * weights.availability +
      deliveryTimePenalty * weights.deliveryTime +
      userPreferenceBoost * weights.userPreference +
      popularityBoost * weights.popularity;

    return {
      relevanceScore,
      ratingBoost,
      proximityBoost,
      availabilityBoost,
      deliveryTimePenalty,
      userPreferenceBoost,
      popularityBoost,
      finalScore: Math.max(0, Math.min(1, finalScore)),
    };
  }

  private normalizeScore(score: number): number {
    // Normalize source relevance score to 0-1 range
    if (score <= 0) return 0;
    if (score >= 1) return 1;
    return score;
  }

  private calculateRatingBoost(result: UnifiedSearchResult): number {
    const rating = this.getResultRating(result);

    if (rating >= 4.5) {
      return this.config.boosts.highRating;
    }

    if (rating >= 4.0) {
      return 1.0;
    }

    if (rating >= 3.0) {
      return 0.8;
    }

    if (rating > 0) {
      return this.config.penalties.lowRating;
    }

    return 0.5;
  }

  private calculateProximityBoost(
    result: UnifiedSearchResult,
    userLocation?: GeoLocation,
  ): number {
    if (!userLocation) {
      return 0.5;
    }

    const resultLocation = this.getResultLocation(result);
    if (!resultLocation) {
      return 0.5;
    }

    const distanceKm = this.haversineDistance(
      userLocation.lat,
      userLocation.lon,
      resultLocation.lat,
      resultLocation.lon,
    );

    if (distanceKm <= 2) {
      return this.config.boosts.nearbyDistance;
    }

    if (distanceKm <= 5) {
      return 1.0;
    }

    if (distanceKm <= 10) {
      return 0.7;
    }

    return this.config.penalties.farDistance;
  }

  private calculateAvailabilityBoost(result: UnifiedSearchResult): number {
    const isAvailable = this.getAvailability(result);

    if (isAvailable) {
      return this.config.boosts.availableNow;
    }

    return 0.3;
  }

  private calculateDeliveryTimePenalty(result: UnifiedSearchResult): number {
    const deliveryTime = this.getDeliveryTime(result);

    if (deliveryTime <= 20) {
      return 1.0;
    }

    if (deliveryTime <= 30) {
      return 0.9;
    }

    if (deliveryTime <= 45) {
      return 0.7;
    }

    return this.config.penalties.longDeliveryTime;
  }

  private calculateUserPreferenceBoost(
    result: UnifiedSearchResult,
    preferences?: UserPreferences,
  ): number {
    if (!preferences) {
      return 0.5;
    }

    let boost = 0.5;

    // Preferred cuisine boost
    if (preferences.preferredCuisines && result.type === 'restaurant' && result.restaurant) {
      const hasCuisineMatch = result.restaurant.cuisineTypes.some((cuisine) =>
        preferences.preferredCuisines!.includes(cuisine.toLowerCase()),
      );
      if (hasCuisineMatch) {
        boost = this.config.boosts.preferredCuisine;
      }
    }

    // Past order boost
    if (preferences.pastOrderRestaurantIds) {
      const restaurantId =
        result.type === 'restaurant'
          ? result.id
          : result.dish?.restaurantId;
      if (restaurantId && preferences.pastOrderRestaurantIds.includes(restaurantId)) {
        boost = Math.max(boost, 1.1);
      }
    }

    return boost;
  }

  private calculatePopularityBoost(result: UnifiedSearchResult): number {
    if (result.type === 'restaurant' && result.restaurant) {
      const reviewCount = result.restaurant.reviewCount;
      if (reviewCount >= 500) return 1.0;
      if (reviewCount >= 100) return 0.8;
      if (reviewCount >= 20) return 0.6;
      return 0.4;
    }

    if (result.type === 'dish' && result.dish) {
      return result.dish.rating >= 4.0 ? 0.8 : 0.5;
    }

    return 0.5;
  }

  private getResultRating(result: UnifiedSearchResult): number {
    if (result.type === 'restaurant' && result.restaurant) {
      return result.restaurant.rating;
    }
    if (result.type === 'dish' && result.dish) {
      return result.dish.rating;
    }
    return 0;
  }

  private getResultLocation(result: UnifiedSearchResult): GeoLocation | undefined {
    if (result.type === 'restaurant' && result.restaurant) {
      return result.restaurant.location;
    }
    return undefined;
  }

  private getAvailability(result: UnifiedSearchResult): boolean {
    if (result.type === 'restaurant' && result.restaurant) {
      return result.restaurant.isAvailable;
    }
    if (result.type === 'dish' && result.dish) {
      return result.dish.isAvailable;
    }
    return true;
  }

  private getDeliveryTime(result: UnifiedSearchResult): number {
    if (result.type === 'restaurant' && result.restaurant) {
      return result.restaurant.deliveryTime;
    }
    return 30;
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
