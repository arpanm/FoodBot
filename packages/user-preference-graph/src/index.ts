// Types
export {
  NodeType,
  RelationshipType,
  type GraphNode,
  type UserNode,
  type RestaurantNode,
  type DishNode,
  type CategoryNode,
  type DayOfWeekNode,
  type TimeSlotNode,
  type GraphRelationship,
  type GraphQueryResult,
  type NeighborQuery,
  type GeoDistanceQuery,
} from './types/graph.types';

export {
  type WeightParams,
  type PreferenceWeight,
  type DecayConfig,
  type ContextMultiplier,
  type ExplicitPreference,
  type OrderHistoryRecord,
  type OrderItemRecord,
  DEFAULT_DECAY_CONFIG,
} from './types/preference.types';

export {
  type RecommendationResult,
  type TimeContext,
  type LocationContext,
  type SimilarUser,
  type PreferenceSummary,
  type CategoryPreference,
  type DishPreference,
  type RestaurantPreference,
  type TimePattern,
} from './types/recommendation.types';

// Graph
export { type GraphService } from './graph/graph-service';
export { InMemoryGraph, haversineDistance } from './graph/in-memory-graph';
export { SchemaManager, type SchemaConstraint, type SchemaIndex } from './graph/schema-manager';

// Preference
export { WeightCalculator } from './preference/weight-calculator';
export { DecayManager, type DecayResult } from './preference/decay-manager';
export {
  OrderHistoryImporter,
  type ImportResult,
} from './preference/order-history-importer';
export { NodeFactory } from './preference/node-factory';
export {
  ExplicitPreferenceHandler,
  type ExplicitPreferenceResult,
} from './preference/explicit-preference-handler';

// Recommendation
export { TimeAwareRecommender } from './recommendation/time-aware-recommender';
export { LocationAwareRecommender } from './recommendation/location-aware-recommender';
export { CollaborativeFilter } from './recommendation/collaborative-filter';
export { ExplorationRecommender } from './recommendation/exploration-recommender';

// Query
export { PreferenceQuery } from './query/preference-query';
export { PreferenceSummarizer } from './query/preference-summarizer';

// Sync
export { GraphUpdater, type UpdateResult } from './sync/graph-updater';
export {
  BatchRecalculator,
  type BatchRecalculationResult,
} from './sync/batch-recalculator';
export { GraphPruner, type PruneResult } from './sync/graph-pruner';

// Admin
export { GdprDeleter, type DeletionAuditEntry } from './admin/gdpr-deleter';
export {
  GraphExporter,
  type ExportedGraph,
  type ExportedNode,
  type ExportedRelationship,
  type ExportStats,
} from './admin/graph-exporter';
