import { GraphService } from '../graph/graph-service';
import { NodeType, RelationshipType } from '../types/graph.types';
import {
  RecommendationResult,
  LocationContext,
} from '../types/recommendation.types';
import { haversineDistance } from '../graph/in-memory-graph';

export class LocationAwareRecommender {
  constructor(private readonly graph: GraphService) {}

  getRecommendations(
    userId: string,
    location: LocationContext,
    limit: number = 10
  ): RecommendationResult[] {
    const nearbyRestaurants = this.graph.queryByGeoDistance({
      latitude: location.latitude,
      longitude: location.longitude,
      radiusKm: location.radiusKm,
      nodeLabel: NodeType.RESTAURANT,
    });

    const scored = this.scoreRestaurants(userId, nearbyRestaurants, location);
    return this.sortAndLimit(scored, limit);
  }

  private scoreRestaurants(
    userId: string,
    restaurants: { id: string; properties: Record<string, string | number | boolean | null> }[],
    location: LocationContext
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];
    const userNodeId = `user-${userId}`;

    for (const restaurant of restaurants) {
      const score = this.computeRestaurantScore(userNodeId, restaurant, location);
      results.push(this.buildResult(restaurant, score, location));
    }

    return results;
  }

  private computeRestaurantScore(
    userNodeId: string,
    restaurant: { id: string; properties: Record<string, string | number | boolean | null> },
    location: LocationContext
  ): number {
    const preferenceWeight = this.getPreferenceWeight(userNodeId, restaurant.id);
    const distance = this.getDistance(restaurant, location);
    const distanceFactor = this.calculateDistanceFactor(distance, location.radiusKm);
    return preferenceWeight * distanceFactor;
  }

  private getPreferenceWeight(userNodeId: string, restaurantNodeId: string): number {
    const rels = this.graph.getRelationshipsBetween(
      userNodeId,
      restaurantNodeId,
      RelationshipType.FREQUENTS
    );
    if (rels.length === 0) {
      return 0.1;
    }
    const rel = rels[0];
    return (rel?.properties['weight'] as number) ?? 0.1;
  }

  private getDistance(
    restaurant: { properties: Record<string, string | number | boolean | null> },
    location: LocationContext
  ): number {
    const lat = restaurant.properties['latitude'] as number;
    const lon = restaurant.properties['longitude'] as number;
    return haversineDistance(location.latitude, location.longitude, lat, lon);
  }

  private calculateDistanceFactor(distance: number, radiusKm: number): number {
    if (distance <= 0) {
      return 1.0;
    }
    return 1 / (1 + distance / radiusKm);
  }

  private buildResult(
    restaurant: { id: string; properties: Record<string, string | number | boolean | null> },
    score: number,
    location: LocationContext
  ): RecommendationResult {
    const lat = restaurant.properties['latitude'] as number;
    const lon = restaurant.properties['longitude'] as number;
    const distance = haversineDistance(location.latitude, location.longitude, lat, lon);

    return {
      id: restaurant.properties['restaurantId'] as string,
      name: restaurant.properties['name'] as string,
      type: 'restaurant',
      score,
      reason: `${distance.toFixed(1)}km away, matches your preferences`,
      metadata: {
        cuisine: restaurant.properties['cuisine'] as string,
        rating: restaurant.properties['rating'] as number,
        distanceKm: Math.round(distance * 10) / 10,
      },
    };
  }

  private sortAndLimit(
    results: RecommendationResult[],
    limit: number
  ): RecommendationResult[] {
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
