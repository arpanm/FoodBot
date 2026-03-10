import { GraphService } from '../graph/graph-service';
import { DecayConfig, DEFAULT_DECAY_CONFIG } from '../types/preference.types';
import { RelationshipType } from '../types/graph.types';

export interface PruneResult {
  edgesPruned: number;
  orphanedNodesRemoved: number;
}

const PRUNABLE_RELATIONSHIP_TYPES: RelationshipType[] = [
  RelationshipType.FREQUENTS,
  RelationshipType.FAVORITE_DISH,
  RelationshipType.LIKES_CATEGORY,
  RelationshipType.ORDERS_ON,
  RelationshipType.ORDERS_AT,
];

export class GraphPruner {
  private readonly config: DecayConfig;

  constructor(
    private readonly graph: GraphService,
    config?: Partial<DecayConfig>
  ) {
    this.config = { ...DEFAULT_DECAY_CONFIG, ...config };
  }

  prune(currentDate: Date): PruneResult {
    const edgesPruned = this.pruneStaleEdges(currentDate);
    const orphanedNodesRemoved = this.removeOrphanedNodes();
    return { edgesPruned, orphanedNodesRemoved };
  }

  private pruneStaleEdges(currentDate: Date): number {
    let prunedCount = 0;
    const relationships = this.graph.getAllRelationships();

    for (const rel of relationships) {
      if (!this.isPrunableRelationship(rel.type)) {
        continue;
      }
      if (this.shouldPruneEdge(rel.properties, currentDate)) {
        this.graph.removeRelationship(rel.id);
        prunedCount++;
      }
    }

    return prunedCount;
  }

  private shouldPruneEdge(
    properties: Record<string, string | number | boolean | null>,
    currentDate: Date
  ): boolean {
    const weight = (properties['weight'] as number) ?? 0;
    const lastUpdated = properties['lastUpdated'] as string | null;

    if (weight >= this.config.minimumWeight) {
      return false;
    }

    if (!lastUpdated) {
      return true;
    }

    const ageDays = this.daysBetween(new Date(lastUpdated), currentDate);
    return ageDays > this.config.maxAgeDays;
  }

  private removeOrphanedNodes(): number {
    let removedCount = 0;
    const allNodes = this.graph.getAllNodes();

    for (const node of allNodes) {
      if (this.isOrphaned(node.id)) {
        this.graph.removeNode(node.id);
        removedCount++;
      }
    }

    return removedCount;
  }

  private isOrphaned(nodeId: string): boolean {
    const outgoing = this.graph.queryNeighbors({
      nodeId,
      direction: 'outgoing',
    });
    const incoming = this.graph.queryNeighbors({
      nodeId,
      direction: 'incoming',
    });

    return outgoing.relationships.length === 0 && incoming.relationships.length === 0;
  }

  private isPrunableRelationship(type: RelationshipType): boolean {
    return PRUNABLE_RELATIONSHIP_TYPES.includes(type);
  }

  private daysBetween(dateA: Date, dateB: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs(dateB.getTime() - dateA.getTime()) / msPerDay;
  }
}
