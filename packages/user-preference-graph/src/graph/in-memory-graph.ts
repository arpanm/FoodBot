import {
  GraphNode,
  GraphRelationship,
  GraphQueryResult,
  NeighborQuery,
  GeoDistanceQuery,
  NodeType,
  RelationshipType,
} from '../types/graph.types';
import { GraphService } from './graph-service';

export class InMemoryGraph implements GraphService {
  private nodes: Map<string, GraphNode> = new Map();
  private relationships: Map<string, GraphRelationship> = new Map();
  private outgoing: Map<string, Set<string>> = new Map();
  private incoming: Map<string, Set<string>> = new Map();

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, { ...node, properties: { ...node.properties } });
    if (!this.outgoing.has(node.id)) {
      this.outgoing.set(node.id, new Set());
    }
    if (!this.incoming.has(node.id)) {
      this.incoming.set(node.id, new Set());
    }
  }

  getNode(id: string): GraphNode | undefined {
    const node = this.nodes.get(id);
    return node ? { ...node, properties: { ...node.properties } } : undefined;
  }

  getNodesByLabel(label: NodeType): GraphNode[] {
    const results: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      if (node.label === label) {
        results.push({ ...node, properties: { ...node.properties } });
      }
    }
    return results;
  }

  removeNode(id: string): void {
    const relIds = this.getRelationshipIdsForNode(id);
    for (const relId of relIds) {
      this.removeRelationship(relId);
    }
    this.nodes.delete(id);
    this.outgoing.delete(id);
    this.incoming.delete(id);
  }

  updateNodeProperties(
    id: string,
    properties: Record<string, string | number | boolean | null>
  ): void {
    const node = this.nodes.get(id);
    if (!node) {
      return;
    }
    node.properties = { ...node.properties, ...properties };
  }

  addRelationship(relationship: GraphRelationship): void {
    this.relationships.set(relationship.id, {
      ...relationship,
      properties: { ...relationship.properties },
    });
    this.ensureAdjacencyEntry(relationship.sourceId);
    this.ensureAdjacencyEntry(relationship.targetId);
    this.outgoing.get(relationship.sourceId)?.add(relationship.id);
    this.incoming.get(relationship.targetId)?.add(relationship.id);
  }

  getRelationship(id: string): GraphRelationship | undefined {
    const rel = this.relationships.get(id);
    return rel ? { ...rel, properties: { ...rel.properties } } : undefined;
  }

  getRelationshipsBetween(
    sourceId: string,
    targetId: string,
    type?: RelationshipType
  ): GraphRelationship[] {
    const outIds = this.outgoing.get(sourceId);
    if (!outIds) {
      return [];
    }
    const results: GraphRelationship[] = [];
    for (const relId of outIds) {
      const rel = this.relationships.get(relId);
      if (rel && rel.targetId === targetId) {
        if (!type || rel.type === type) {
          results.push({ ...rel, properties: { ...rel.properties } });
        }
      }
    }
    return results;
  }

  removeRelationship(id: string): void {
    const rel = this.relationships.get(id);
    if (!rel) {
      return;
    }
    this.outgoing.get(rel.sourceId)?.delete(id);
    this.incoming.get(rel.targetId)?.delete(id);
    this.relationships.delete(id);
  }

  updateRelationshipProperties(
    id: string,
    properties: Record<string, string | number | boolean | null>
  ): void {
    const rel = this.relationships.get(id);
    if (!rel) {
      return;
    }
    rel.properties = { ...rel.properties, ...properties };
  }

  queryNeighbors(query: NeighborQuery): GraphQueryResult {
    const direction = query.direction ?? 'outgoing';
    const relIds = this.collectRelationshipIds(query.nodeId, direction);
    return this.buildQueryResult(relIds, query);
  }

  queryByGeoDistance(query: GeoDistanceQuery): GraphNode[] {
    const results: GraphNode[] = [];
    for (const node of this.nodes.values()) {
      if (query.nodeLabel && node.label !== query.nodeLabel) {
        continue;
      }
      const lat = node.properties['latitude'] as number | null;
      const lon = node.properties['longitude'] as number | null;
      if (lat === null || lat === undefined || lon === null || lon === undefined) {
        continue;
      }
      const distance = haversineDistance(query.latitude, query.longitude, lat, lon);
      if (distance <= query.radiusKm) {
        results.push({ ...node, properties: { ...node.properties } });
      }
    }
    return results;
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values()).map((n) => ({
      ...n,
      properties: { ...n.properties },
    }));
  }

  getAllRelationships(): GraphRelationship[] {
    return Array.from(this.relationships.values()).map((r) => ({
      ...r,
      properties: { ...r.properties },
    }));
  }

  clear(): void {
    this.nodes.clear();
    this.relationships.clear();
    this.outgoing.clear();
    this.incoming.clear();
  }

  close(): void {
    this.clear();
  }

  private ensureAdjacencyEntry(nodeId: string): void {
    if (!this.outgoing.has(nodeId)) {
      this.outgoing.set(nodeId, new Set());
    }
    if (!this.incoming.has(nodeId)) {
      this.incoming.set(nodeId, new Set());
    }
  }

  private getRelationshipIdsForNode(nodeId: string): string[] {
    const ids: string[] = [];
    const outIds = this.outgoing.get(nodeId);
    if (outIds) {
      ids.push(...outIds);
    }
    const inIds = this.incoming.get(nodeId);
    if (inIds) {
      ids.push(...inIds);
    }
    return ids;
  }

  private collectRelationshipIds(
    nodeId: string,
    direction: 'outgoing' | 'incoming' | 'both'
  ): Set<string> {
    const relIds = new Set<string>();
    if (direction === 'outgoing' || direction === 'both') {
      const outIds = this.outgoing.get(nodeId);
      if (outIds) {
        for (const id of outIds) {
          relIds.add(id);
        }
      }
    }
    if (direction === 'incoming' || direction === 'both') {
      const inIds = this.incoming.get(nodeId);
      if (inIds) {
        for (const id of inIds) {
          relIds.add(id);
        }
      }
    }
    return relIds;
  }

  private buildQueryResult(
    relIds: Set<string>,
    query: NeighborQuery
  ): GraphQueryResult {
    const nodes: GraphNode[] = [];
    const relationships: GraphRelationship[] = [];
    const seenNodes = new Set<string>();
    let count = 0;

    for (const relId of relIds) {
      if (query.limit && count >= query.limit) {
        break;
      }
      const rel = this.relationships.get(relId);
      if (!rel) {
        continue;
      }
      if (query.relationshipType && rel.type !== query.relationshipType) {
        continue;
      }
      relationships.push({ ...rel, properties: { ...rel.properties } });
      const neighborId = rel.sourceId === query.nodeId ? rel.targetId : rel.sourceId;
      if (!seenNodes.has(neighborId)) {
        const neighborNode = this.nodes.get(neighborId);
        if (neighborNode) {
          nodes.push({ ...neighborNode, properties: { ...neighborNode.properties } });
          seenNodes.add(neighborId);
        }
      }
      count++;
    }

    return { nodes, relationships };
  }
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const EARTH_RADIUS_KM = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
