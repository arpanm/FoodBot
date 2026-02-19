/**
 * Location filter - filters results by geographic proximity.
 */

import type { UnifiedSearchResult, GeoLocation } from '../types/search.types';

export class LocationFilter {
  apply(
    results: UnifiedSearchResult[],
    userLocation: GeoLocation,
    radiusKm: number,
  ): UnifiedSearchResult[] {
    return results.filter((result) => {
      if (result.type === 'restaurant' && result.restaurant?.location) {
        const distance = this.haversineDistance(
          userLocation.lat,
          userLocation.lon,
          result.restaurant.location.lat,
          result.restaurant.location.lon,
        );
        return distance <= radiusKm;
      }

      // Dishes without location data pass through
      return true;
    });
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
