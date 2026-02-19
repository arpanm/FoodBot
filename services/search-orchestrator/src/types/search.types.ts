/**
 * Core search type definitions for the Search Orchestrator Service.
 * Defines the unified search request/response contracts.
 */

export type SortField = 'relevance' | 'rating' | 'distance' | 'deliveryTime' | 'price' | 'popularity';
export type SortOrder = 'asc' | 'desc';
export type SearchStrategyType = 'fast' | 'comprehensive' | 'fallback';

export interface GeoLocation {
  lat: number;
  lon: number;
}

export interface PriceRange {
  min?: number;
  max?: number;
}

export interface SearchFilters {
  cuisines?: string[];
  priceRange?: PriceRange;
  minRating?: number;
  maxDeliveryTime?: number;
  location?: GeoLocation;
  radiusKm?: number;
  isAvailable?: boolean;
  dietary?: string[];
  category?: string;
  tags?: string[];
}

export interface SearchRequest {
  query: string;
  filters?: SearchFilters;
  sort?: {
    field: SortField;
    order: SortOrder;
  };
  page: number;
  pageSize: number;
  strategy?: SearchStrategyType;
  userId?: string;
  requestId?: string;
}

export interface AutocompleteRequest {
  prefix: string;
  limit?: number;
  location?: GeoLocation;
}

export interface SearchMetadata {
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTimeMs: number;
  sources: SourceMetadata[];
  strategy: SearchStrategyType;
  cacheHit: boolean;
  requestId: string;
}

export interface SourceMetadata {
  name: string;
  latencyMs: number;
  resultCount: number;
  status: 'success' | 'timeout' | 'error' | 'skipped';
  errorMessage?: string;
}

export interface SearchResponse {
  results: UnifiedSearchResult[];
  metadata: SearchMetadata;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
  queryTimeMs: number;
}

export interface AutocompleteSuggestion {
  text: string;
  type: 'restaurant' | 'dish' | 'cuisine';
  id?: string;
  metadata?: Record<string, unknown>;
}

export interface UnifiedSearchResult {
  id: string;
  type: 'restaurant' | 'dish';
  name: string;
  description: string;
  score: number;
  source: string;
  restaurant?: RestaurantResult;
  dish?: DishResult;
}

export interface RestaurantResult {
  id: string;
  name: string;
  description: string;
  cuisineTypes: string[];
  rating: number;
  reviewCount: number;
  priceRange: string;
  deliveryTime: number;
  deliveryFee: number;
  minimumOrder: number;
  isAvailable: boolean;
  imageUrl?: string;
  address: string;
  location?: GeoLocation;
  distanceKm?: number;
  tags: string[];
  features: string[];
}

export interface DishResult {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  name: string;
  description: string;
  category: string;
  price: number;
  discountedPrice?: number;
  ingredients: string[];
  dietaryTags: string[];
  isAvailable: boolean;
  rating: number;
  imageUrl?: string;
}

export interface PopularSearch {
  query: string;
  count: number;
  trending: boolean;
}
