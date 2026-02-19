/**
 * Result Merger - combines data from multiple providers for the same restaurant.
 * Creates enriched restaurant profiles by merging complementary data.
 */

import type { RestaurantDetails, Review, MenuCategory } from '../types/provider.types.js';

export class ResultMerger {
  /**
   * Merge restaurant details from multiple providers into one enriched profile.
   * Takes the best/most complete data from each source.
   */
  mergeRestaurantDetails(
    sources: RestaurantDetails[]
  ): RestaurantDetails | null {
    if (sources.length === 0) {
      return null;
    }

    if (sources.length === 1) {
      return sources[0]!;
    }

    const primary = sources[0]!;

    const merged: RestaurantDetails = {
      ...primary,
      description: this.pickBestString(sources.map((s) => s.description)),
      phone: this.pickBestString(sources.map((s) => s.phone)),
      email: this.pickBestString(sources.map((s) => s.email)),
      website: this.pickBestString(sources.map((s) => s.website)),
      rating: this.pickBestRating(sources),
      reviewCount: this.pickHighestReviewCount(sources),
      cuisines: this.mergeCuisines(sources),
      photos: this.mergePhotos(sources),
      reviews: this.mergeReviews(sources),
      menuCategories: this.pickBestMenu(sources),
      offers: this.mergeOffers(sources),
    };

    return merged;
  }

  private pickBestString(values: string[]): string {
    return values.find((v) => v && v.trim().length > 0) ?? '';
  }

  private pickBestRating(sources: RestaurantDetails[]): number {
    const ratings = sources
      .map((s) => s.rating)
      .filter((r) => r > 0);

    if (ratings.length === 0) {
      return 0;
    }

    // Use weighted average (more reviews = more weight)
    let weightedSum = 0;
    let totalWeight = 0;

    for (const source of sources) {
      if (source.rating > 0) {
        const weight = Math.log10(source.reviewCount + 1) + 1;
        weightedSum += source.rating * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0
      ? Math.round((weightedSum / totalWeight) * 10) / 10
      : 0;
  }

  private pickHighestReviewCount(sources: RestaurantDetails[]): number {
    return Math.max(...sources.map((s) => s.reviewCount));
  }

  private mergeCuisines(sources: RestaurantDetails[]): string[] {
    const cuisineSet = new Set<string>();
    for (const source of sources) {
      for (const cuisine of source.cuisines) {
        cuisineSet.add(cuisine);
      }
    }
    return Array.from(cuisineSet);
  }

  private mergePhotos(sources: RestaurantDetails[]): string[] {
    const photoSet = new Set<string>();
    for (const source of sources) {
      for (const photo of source.photos) {
        if (photo) {
          photoSet.add(photo);
        }
      }
    }
    return Array.from(photoSet);
  }

  private mergeReviews(sources: RestaurantDetails[]): Review[] {
    const allReviews: Review[] = [];
    const seenIds = new Set<string>();

    for (const source of sources) {
      for (const review of source.reviews) {
        if (!seenIds.has(review.id)) {
          seenIds.add(review.id);
          allReviews.push(review);
        }
      }
    }

    // Sort by date (newest first)
    allReviews.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return allReviews.slice(0, 50);
  }

  private pickBestMenu(sources: RestaurantDetails[]): MenuCategory[] {
    // Pick the menu with the most categories/dishes
    let bestMenu: MenuCategory[] = [];
    let bestDishCount = 0;

    for (const source of sources) {
      const dishCount = source.menuCategories.reduce(
        (sum: number, cat: MenuCategory) => sum + cat.dishes.length,
        0
      );
      if (dishCount > bestDishCount) {
        bestDishCount = dishCount;
        bestMenu = source.menuCategories;
      }
    }

    return bestMenu;
  }

  private mergeOffers(
    sources: RestaurantDetails[]
  ): RestaurantDetails['offers'] {
    const allOffers = sources.flatMap((s) => s.offers);
    const seenIds = new Set<string>();
    return allOffers.filter((offer) => {
      if (seenIds.has(offer.id)) {
        return false;
      }
      seenIds.add(offer.id);
      return true;
    });
  }
}
