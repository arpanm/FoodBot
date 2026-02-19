/**
 * Deduplicates restaurants that appear from multiple providers.
 * Uses name similarity and location proximity to detect duplicates.
 */

import type { Restaurant } from '../types/provider.types.js';
import type { GeoLocation } from '../types/common.types.js';

export interface DeduplicationConfig {
  nameSimilarityThreshold: number;
  distanceThresholdKm: number;
  preferredProviderOrder: string[];
}

const DEFAULT_CONFIG: DeduplicationConfig = {
  nameSimilarityThreshold: 0.85,
  distanceThresholdKm: 0.3,
  preferredProviderOrder: ['internal', 'swiggy', 'zomato', 'mock'],
};

export class ResultDeduplicator {
  private readonly config: DeduplicationConfig;

  constructor(config?: Partial<DeduplicationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Remove duplicate restaurants from combined results.
   * When duplicates are found, merge data from multiple sources.
   */
  deduplicate(restaurants: Restaurant[]): Restaurant[] {
    const groups: Restaurant[][] = [];

    for (const restaurant of restaurants) {
      let foundGroup = false;

      for (const group of groups) {
        const representative = group[0];
        if (representative && this.isDuplicate(representative, restaurant)) {
          group.push(restaurant);
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup) {
        groups.push([restaurant]);
      }
    }

    return groups.map((group) => this.mergeGroup(group));
  }

  /**
   * Check if two restaurants are likely the same.
   */
  isDuplicate(a: Restaurant, b: Restaurant): boolean {
    const nameSimilarity = this.calculateNameSimilarity(a.name, b.name);
    if (nameSimilarity < this.config.nameSimilarityThreshold) {
      return false;
    }

    const distance = this.calculateDistance(a.location, b.location);
    return distance <= this.config.distanceThresholdKm;
  }

  /**
   * Merge a group of duplicate restaurants into one.
   * Takes the best data from each source.
   */
  private mergeGroup(group: Restaurant[]): Restaurant {
    if (group.length === 1) {
      return group[0]!;
    }

    // Sort by provider preference
    group.sort((a, b) => {
      const aIndex = this.config.preferredProviderOrder.indexOf(a.provider);
      const bIndex = this.config.preferredProviderOrder.indexOf(b.provider);
      return aIndex - bIndex;
    });

    const primary = group[0]!;

    // Merge data: take the best from each
    let bestRating = primary.rating;
    let highestReviewCount = primary.reviewCount;
    const allCuisines = new Set(primary.cuisines);
    const allOffers = [...primary.offers];

    for (let i = 1; i < group.length; i++) {
      const other = group[i]!;

      if (other.rating > bestRating) {
        bestRating = other.rating;
      }
      if (other.reviewCount > highestReviewCount) {
        highestReviewCount = other.reviewCount;
      }
      for (const cuisine of other.cuisines) {
        allCuisines.add(cuisine);
      }
      allOffers.push(...other.offers);
    }

    return {
      ...primary,
      rating: bestRating,
      reviewCount: highestReviewCount,
      cuisines: Array.from(allCuisines),
      offers: allOffers,
    };
  }

  /**
   * Calculate name similarity using Jaccard coefficient on character bigrams.
   */
  private calculateNameSimilarity(a: string, b: string): number {
    const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (normA === normB) {
      return 1.0;
    }

    const bigramsA = this.getBigrams(normA);
    const bigramsB = this.getBigrams(normB);

    if (bigramsA.size === 0 && bigramsB.size === 0) {
      return 1.0;
    }

    let intersection = 0;
    for (const bigram of bigramsA) {
      if (bigramsB.has(bigram)) {
        intersection++;
      }
    }

    const union = bigramsA.size + bigramsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  private getBigrams(str: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  }

  private calculateDistance(from: GeoLocation, to: GeoLocation): number {
    const R = 6371;
    const dLat = this.toRad(to.lat - from.lat);
    const dLng = this.toRad(to.lng - from.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.lat)) *
        Math.cos(this.toRad(to.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
