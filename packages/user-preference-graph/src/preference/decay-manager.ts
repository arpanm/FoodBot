import { GraphService } from '../graph/graph-service';
import { RelationshipType } from '../types/graph.types';
import { DecayConfig, DEFAULT_DECAY_CONFIG } from '../types/preference.types';
import { WeightCalculator } from './weight-calculator';

export interface DecayResult {
  updatedCount: number;
  prunedCount: number;
}

const WEIGHTED_RELATIONSHIP_TYPES: RelationshipType[] = [
  RelationshipType.FREQUENTS,
  RelationshipType.FAVORITE_DISH,
  RelationshipType.LIKES_CATEGORY,
  RelationshipType.ORDERS_ON,
  RelationshipType.ORDERS_AT,
];

export class DecayManager {
  private readonly config: DecayConfig;
  private readonly calculator: WeightCalculator;

  constructor(
    private readonly graph: GraphService,
    config?: Partial<DecayConfig>
  ) {
    this.config = { ...DEFAULT_DECAY_CONFIG, ...config };
    this.calculator = new WeightCalculator(this.config);
  }

  applyDecayToAll(currentDate: Date): DecayResult {
    let updatedCount = 0;
    let prunedCount = 0;

    const relationships = this.graph.getAllRelationships();

    for (const rel of relationships) {
      if (!this.isWeightedRelationship(rel.type)) {
        continue;
      }
      const result = this.applyDecayToRelationship(rel.id, rel.properties, currentDate);
      if (result === 'pruned') {
        prunedCount++;
      } else if (result === 'updated') {
        updatedCount++;
      }
    }

    return { updatedCount, prunedCount };
  }

  pruneStaleEdges(currentDate: Date): number {
    let prunedCount = 0;
    const relationships = this.graph.getAllRelationships();

    for (const rel of relationships) {
      if (!this.isWeightedRelationship(rel.type)) {
        continue;
      }
      if (this.shouldPrune(rel.properties, currentDate)) {
        this.graph.removeRelationship(rel.id);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  private applyDecayToRelationship(
    relId: string,
    properties: Record<string, string | number | boolean | null>,
    currentDate: Date
  ): 'updated' | 'pruned' | 'skipped' {
    const lastUpdated = properties['lastUpdated'] as string | null;
    if (!lastUpdated) {
      return 'skipped';
    }

    const daysSince = this.daysBetween(new Date(lastUpdated), currentDate);
    const currentWeight = (properties['weight'] as number) ?? 0;
    const decayFactor = this.calculator.calculateRecencyDecay(daysSince);
    const newWeight = currentWeight * decayFactor;

    if (!this.calculator.isAboveThreshold(newWeight) && daysSince > this.config.maxAgeDays) {
      this.graph.removeRelationship(relId);
      return 'pruned';
    }

    this.graph.updateRelationshipProperties(relId, {
      weight: newWeight,
      lastDecayApplied: currentDate.toISOString(),
    });
    return 'updated';
  }

  private shouldPrune(
    properties: Record<string, string | number | boolean | null>,
    currentDate: Date
  ): boolean {
    const weight = (properties['weight'] as number) ?? 0;
    const lastUpdated = properties['lastUpdated'] as string | null;

    if (weight < this.config.minimumWeight) {
      if (!lastUpdated) {
        return true;
      }
      const daysSince = this.daysBetween(new Date(lastUpdated), currentDate);
      return daysSince > this.config.maxAgeDays;
    }

    return false;
  }

  private isWeightedRelationship(type: RelationshipType): boolean {
    return WEIGHTED_RELATIONSHIP_TYPES.includes(type);
  }

  private daysBetween(dateA: Date, dateB: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs(dateB.getTime() - dateA.getTime()) / msPerDay;
  }
}
