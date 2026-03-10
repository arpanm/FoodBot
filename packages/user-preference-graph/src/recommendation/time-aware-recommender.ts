import { GraphService } from '../graph/graph-service';
import { RelationshipType, NodeType } from '../types/graph.types';
import { RecommendationResult, TimeContext } from '../types/recommendation.types';

export class TimeAwareRecommender {
  constructor(private readonly graph: GraphService) {}

  getRecommendations(
    userId: string,
    timeContext: TimeContext,
    limit: number = 10
  ): RecommendationResult[] {
    const dayNodeId = `day-${timeContext.dayOfWeek.toLowerCase()}`;
    const timeSlotNodeId = `timeslot-${timeContext.timeSlot}`;
    const userNodeId = `user-${userId}`;

    const dayMatch = this.hasTimeRelationship(userNodeId, dayNodeId, RelationshipType.ORDERS_ON);
    const timeMatch = this.hasTimeRelationship(
      userNodeId, timeSlotNodeId, RelationshipType.ORDERS_AT
    );

    const scored = this.scoreAllRestaurants(userNodeId, dayMatch, timeMatch);
    return this.sortAndLimit(scored, limit);
  }

  getTimeSlotFromHour(hour: number): string {
    if (hour >= 6 && hour < 11) {
      return 'breakfast';
    }
    if (hour >= 11 && hour < 15) {
      return 'lunch';
    }
    if (hour >= 15 && hour < 18) {
      return 'snack';
    }
    if (hour >= 18 && hour < 22) {
      return 'dinner';
    }
    return 'late-night';
  }

  private hasTimeRelationship(
    sourceId: string,
    targetId: string,
    type: RelationshipType
  ): boolean {
    const rels = this.graph.getRelationshipsBetween(sourceId, targetId, type);
    return rels.length > 0;
  }

  private scoreAllRestaurants(
    userNodeId: string,
    dayMatch: boolean,
    timeMatch: boolean
  ): RecommendationResult[] {
    const frequentsResult = this.graph.queryNeighbors({
      nodeId: userNodeId,
      relationshipType: RelationshipType.FREQUENTS,
      direction: 'outgoing',
    });

    const scored: RecommendationResult[] = [];

    for (const rel of frequentsResult.relationships) {
      const restaurant = frequentsResult.nodes.find(
        (n) => n.id === rel.targetId
      );
      if (!restaurant) {
        continue;
      }
      const baseWeight = (rel.properties['weight'] as number) ?? 0;
      const contextBoost = this.calculateContextBoost(dayMatch, timeMatch);
      const score = Math.min(baseWeight * contextBoost, 1.0);

      scored.push({
        id: restaurant.properties['restaurantId'] as string,
        name: restaurant.properties['name'] as string,
        type: 'restaurant',
        score,
        reason: this.buildReason(dayMatch, timeMatch),
        metadata: {
          cuisine: restaurant.properties['cuisine'] as string,
          rating: restaurant.properties['rating'] as number,
        },
      });
    }

    return scored;
  }

  private calculateContextBoost(dayMatch: boolean, timeMatch: boolean): number {
    let boost = 1.0;
    if (dayMatch) {
      boost *= 1.2;
    }
    if (timeMatch) {
      boost *= 1.3;
    }
    return boost;
  }

  private buildReason(dayMatch: boolean, timeMatch: boolean): string {
    const parts: string[] = ['Based on your order history'];
    if (dayMatch) {
      parts.push('you often order on this day');
    }
    if (timeMatch) {
      parts.push('at this time');
    }
    return parts.join(', ');
  }

  private sortAndLimit(
    results: RecommendationResult[],
    limit: number
  ): RecommendationResult[] {
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
