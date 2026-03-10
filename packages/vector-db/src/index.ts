// Types
export type {
  VectorPoint,
  SearchResult,
  CollectionConfig,
  SearchOptions,
  FilterCondition,
  FilterOperator,
  FieldCondition,
  MatchCondition,
  RangeCondition,
  KeywordCondition,
  GeoCondition,
  DistanceMetric,
  VectorStore,
  RecommendOptions,
} from './types/vector-store.types.js';

export type {
  EmbeddingProvider,
  EmbeddingProviderConfig,
  EmbeddingResult,
  BatchEmbeddingResult,
  EmbeddingServiceConfig,
  EmbeddingCacheEntry,
} from './types/embedding.types.js';

export type {
  CacheTier,
  CacheResult,
  CacheEntry,
  CacheStats,
  CacheOrchestratorConfig,
  SemanticCacheConfig,
} from './types/cache.types.js';

// Vector Store
export { InMemoryVectorStore } from './vector-store/vector-store.client.js';
export { CollectionManager } from './vector-store/collection-manager.js';
export type { CollectionInfo } from './vector-store/collection-manager.js';
export { FilterBuilder, createFilterBuilder } from './vector-store/filter-builder.js';
export { SearchEngine } from './vector-store/search-engine.js';
export type { SearchEngineConfig } from './vector-store/search-engine.js';
export {
  computeDistance,
  haversineDistance,
} from './vector-store/distance-calculator.js';

// Embedding
export { EmbeddingService } from './embedding/embedding.service.js';
export { LocalEmbedder } from './embedding/local-embedder.js';
export { OpenAiEmbedder } from './embedding/openai-embedder.js';
export type { OpenAiApiClient, OpenAiEmbeddingResponse } from './embedding/openai-embedder.js';
export { EmbeddingCache } from './embedding/embedding-cache.js';
export type { EmbeddingCacheConfig } from './embedding/embedding-cache.js';

// Cache
export { CacheOrchestrator } from './cache/cache-orchestrator.js';
export {
  normalizePrompt,
  hashPrompt,
  hashRaw,
  arePromptsEquivalent,
} from './cache/prompt-hasher.js';
export {
  cosineSimilarity,
  meetsThreshold,
  findBestMatch,
  rankBySimilarity,
} from './cache/similarity-scorer.js';
export { CacheMetrics } from './cache/cache-metrics.js';

// Intent
export { IntentMatcher } from './intent/intent-matcher.js';
export type { IntentEntry, IntentMatchResult } from './intent/intent-matcher.js';
export { WorkflowTemplateCache } from './intent/workflow-template-cache.js';
export type {
  WorkflowStep,
  WorkflowTemplate,
  TemplateMatchResult,
} from './intent/workflow-template-cache.js';

// Search
export { DishEmbedder } from './search/dish-embedder.js';
export type { DishData } from './search/dish-embedder.js';
export { RestaurantEmbedder } from './search/restaurant-embedder.js';
export type { RestaurantData } from './search/restaurant-embedder.js';
export { HybridSearch, createHybridSearch } from './search/hybrid-search.js';
export type {
  HybridSearchConfig,
  HybridSearchResult,
  KeywordSearchFn,
} from './search/hybrid-search.js';
