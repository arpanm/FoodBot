/**
 * Deduplicator for merging duplicate results from multiple sources.
 * Uses restaurant ID, name similarity, and location proximity to detect duplicates.
 */

import pino from 'pino';

import type { UnifiedSearchResult, RestaurantResult } from '../types/search.types';
import type { DeduplicationResult } from '../types/result.types';

export class Deduplicator {
  private readonly logger: pino.Logger;

  private static readonly NAME_SIMILARITY_THRESHOLD = 0.85;

  constructor(logger: pino.Logger) {
    this.logger = logger.child({ component: 'Deduplicator' });
  }

  /**
   * Removes duplicate results across sources.
   * When duplicates are found, merges the data to create the richest record.
   */
  deduplicate(results: UnifiedSearchResult[]): DeduplicationResult {
    const uniqueMap = new Map<string, UnifiedSearchResult>();
    let duplicateCount = 0;
    let mergedCount = 0;

    for (const result of results) {
      const existingKey = this.findDuplicateKey(result, uniqueMap);

      if (existingKey) {
        const existing = uniqueMap.get(existingKey)!;
        const merged = this.mergeResults(existing, result);
        uniqueMap.set(existingKey, merged);
        duplicateCount++;
        mergedCount++;
      } else {
        const key = this.generateKey(result);
        uniqueMap.set(key, result);
      }
    }

    this.logger.debug(
      { inputCount: results.length, uniqueCount: uniqueMap.size, duplicateCount, mergedCount },
      'Deduplication completed',
    );

    return {
      unique: Array.from(uniqueMap.values()),
      duplicateCount,
      mergedCount,
    };
  }

  private findDuplicateKey(
    result: UnifiedSearchResult,
    existingMap: Map<string, UnifiedSearchResult>,
  ): string | undefined {
    for (const [key, existing] of existingMap) {
      if (this.isDuplicate(existing, result)) {
        return key;
      }
    }
    return undefined;
  }

  private isDuplicate(
    existing: UnifiedSearchResult,
    candidate: UnifiedSearchResult,
  ): boolean {
    // Same type required
    if (existing.type !== candidate.type) {
      return false;
    }

    // Exact ID match (highest confidence)
    if (existing.id === candidate.id) {
      return true;
    }

    // Name similarity check
    const nameSimilarity = this.calculateNameSimilarity(
      existing.name.toLowerCase(),
      candidate.name.toLowerCase(),
    );

    if (nameSimilarity >= Deduplicator.NAME_SIMILARITY_THRESHOLD) {
      // For restaurants, also check location proximity
      if (existing.type === 'restaurant' && candidate.type === 'restaurant') {
        return this.isLocationNearby(existing.restaurant, candidate.restaurant);
      }

      // For dishes, check restaurant ID
      if (existing.type === 'dish' && candidate.type === 'dish') {
        return existing.dish?.restaurantId === candidate.dish?.restaurantId;
      }

      return true;
    }

    return false;
  }

  private isLocationNearby(
    a?: RestaurantResult,
    b?: RestaurantResult,
  ): boolean {
    if (!a?.location || !b?.location) {
      // If no location data, fall back to name match alone
      return true;
    }

    const distanceKm = this.haversineDistance(
      a.location.lat,
      a.location.lon,
      b.location.lat,
      b.location.lon,
    );

    // Within 500 meters is considered the same restaurant
    return distanceKm < 0.5;
  }

  /**
   * Merges two results, keeping the richest data from both.
   * The result with the higher score takes precedence for conflicting fields.
   */
  private mergeResults(
    existing: UnifiedSearchResult,
    incoming: UnifiedSearchResult,
  ): UnifiedSearchResult {
    const primary = existing.score >= incoming.score ? existing : incoming;
    const secondary = existing.score >= incoming.score ? incoming : existing;

    const merged: UnifiedSearchResult = {
      ...primary,
      score: Math.max(existing.score, incoming.score),
      source: `${primary.source}+${secondary.source}`,
    };

    if (merged.type === 'restaurant' && primary.restaurant && secondary.restaurant) {
      merged.restaurant = this.mergeRestaurants(primary.restaurant, secondary.restaurant);
    }

    if (merged.type === 'dish' && primary.dish && secondary.dish) {
      merged.dish = this.mergeDishes(primary.dish, secondary.dish);
    }

    return merged;
  }

  private mergeRestaurants(
    primary: RestaurantResult,
    secondary: RestaurantResult,
  ): RestaurantResult {
    return {
      ...primary,
      cuisineTypes: this.mergeArrays(primary.cuisineTypes, secondary.cuisineTypes),
      tags: this.mergeArrays(primary.tags, secondary.tags),
      features: this.mergeArrays(primary.features, secondary.features),
      reviewCount: Math.max(primary.reviewCount, secondary.reviewCount),
      rating: Math.max(primary.rating, secondary.rating),
      imageUrl: primary.imageUrl ?? secondary.imageUrl,
      location: primary.location ?? secondary.location,
    };
  }

  private mergeDishes(
    primary: import('../types/search.types').DishResult,
    secondary: import('../types/search.types').DishResult,
  ): import('../types/search.types').DishResult {
    return {
      ...primary,
      ingredients: this.mergeArrays(primary.ingredients, secondary.ingredients),
      dietaryTags: this.mergeArrays(primary.dietaryTags, secondary.dietaryTags),
      imageUrl: primary.imageUrl ?? secondary.imageUrl,
      restaurantName: primary.restaurantName ?? secondary.restaurantName,
    };
  }

  private mergeArrays(a: string[], b: string[]): string[] {
    const set = new Set([...a, ...b]);
    return Array.from(set);
  }

  private generateKey(result: UnifiedSearchResult): string {
    return `${result.type}:${result.id}:${result.source}`;
  }

  /**
   * Calculates string similarity using Levenshtein distance.
   */
  calculateNameSimilarity(a: string, b: string): number {
    if (a === b) return 1.0;
    if (a.length === 0 || b.length === 0) return 0.0;

    const maxLen = Math.max(a.length, b.length);
    const distance = this.levenshteinDistance(a, b);

    return 1.0 - distance / maxLen;
  }

  private levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= b.length; j++) {
      matrix[0]![j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j - 1]! + cost,
        );
      }
    }

    return matrix[a.length]![b.length]!;
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
