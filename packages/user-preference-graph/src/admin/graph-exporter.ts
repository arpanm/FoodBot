import { GraphService } from '../graph/graph-service';
import { GraphNode, GraphRelationship } from '../types/graph.types';

export interface ExportedGraph {
  exportedAt: string;
  userId: string;
  nodes: ExportedNode[];
  relationships: ExportedRelationship[];
  stats: ExportStats;
}

export interface ExportedNode {
  id: string;
  label: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface ExportedRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  properties: Record<string, string | number | boolean | null>;
}

export interface ExportStats {
  totalNodes: number;
  totalRelationships: number;
  nodesByLabel: Record<string, number>;
  relationshipsByType: Record<string, number>;
}

export class GraphExporter {
  constructor(private readonly graph: GraphService) {}

  exportUserGraph(userId: string): ExportedGraph {
    const userNodeId = `user-${userId}`;
    const connectedNodeIds = this.findConnectedNodes(userNodeId);
    const nodes = this.collectNodes(connectedNodeIds);
    const relationships = this.collectRelationships(connectedNodeIds);
    const stats = this.computeStats(nodes, relationships);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      nodes: nodes.map(this.toExportedNode),
      relationships: relationships.map(this.toExportedRelationship),
      stats,
    };
  }

  exportFullGraph(): ExportedGraph {
    const nodes = this.graph.getAllNodes();
    const relationships = this.graph.getAllRelationships();
    const stats = this.computeStats(nodes, relationships);

    return {
      exportedAt: new Date().toISOString(),
      userId: '*',
      nodes: nodes.map(this.toExportedNode),
      relationships: relationships.map(this.toExportedRelationship),
      stats,
    };
  }

  private findConnectedNodes(startNodeId: string): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [startNodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) {
        continue;
      }
      visited.add(current);

      const neighbors = this.graph.queryNeighbors({
        nodeId: current,
        direction: 'both',
      });

      for (const node of neighbors.nodes) {
        if (!visited.has(node.id)) {
          queue.push(node.id);
        }
      }
    }

    return visited;
  }

  private collectNodes(nodeIds: Set<string>): GraphNode[] {
    const nodes: GraphNode[] = [];
    for (const nodeId of nodeIds) {
      const node = this.graph.getNode(nodeId);
      if (node) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  private collectRelationships(nodeIds: Set<string>): GraphRelationship[] {
    const allRelationships = this.graph.getAllRelationships();
    return allRelationships.filter(
      (rel) => nodeIds.has(rel.sourceId) && nodeIds.has(rel.targetId)
    );
  }

  private computeStats(nodes: GraphNode[], relationships: GraphRelationship[]): ExportStats {
    const nodesByLabel: Record<string, number> = {};
    for (const node of nodes) {
      nodesByLabel[node.label] = (nodesByLabel[node.label] ?? 0) + 1;
    }

    const relationshipsByType: Record<string, number> = {};
    for (const rel of relationships) {
      relationshipsByType[rel.type] = (relationshipsByType[rel.type] ?? 0) + 1;
    }

    return {
      totalNodes: nodes.length,
      totalRelationships: relationships.length,
      nodesByLabel,
      relationshipsByType,
    };
  }

  private toExportedNode(node: GraphNode): ExportedNode {
    return {
      id: node.id,
      label: node.label,
      properties: { ...node.properties },
    };
  }

  private toExportedRelationship(rel: GraphRelationship): ExportedRelationship {
    return {
      id: rel.id,
      sourceId: rel.sourceId,
      targetId: rel.targetId,
      type: rel.type,
      properties: { ...rel.properties },
    };
  }
}
