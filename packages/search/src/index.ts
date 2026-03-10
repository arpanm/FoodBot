// Types
export type {
  SearchQuery,
  SearchResult,
  ScoredResult,
  FusedResult,
  SearchFilters,
  SearchContext,
  SearchDocument,
  SearchResponse,
  QueryUnderstanding,
  SearchIntent,
  ExtractedEntity,
  EntityType,
  GeoLocation,
  PriceRange,
  TimeOfDay,
  SearchSource,
  FacetResult,
  FacetBucketResult,
} from './types/search.types';

export type {
  Facet,
  FacetBucket,
  FacetType,
  FacetConfig,
  FacetSelection,
  PriceRangeBucket,
} from './types/facet.types';

export {
  DEFAULT_PRICE_RANGES,
  DEFAULT_RATING_BUCKETS,
  DEFAULT_DELIVERY_TIME_BUCKETS,
  DEFAULT_DISTANCE_BUCKETS,
} from './types/facet.types';

export type {
  QueryLog,
  ClickEvent,
  ConversionEvent,
  SearchStats,
  QualityMetrics,
  QueryFrequency,
} from './types/analytics.types';

// Query Processing
export { preprocessQuery } from './query/query-preprocessor';
export type { PreprocessedQuery } from './query/query-preprocessor';

export { checkSpelling, levenshteinDistance } from './query/spell-checker';
export type { SpellCheckResult, TokenCorrection } from './query/spell-checker';

export { Autocompleter } from './query/autocompleter';
export type { AutocompleteResult, AutocompleteSuggestion } from './query/autocompleter';

export { expandQuery, getSynonymsFor } from './query/query-expander';
export type { ExpandedQuery, SynonymMatch } from './query/query-expander';

export {
  understandQuery,
  classifyIntent,
  extractEntities,
} from './query/query-understanding';

// Search Engine
export { KeywordSearcher } from './engine/keyword-searcher';

export {
  SemanticSearcher,
  InMemoryEmbeddingProvider,
  cosineSimilarity,
} from './engine/semantic-searcher';
export type { EmbeddingProvider, SemanticSearchConfig } from './engine/semantic-searcher';

export { fuseResults } from './engine/score-fusion';
export type { FusionConfig } from './engine/score-fusion';

export {
  searchByRadius,
  sortByDistance,
  haversineDistance,
} from './engine/geo-spatial-searcher';
export type { GeoSearchConfig } from './engine/geo-spatial-searcher';

// Ranking
export {
  applyPreferenceBoosts,
  InMemoryPreferenceProvider,
} from './ranking/preference-booster';
export type {
  UserPreferences,
  PreferenceProvider,
} from './ranking/preference-booster';

export {
  applyContextualBoosts,
  detectTimeOfDay,
} from './ranking/contextual-ranker';

export {
  applyPopularityBoosts,
  computeTrendingScore,
} from './ranking/popularity-booster';
export type { PopularityConfig } from './ranking/popularity-booster';

export { AbTestRouter } from './ranking/ab-test-router';
export type {
  Experiment,
  ExperimentVariant,
  VariantAssignment,
} from './ranking/ab-test-router';

// Facets
export { FacetEngine } from './facets/facet-engine';

export {
  buildCuisineFacet,
  buildPriceRangeFacet,
  buildRatingFacet,
  buildDietaryFacet,
  buildDeliveryTimeFacet,
  buildDistanceFacet,
} from './facets/dynamic-facet-builder';

export { applyFilters, applyFacetSelections } from './facets/filter-applier';

// Analytics
export { QueryLogger } from './analytics/query-logger';
export { ClickTracker } from './analytics/click-tracker';
export { ConversionTracker } from './analytics/conversion-tracker';
export { AnalyticsAggregator } from './analytics/analytics-aggregator';

// Orchestrator
export { SearchOrchestrator } from './orchestrator/search-orchestrator';
export type { SearchOrchestratorConfig } from './orchestrator/search-orchestrator';
