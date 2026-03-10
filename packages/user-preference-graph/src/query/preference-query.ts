import { GraphService } from '../graph/graph-service';
import { GraphNode, GraphQueryResult, RelationshipType } from '../types/graph.types';
import {
  CategoryPreference,
  DishPreference,
  RestaurantPreference,
  TimePattern,
} from '../types/recommendation.types';

export class PreferenceQuery {
  constructor(private readonly graph: GraphService) {}

  getTopCategories(userId: string, limit: number = 5): CategoryPreference[] {
    const result = this.queryUserNeighbors(userId, RelationshipType.LIKES_CATEGORY);
    const nodeMap = this.buildNodeMap(result);

    const preferences: CategoryPreference[] = [];
    for (const rel of result.relationships) {
      const node = nodeMap.get(rel.targetId);
      if (!node) {
        continue;
      }
      preferences.push({
        categoryId: (node.properties['categoryId'] as string) ?? node.id,
        categoryName: (node.properties['name'] as string) ?? 'Unknown',
        weight: (rel.properties['weight'] as number) ?? 0,
      });
    }

    return preferences.sort((a, b) => b.weight - a.weight).slice(0, limit);
  }

  getTopDishes(userId: string, limit: number = 5): DishPreference[] {
    const result = this.queryUserNeighbors(userId, RelationshipType.FAVORITE_DISH);
    const nodeMap = this.buildNodeMap(result);

    const preferences: DishPreference[] = [];
    for (const rel of result.relationships) {
      const node = nodeMap.get(rel.targetId);
      if (!node) {
        continue;
      }
      preferences.push({
        dishId: (node.properties['dishId'] as string) ?? node.id,
        dishName: (node.properties['name'] as string) ?? 'Unknown',
        restaurantName: this.getRestaurantName(node.properties['restaurantId'] as string),
        weight: (rel.properties['weight'] as number) ?? 0,
      });
    }

    return preferences.sort((a, b) => b.weight - a.weight).slice(0, limit);
  }

  getTopRestaurants(userId: string, limit: number = 5): RestaurantPreference[] {
    const result = this.queryUserNeighbors(userId, RelationshipType.FREQUENTS);
    const nodeMap = this.buildNodeMap(result);

    const preferences: RestaurantPreference[] = [];
    for (const rel of result.relationships) {
      const node = nodeMap.get(rel.targetId);
      if (!node) {
        continue;
      }
      preferences.push({
        restaurantId: (node.properties['restaurantId'] as string) ?? node.id,
        restaurantName: (node.properties['name'] as string) ?? 'Unknown',
        weight: (rel.properties['weight'] as number) ?? 0,
        cuisine: (node.properties['cuisine'] as string) ?? 'Unknown',
      });
    }

    return preferences.sort((a, b) => b.weight - a.weight).slice(0, limit);
  }

  getTimePatterns(userId: string): TimePattern[] {
    const dayPatterns = this.getDayPatterns(userId);
    const timePatterns = this.getTimeSlotPatterns(userId);
    return this.mergePatterns(dayPatterns, timePatterns);
  }

  getTopDishesAtRestaurant(
    userId: string,
    restaurantId: string,
    limit: number = 5
  ): DishPreference[] {
    const allDishes = this.getTopDishes(userId, 50);
    return allDishes
      .filter((d) => {
        const dishNode = this.graph.getNode(`dish-${d.dishId}`);
        return dishNode?.properties['restaurantId'] === restaurantId;
      })
      .slice(0, limit);
  }

  private queryUserNeighbors(
    userId: string,
    relationshipType: RelationshipType
  ): GraphQueryResult {
    return this.graph.queryNeighbors({
      nodeId: `user-${userId}`,
      relationshipType,
      direction: 'outgoing',
    });
  }

  private buildNodeMap(result: GraphQueryResult): Map<string, GraphNode> {
    const map = new Map<string, GraphNode>();
    for (const node of result.nodes) {
      map.set(node.id, node);
    }
    return map;
  }

  private getRestaurantName(restaurantId: string | null): string {
    if (!restaurantId) {
      return 'Unknown';
    }
    const node = this.graph.getNode(`restaurant-${restaurantId}`);
    return (node?.properties['name'] as string) ?? 'Unknown';
  }

  private getDayPatterns(userId: string): Map<string, number> {
    const result = this.queryUserNeighbors(userId, RelationshipType.ORDERS_ON);
    const nodeMap = this.buildNodeMap(result);
    const patterns = new Map<string, number>();

    for (const rel of result.relationships) {
      const node = nodeMap.get(rel.targetId);
      if (!node) {
        continue;
      }
      const day = node.properties['day'] as string;
      const count = (rel.properties['count'] as number) ?? 1;
      patterns.set(day, count);
    }
    return patterns;
  }

  private getTimeSlotPatterns(userId: string): Map<string, number> {
    const result = this.queryUserNeighbors(userId, RelationshipType.ORDERS_AT);
    const nodeMap = this.buildNodeMap(result);
    const patterns = new Map<string, number>();

    for (const rel of result.relationships) {
      const node = nodeMap.get(rel.targetId);
      if (!node) {
        continue;
      }
      const slot = node.properties['slot'] as string;
      const count = (rel.properties['count'] as number) ?? 1;
      patterns.set(slot, count);
    }
    return patterns;
  }

  private mergePatterns(
    dayPatterns: Map<string, number>,
    timePatterns: Map<string, number>
  ): TimePattern[] {
    const results: TimePattern[] = [];
    const topCategories = this.getTopCategoriesForContext();

    for (const [day, dayFreq] of dayPatterns) {
      for (const [slot, slotFreq] of timePatterns) {
        results.push({
          dayOfWeek: day,
          timeSlot: slot,
          frequency: dayFreq + slotFreq,
          topCategory: topCategories,
        });
      }
    }

    return results.sort((a, b) => b.frequency - a.frequency);
  }

  private getTopCategoriesForContext(): string {
    const categories = this.graph.getAllRelationships()
      .filter((r) => r.type === RelationshipType.LIKES_CATEGORY)
      .sort((a, b) =>
        ((b.properties['weight'] as number) ?? 0) - ((a.properties['weight'] as number) ?? 0)
      );

    if (categories.length === 0) {
      return 'General';
    }
    const topRel = categories[0];
    const node = topRel ? this.graph.getNode(topRel.targetId) : undefined;
    return (node?.properties['name'] as string) ?? 'General';
  }
}
