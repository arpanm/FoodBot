import { GraphService } from '../graph/graph-service';
import { GraphNode, GraphRelationship } from '../types/graph.types';

export interface DeletionAuditEntry {
  userId: string;
  timestamp: string;
  nodesDeleted: number;
  relationshipsDeleted: number;
  deletedNodeIds: string[];
  deletedRelationshipIds: string[];
}

export class GdprDeleter {
  constructor(private readonly graph: GraphService) {}

  deleteUserData(userId: string): DeletionAuditEntry {
    const userNodeId = `user-${userId}`;
    const timestamp = new Date().toISOString();

    const userNode = this.graph.getNode(userNodeId);
    if (!userNode) {
      return this.buildEmptyAuditEntry(userId, timestamp);
    }

    const relatedRelationships = this.findUserRelationships(userNodeId);
    const relatedNodeIds = this.findUserOwnedNodes(userId);

    const deletedRelationshipIds = this.deleteRelationships(relatedRelationships);
    const deletedNodeIds = this.deleteNodes(userNodeId, relatedNodeIds);

    return {
      userId,
      timestamp,
      nodesDeleted: deletedNodeIds.length,
      relationshipsDeleted: deletedRelationshipIds.length,
      deletedNodeIds,
      deletedRelationshipIds,
    };
  }

  private findUserRelationships(userNodeId: string): GraphRelationship[] {
    const allRelationships = this.graph.getAllRelationships();
    return allRelationships.filter(
      (rel) => rel.sourceId === userNodeId || rel.targetId === userNodeId
    );
  }

  private findUserOwnedNodes(userId: string): string[] {
    const prefix = `user-${userId}`;
    const allRelationships = this.graph.getAllRelationships();

    const nodeIds = new Set<string>();
    for (const rel of allRelationships) {
      if (rel.sourceId === prefix) {
        nodeIds.add(rel.sourceId);
      }
    }

    return Array.from(nodeIds);
  }

  private deleteRelationships(relationships: GraphRelationship[]): string[] {
    const deletedIds: string[] = [];
    for (const rel of relationships) {
      this.graph.removeRelationship(rel.id);
      deletedIds.push(rel.id);
    }
    return deletedIds;
  }

  private deleteNodes(userNodeId: string, additionalNodeIds: string[]): string[] {
    const deletedIds: string[] = [];

    this.graph.removeNode(userNodeId);
    deletedIds.push(userNodeId);

    for (const nodeId of additionalNodeIds) {
      if (nodeId !== userNodeId && this.graph.getNode(nodeId)) {
        this.graph.removeNode(nodeId);
        deletedIds.push(nodeId);
      }
    }

    return deletedIds;
  }

  private buildEmptyAuditEntry(userId: string, timestamp: string): DeletionAuditEntry {
    return {
      userId,
      timestamp,
      nodesDeleted: 0,
      relationshipsDeleted: 0,
      deletedNodeIds: [],
      deletedRelationshipIds: [],
    };
  }
}
