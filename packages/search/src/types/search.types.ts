export interface SearchQuery {
  readonly text: string;
  readonly userId?: string;
  readonly filters?: SearchFilters;
  readonly context?: SearchContext;
  readonly limit?: number;
  readonly offset?: number;
}

export interface SearchFilters {
  readonly cuisine?: string[];
  readonly priceRange?: PriceRange;
  readonly minRating?: number;
  readonly dietary?: string[];
  readonly maxDeliveryTime?: number;
  readonly maxDistance?: number;
  readonly location?: GeoLocation;
}

export interface PriceRange {
  readonly min: number;
  readonly max: number;
}

export interface GeoLocation {
  readonly lat: number;
  readonly lng: number;
}

export interface SearchContext {
  readonly timeOfDay?: TimeOfDay;
  readonly dayOfWeek?: number;
  readonly location?: GeoLocation;
  readonly previousQueries?: string[];
  readonly sessionId?: string;
}

export type TimeOfDay = 'morning' | 'lunch' | 'evening' | 'late_night';

export interface SearchDocument {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cuisine: string;
  readonly price: number;
  readonly rating: number;
  readonly dietary: string[];
  readonly deliveryTime: number;
  readonly location?: GeoLocation;
  readonly orderCount?: number;
  readonly recentOrderCount?: number;
  readonly tags?: string[];
}

export interface SearchResult {
  readonly document: SearchDocument;
  readonly score: number;
  readonly source: SearchSource;
}

export type SearchSource = 'keyword' | 'semantic' | 'geo';

export interface ScoredResult {
  readonly document: SearchDocument;
  readonly score: number;
  readonly keywordScore?: number;
  readonly semanticScore?: number;
  readonly geoScore?: number;
}

export interface FusedResult {
  readonly document: SearchDocument;
  readonly fusedScore: number;
  readonly keywordRank?: number;
  readonly semanticRank?: number;
  readonly personalizedScore?: number;
}

export interface SearchResponse {
  readonly results: FusedResult[];
  readonly totalCount: number;
  readonly queryId: string;
  readonly latencyMs: number;
  readonly facets: FacetResult[];
  readonly correctedQuery?: string;
  readonly suggestions?: string[];
}

export interface FacetResult {
  readonly name: string;
  readonly buckets: FacetBucketResult[];
}

export interface FacetBucketResult {
  readonly value: string;
  readonly count: number;
  readonly selected: boolean;
}

export interface QueryUnderstanding {
  readonly intent: SearchIntent;
  readonly entities: ExtractedEntity[];
  readonly normalizedQuery: string;
  readonly expandedTerms: string[];
  readonly correctedQuery?: string;
}

export type SearchIntent = 'food_search' | 'restaurant_search' | 'filter_command';

export interface ExtractedEntity {
  readonly type: EntityType;
  readonly value: string;
  readonly confidence: number;
}

export type EntityType = 'cuisine' | 'dish' | 'dietary' | 'price_range' | 'location';
