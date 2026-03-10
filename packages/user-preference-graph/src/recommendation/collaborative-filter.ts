import { GraphService } from '../graph/graph-service';
import { NodeType, RelationshipType } from '../types/graph.types';
import {
  RecommendationResult,
  SimilarUser,
} from '../types/recommendation.types';

export class CollaborativeFilter {
  constructor(private readonly graph: GraphService) {}

  findSimilarUsers(userId: string, limit: number = 10): SimilarUser[] {
    const userCategories = this.getUserCategories(userId);
    if (userCategories.size === 0) {
      return [];
    }

    const allUsers = this.graph.getNodesByLabel(NodeType.USER);
    const similarities: SimilarUser[] = [];

    for (const userNode of allUsers) {
      const otherUserId = userNode.properties['userId'] as string;
      if (otherUserId === userId) {
        continue;
      }
      const similarity = this.computeSimilarity(userCategories, otherUserId);
      if (similarity.similarityScore > 0) {
        similarities.push(similarity);
      }
    }

    return similarities
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
  }

  getCollaborativeRecommendations(
    userId: string,
    limit: number = 10
  ): RecommendationResult[] {
    const similarUsers = this.findSimilarUsers(userId, 5);
    if (similarUsers.length === 0) {
      return [];
    }

    const userDishes = this.getUserDishes(userId);
    const candidates = this.collectCandidateDishes(similarUsers, userDishes);
    return this.sortAndLimit(candidates, limit);
  }

  private getUserCategories(userId: string): Set<string> {
    const userNodeId = `user-${userId}`;
    const result = this.graph.queryNeighbors({
      nodeId: userNodeId,
      relationshipType: RelationshipType.LIKES_CATEGORY,
      direction: 'outgoing',
    });

    const categories = new Set<string>();
    for (const node of result.nodes) {
      categories.add(node.id);
    }
    return categories;
  }

  private getUserDishes(userId: string): Set<string> {
    const userNodeId = `user-${userId}`;
    const result = this.graph.queryNeighbors({
      nodeId: userNodeId,
      relationshipType: RelationshipType.FAVORITE_DISH,
      direction: 'outgoing',
    });

    const dishes = new Set<string>();
    for (const node of result.nodes) {
      dishes.add(node.id);
    }
    return dishes;
  }

  private computeSimilarity(
    userCategories: Set<string>,
    otherUserId: string
  ): SimilarUser {
    const otherCategories = this.getUserCategories(otherUserId);
    const intersection = new Set<string>();
    const union = new Set<string>(userCategories);

    for (const cat of otherCategories) {
      union.add(cat);
      if (userCategories.has(cat)) {
        intersection.add(cat);
      }
    }

    const jaccardScore = union.size > 0 ? intersection.size / union.size : 0;

    return {
      userId: otherUserId,
      similarityScore: jaccardScore,
      sharedCategories: Array.from(intersection),
    };
  }

  private collectCandidateDishes(
    similarUsers: SimilarUser[],
    userDishes: Set<string>
  ): RecommendationResult[] {
    const candidateScores = new Map<string, { score: number; name: string; restaurant: string }>();

    for (const similarUser of similarUsers) {
      this.addDishesFromUser(similarUser, userDishes, candidateScores);
    }

    return this.mapToResults(candidateScores);
  }

  private addDishesFromUser(
    similarUser: SimilarUser,
    userDishes: Set<string>,
    candidateScores: Map<string, { score: number; name: string; restaurant: string }>
  ): void {
    const otherUserNodeId = `user-${similarUser.userId}`;
    const dishResult = this.graph.queryNeighbors({
      nodeId: otherUserNodeId,
      relationshipType: RelationshipType.FAVORITE_DISH,
      direction: 'outgoing',
    });

    for (const dishNode of dishResult.nodes) {
      if (userDishes.has(dishNode.id)) {
        continue;
      }
      const dishId = dishNode.id;
      const existing = candidateScores.get(dishId);
      const addedScore = similarUser.similarityScore;
      candidateScores.set(dishId, {
        score: (existing?.score ?? 0) + addedScore,
        name: dishNode.properties['name'] as string,
        restaurant: dishNode.properties['restaurantId'] as string,
      });
    }
  }

  private mapToResults(
    candidateScores: Map<string, { score: number; name: string; restaurant: string }>
  ): RecommendationResult[] {
    const results: RecommendationResult[] = [];
    for (const [dishId, data] of candidateScores) {
      results.push({
        id: dishId.replace('dish-', ''),
        name: data.name,
        type: 'dish',
        score: Math.min(data.score, 1.0),
        reason: 'Popular among users with similar tastes',
        metadata: { restaurantId: data.restaurant },
      });
    }
    return results;
  }

  private sortAndLimit(
    results: RecommendationResult[],
    limit: number
  ): RecommendationResult[] {
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
