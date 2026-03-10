/**
 * Vector store types for point storage, search, and collection configuration.
 */

export type DistanceMetric = 'cosine' | 'euclidean' | 'dot';

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
  vector?: number[];
}

export interface CollectionConfig {
  name: string;
  dimension: number;
  distance: DistanceMetric;
  onDiskPayload?: boolean;
}

export interface SearchOptions {
  limit: number;
  scoreThreshold?: number;
  filter?: FilterCondition;
  withPayload?: boolean;
  withVector?: boolean;
  offset?: number;
}

export type FilterOperator = 'must' | 'should' | 'must_not';

export interface MatchCondition {
  type: 'match';
  key: string;
  value: string | number | boolean;
}

export interface RangeCondition {
  type: 'range';
  key: string;
  gte?: number;
  lte?: number;
  gt?: number;
  lt?: number;
}

export interface KeywordCondition {
  type: 'keyword';
  key: string;
  values: string[];
}

export interface GeoCondition {
  type: 'geo';
  key: string;
  center: { lat: number; lon: number };
  radiusKm: number;
}

export type FieldCondition =
  | MatchCondition
  | RangeCondition
  | KeywordCondition
  | GeoCondition;

export interface FilterCondition {
  must?: FieldCondition[];
  should?: FieldCondition[];
  must_not?: FieldCondition[];
}

export interface VectorStore {
  createCollection(config: CollectionConfig): Promise<void>;
  deleteCollection(name: string): Promise<void>;
  listCollections(): Promise<string[]>;
  upsertPoints(collection: string, points: VectorPoint[]): Promise<void>;
  deletePoints(collection: string, ids: string[]): Promise<void>;
  getPoints(collection: string, ids: string[]): Promise<VectorPoint[]>;
  search(
    collection: string,
    vector: number[],
    options: SearchOptions
  ): Promise<SearchResult[]>;
}

export interface RecommendOptions {
  positive: string[];
  negative?: string[];
  limit: number;
  scoreThreshold?: number;
  filter?: FilterCondition;
}
