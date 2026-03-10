import {
  GraphNode,
  GraphRelationship,
  GraphQueryResult,
  NeighborQuery,
  GeoDistanceQuery,
  NodeType,
  RelationshipType,
} from '../types/graph.types';

export interface GraphService {
  addNode(node: GraphNode): void;
  getNode(id: string): GraphNode | undefined;
  getNodesByLabel(label: NodeType): GraphNode[];
  removeNode(id: string): void;
  updateNodeProperties(
    id: string,
    properties: Record<string, string | number | boolean | null>
  ): void;

  addRelationship(relationship: GraphRelationship): void;
  getRelationship(id: string): GraphRelationship | undefined;
  getRelationshipsBetween(
    sourceId: string,
    targetId: string,
    type?: RelationshipType
  ): GraphRelationship[];
  removeRelationship(id: string): void;
  updateRelationshipProperties(
    id: string,
    properties: Record<string, string | number | boolean | null>
  ): void;

  queryNeighbors(query: NeighborQuery): GraphQueryResult;
  queryByGeoDistance(query: GeoDistanceQuery): GraphNode[];

  getAllNodes(): GraphNode[];
  getAllRelationships(): GraphRelationship[];

  clear(): void;
  close(): void;
}
