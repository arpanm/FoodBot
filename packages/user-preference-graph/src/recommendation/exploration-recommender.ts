import { GraphService } from '../graph/graph-service';
import { NodeType, RelationshipType } from '../types/graph.types';
import { RecommendationResult } from '../types/recommendation.types';

export class ExplorationRecommender {
  constructor(private readonly graph: GraphService) {}

  suggestNewCategories(userId: string, limit: number = 5): RecommendationResult[] {
    const triedCategories = this.getUserCategoryIds(userId);
    const allCategories = this.graph.getNodesByLabel(NodeType.CATEGORY);
    const popularityScores = this.computeCategoryPopularity();

    const suggestions: RecommendationResult[] = [];

    for (const category of allCategories) {
      if (triedCategories.has(category.id)) {
        continue;
      }
      const popularity = popularityScores.get(category.id) ?? 0;
      if (popularity === 0) {
        continue;
      }
      suggestions.push(this.buildCategoryResult(category, popularity));
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  suggestNewRestaurants(userId: string, limit: number = 5): RecommendationResult[] {
    const visitedRestaurants = this.getUserRestaurantIds(userId);
    const allRestaurants = this.graph.getNodesByLabel(NodeType.RESTAURANT);
    const popularityScores = this.computeRestaurantPopularity();

    const suggestions: RecommendationResult[] = [];

    for (const restaurant of allRestaurants) {
      if (visitedRestaurants.has(restaurant.id)) {
        continue;
      }
      const popularity = popularityScores.get(restaurant.id) ?? 0;
      if (popularity === 0) {
        continue;
      }
      suggestions.push(this.buildRestaurantResult(restaurant, popularity));
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private getUserCategoryIds(userId: string): Set<string> {
    const result = this.graph.queryNeighbors({
      nodeId: `user-${userId}`,
      relationshipType: RelationshipType.LIKES_CATEGORY,
      direction: 'outgoing',
    });
    return new Set(result.nodes.map((n) => n.id));
  }

  private getUserRestaurantIds(userId: string): Set<string> {
    const result = this.graph.queryNeighbors({
      nodeId: `user-${userId}`,
      relationshipType: RelationshipType.FREQUENTS,
      direction: 'outgoing',
    });
    return new Set(result.nodes.map((n) => n.id));
  }

  private computeCategoryPopularity(): Map<string, number> {
    const counts = new Map<string, number>();
    const relationships = this.graph.getAllRelationships();

    for (const rel of relationships) {
      if (rel.type === RelationshipType.LIKES_CATEGORY) {
        const current = counts.get(rel.targetId) ?? 0;
        counts.set(rel.targetId, current + 1);
      }
    }

    return this.normalizeScores(counts);
  }

  private computeRestaurantPopularity(): Map<string, number> {
    const counts = new Map<string, number>();
    const relationships = this.graph.getAllRelationships();

    for (const rel of relationships) {
      if (rel.type === RelationshipType.FREQUENTS) {
        const current = counts.get(rel.targetId) ?? 0;
        counts.set(rel.targetId, current + 1);
      }
    }

    return this.normalizeScores(counts);
  }

  private normalizeScores(counts: Map<string, number>): Map<string, number> {
    let maxCount = 0;
    for (const count of counts.values()) {
      if (count > maxCount) {
        maxCount = count;
      }
    }
    if (maxCount === 0) {
      return counts;
    }
    const normalized = new Map<string, number>();
    for (const [key, count] of counts) {
      normalized.set(key, count / maxCount);
    }
    return normalized;
  }

  private buildCategoryResult(
    category: { id: string; properties: Record<string, string | number | boolean | null> },
    popularity: number
  ): RecommendationResult {
    return {
      id: (category.properties['categoryId'] as string) ?? category.id,
      name: (category.properties['name'] as string) ?? 'Unknown',
      type: 'category',
      score: popularity,
      reason: 'Popular category you haven\'t tried yet',
      metadata: { popularityScore: popularity },
    };
  }

  private buildRestaurantResult(
    restaurant: { id: string; properties: Record<string, string | number | boolean | null> },
    popularity: number
  ): RecommendationResult {
    return {
      id: (restaurant.properties['restaurantId'] as string) ?? restaurant.id,
      name: (restaurant.properties['name'] as string) ?? 'Unknown',
      type: 'restaurant',
      score: popularity,
      reason: 'Popular restaurant you haven\'t visited yet',
      metadata: {
        cuisine: restaurant.properties['cuisine'] as string,
        rating: restaurant.properties['rating'] as number,
        popularityScore: popularity,
      },
    };
  }
}
