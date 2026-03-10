import { GraphService } from '../graph/graph-service';
import { RelationshipType } from '../types/graph.types';
import { ExplicitPreference } from '../types/preference.types';

const LIKE_BOOST = 0.3;
const DISLIKE_WEIGHT = -1.0;

export interface ExplicitPreferenceResult {
  applied: boolean;
  previousWeight: number | null;
  newWeight: number;
  relationshipId: string;
}

export class ExplicitPreferenceHandler {
  constructor(private readonly graph: GraphService) {}

  applyPreference(preference: ExplicitPreference): ExplicitPreferenceResult {
    const relId = this.buildRelationshipId(preference);
    const targetNodeId = this.buildTargetNodeId(preference);
    const sourceNodeId = `user-${preference.userId}`;

    const existing = this.graph.getRelationship(relId);
    const previousWeight = existing
      ? (existing.properties['weight'] as number) ?? 0
      : null;

    const newWeight = this.computeNewWeight(previousWeight, preference.sentiment);
    const relType = this.getRelationshipType(preference);

    if (existing) {
      this.graph.updateRelationshipProperties(relId, {
        weight: newWeight,
        sentiment: preference.sentiment,
        explicitlySet: true,
        lastUpdated: preference.timestamp,
      });
    } else {
      this.graph.addRelationship({
        id: relId,
        sourceId: sourceNodeId,
        targetId: targetNodeId,
        type: relType,
        properties: {
          weight: newWeight,
          sentiment: preference.sentiment,
          explicitlySet: true,
          orderCount: 0,
          lastUpdated: preference.timestamp,
        },
      });
    }

    return { applied: true, previousWeight, newWeight, relationshipId: relId };
  }

  getExplicitPreferences(userId: string): ExplicitPreference[] {
    const relationships = this.graph.getAllRelationships();
    const preferences: ExplicitPreference[] = [];

    for (const rel of relationships) {
      if (rel.sourceId !== `user-${userId}`) {
        continue;
      }
      if (rel.properties['explicitlySet'] !== true) {
        continue;
      }
      const parsed = this.parseRelationshipToPreference(userId, rel);
      if (parsed) {
        preferences.push(parsed);
      }
    }

    return preferences;
  }

  removePreference(userId: string, targetId: string, targetType: string): boolean {
    const relId = `explicit-${targetType}-${userId}-${targetId}`;
    const existing = this.graph.getRelationship(relId);
    if (!existing) {
      return false;
    }
    this.graph.removeRelationship(relId);
    return true;
  }

  private computeNewWeight(previousWeight: number | null, sentiment: 'like' | 'dislike'): number {
    if (sentiment === 'dislike') {
      return DISLIKE_WEIGHT;
    }
    const baseWeight = previousWeight !== null ? previousWeight : 0.5;
    return Math.min(baseWeight + LIKE_BOOST, 1.0);
  }

  private buildRelationshipId(preference: ExplicitPreference): string {
    return `explicit-${preference.targetType}-${preference.userId}-${preference.targetId}`;
  }

  private buildTargetNodeId(preference: ExplicitPreference): string {
    const prefixMap: Record<string, string> = {
      dish: 'dish',
      category: 'category',
      restaurant: 'restaurant',
    };
    const prefix = prefixMap[preference.targetType] ?? preference.targetType;
    return `${prefix}-${preference.targetId}`;
  }

  private getRelationshipType(preference: ExplicitPreference): RelationshipType {
    if (preference.sentiment === 'dislike' && preference.targetType === 'category') {
      return RelationshipType.DISLIKES_CATEGORY;
    }
    const typeMap: Record<string, RelationshipType> = {
      dish: RelationshipType.FAVORITE_DISH,
      category: RelationshipType.LIKES_CATEGORY,
      restaurant: RelationshipType.FREQUENTS,
    };
    return typeMap[preference.targetType] ?? RelationshipType.LIKES_CATEGORY;
  }

  private parseRelationshipToPreference(
    userId: string,
    rel: { id: string; targetId: string; properties: Record<string, string | number | boolean | null> }
  ): ExplicitPreference | null {
    const sentiment = rel.properties['sentiment'] as string | null;
    if (!sentiment || (sentiment !== 'like' && sentiment !== 'dislike')) {
      return null;
    }
    const targetType = this.inferTargetType(rel.id);
    const targetId = this.extractTargetId(rel.targetId);

    return {
      userId,
      targetId,
      targetType: targetType as 'dish' | 'category' | 'restaurant',
      sentiment,
      timestamp: (rel.properties['lastUpdated'] as string) ?? new Date().toISOString(),
    };
  }

  private inferTargetType(relId: string): string {
    if (relId.includes('-dish-')) {
      return 'dish';
    }
    if (relId.includes('-category-')) {
      return 'category';
    }
    if (relId.includes('-restaurant-')) {
      return 'restaurant';
    }
    return 'category';
  }

  private extractTargetId(nodeId: string): string {
    const parts = nodeId.split('-');
    return parts.slice(1).join('-');
  }
}
