# TASK-GRAPH-001: Neo4j User Preference Graph

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 14 days
**Component:** Backend / Personalization
**Depends On:** TASK-DB-001 (user data)
**Blocks:** Personalization, recommendations, diet planner
**Related Requirements:** FR-DATA-GRAPH-001

---

## Table of Contents

- [Overview](#overview)
- [Requirements](#requirements)
  - [Functional Requirements](#functional-requirements)
  - [Non-Functional Requirements](#non-functional-requirements)
- [Architecture](#architecture)
- [Acceptance Criteria](#acceptance-criteria)
- [SDLC Phases](#sdlc-phases)

---

## Overview

Implement a Neo4j graph database for storing and querying user preference data as a hierarchical tree (day of week -> hour of day -> category -> subcategory -> restaurants -> dishes). This enables deep personalization, recommendation generation, preference learning from order history, and contextual suggestions based on time, location, and behavior patterns.

---

## Requirements

### Functional Requirements

1. **Graph Schema Design**
   - Nodes: User, DayOfWeek, TimeSlot, Category, SubCategory, Restaurant, Dish, Location, DietaryPreference, PriceRange
   - Relationships: PREFERS, ORDERS_ON, ORDERS_AT_TIME, LIKES_CATEGORY, FREQUENTS, FAVORITE_DISH, LIVES_NEAR, HAS_DIETARY_PREF, PREFERS_PRICE_RANGE
   - Properties on relationships: weight (0-1), order_count, last_ordered, avg_rating_given, total_spent
   - Temporal properties: created_at, updated_at, decay_factor

2. **Preference Learning Engine**
   - Auto-build preference graph from order history
   - Weight calculation: frequency x recency x rating
   - Time-decay for old preferences (exponential decay, half-life: 30 days)
   - Explicit preference capture (user says "I like X")
   - Negative preference tracking ("I don't like Y")
   - Context-aware weights (weekday vs weekend, lunch vs dinner)

3. **Recommendation Engine**
   - Time-aware recommendations (what user orders on Tuesday at 7pm)
   - Location-aware recommendations (nearby restaurants with preferred dishes)
   - Collaborative filtering (users with similar preferences)
   - Category exploration (suggest new cuisines based on preference patterns)
   - Budget-aware recommendations
   - Health-goal aware recommendations (integrate with diet planner)

4. **Query Patterns**
   - Get user preferences for current context (day, time, location)
   - Get top-N recommended restaurants for user
   - Get top-N recommended dishes for user at specific restaurant
   - Get similar users for collaborative filtering
   - Get preference graph for prompt enrichment (to pass to LLM)
   - Get preference summary as natural language (for LLM context)

5. **Data Sync & Maintenance**
   - Real-time graph updates on order completion (Kafka consumer)
   - Batch preference recalculation (daily cron job)
   - Graph pruning (remove low-weight edges older than 90 days)
   - Graph export for analytics
   - User data deletion (GDPR compliance)

### Non-Functional Requirements

1. **Performance:**
   - Preference query latency < 100ms at p95
   - Recommendation query latency < 200ms at p95
   - Graph update latency < 50ms per event
   - Batch recalculation < 1 hour for 100K users

2. **Scalability:**
   - Support 100K+ users with full preference graphs
   - Handle 500 preference queries/sec
   - Handle 100 graph updates/sec

3. **Reliability:**
   - Graceful degradation if Neo4j is unavailable (fallback to cached preferences)
   - Data consistency between order events and graph state
   - Transaction support for multi-edge updates

4. **Privacy & Compliance:**
   - GDPR-compliant data deletion (full user graph removal)
   - Preference data retention policy (90 days for inactive relationships)
   - Audit logging for preference data access
   - User consent tracking for personalization

---

## Architecture

### Graph Structure

```
(User)-[:ORDERS_ON {weight, count}]->(DayOfWeek)
(User)-[:ORDERS_AT_TIME {weight}]->(TimeSlot)
(User)-[:LIKES_CATEGORY {weight, count}]->(Category)
(Category)-[:HAS_SUB]->(SubCategory)
(User)-[:FREQUENTS {weight, count, last_visit}]->(Restaurant)
(User)-[:FAVORITE_DISH {weight, rating, count}]->(Dish)
(Restaurant)-[:SERVES]->(Dish)
(Dish)-[:BELONGS_TO]->(Category)
(User)-[:LIVES_NEAR]->(Location)
(User)-[:HAS_DIETARY_PREF]->(DietaryPreference)
(User)-[:PREFERS_PRICE_RANGE]->(PriceRange)
(User)-[:SIMILAR_TO {similarity_score}]->(User)
```

### Example Graph for a User

```
          Monday ←──ORDERS_ON──┐
          Tuesday ←─ORDERS_ON──┤
                               │
  12-1pm ←─ORDERS_AT_TIME─────(User: John)──LIKES_CATEGORY──→ Indian
  7-8pm ←──ORDERS_AT_TIME─────┤│                              ├── Biryani
                               ││                              └── Curry
                               │├──FREQUENTS──→ Spice Garden
                               │├──FREQUENTS──→ Curry House
                               │├──FAVORITE_DISH──→ Chicken Biryani
                               │├──FAVORITE_DISH──→ Butter Chicken
                               │├──HAS_DIETARY_PREF──→ Non-Vegetarian
                               │└──PREFERS_PRICE_RANGE──→ $10-$20
                               │
                               └──SIMILAR_TO──→ (User: Jane)
```

### Component Architecture

```
Components:
├── Neo4jService (connection management)
│   ├── ConnectionPool
│   ├── TransactionManager
│   ├── QueryExecutor
│   └── HealthChecker
│
├── PreferenceGraphBuilder
│   ├── OrderHistoryImporter
│   │   ├── importOrders(userId, orders[])
│   │   ├── importSingleOrder(userId, order)
│   │   └── calculateInitialWeights(orders[])
│   ├── WeightCalculator
│   │   ├── calculateWeight(frequency, recency, rating) -> float
│   │   ├── normalizeWeights(edges[]) -> edges[]
│   │   └── mergeWeights(existing, new) -> float
│   ├── DecayManager
│   │   ├── applyDecay(edges[], halfLife) -> edges[]
│   │   ├── calculateDecayFactor(lastOrdered, halfLife) -> float
│   │   └── pruneDecayedEdges(threshold) -> int
│   └── ExplicitPreferenceHandler
│       ├── addPositivePreference(userId, entityId, type)
│       ├── addNegativePreference(userId, entityId, type)
│       └── getExplicitPreferences(userId) -> Preference[]
│
├── RecommendationEngine
│   ├── TimeAwareRecommender
│   │   ├── getRecommendations(userId, day, time) -> Dish[]
│   │   ├── getTopRestaurants(userId, day, time) -> Restaurant[]
│   │   └── getContextualSuggestions(userId, context) -> Suggestion[]
│   ├── LocationAwareRecommender
│   │   ├── getNearbyRecommendations(userId, lat, lon, radius)
│   │   ├── getPreferredNearby(userId, lat, lon)
│   │   └── getNewNearby(userId, lat, lon) (exploration)
│   ├── CollaborativeFilter
│   │   ├── findSimilarUsers(userId, limit) -> User[]
│   │   ├── getCollaborativeRecommendations(userId) -> Dish[]
│   │   └── calculateUserSimilarity(userA, userB) -> float
│   └── ExplorationRecommender
│       ├── suggestNewCuisines(userId) -> Category[]
│       ├── suggestNewRestaurants(userId) -> Restaurant[]
│       └── diversifyRecommendations(results[], diversityFactor)
│
├── GraphQueryService
│   ├── ContextualPreferenceQuery
│   │   ├── getPreferencesForContext(userId, day, time, location)
│   │   ├── getTopCategories(userId, limit) -> Category[]
│   │   ├── getTopDishes(userId, restaurantId, limit) -> Dish[]
│   │   └── getOrderPatterns(userId) -> Pattern[]
│   ├── PreferenceSummarizer (for LLM context)
│   │   ├── generateSummary(userId) -> string
│   │   ├── generateContextualSummary(userId, context) -> string
│   │   └── generateNaturalLanguagePreferences(userId) -> string
│   └── SimilarUserFinder
│       ├── findByOverlap(userId, minOverlap) -> User[]
│       ├── findByJaccardSimilarity(userId) -> User[]
│       └── findByWeightedSimilarity(userId) -> User[]
│
├── GraphSyncService
│   ├── KafkaConsumer (order events)
│   │   ├── onOrderCompleted(event)
│   │   ├── onOrderRated(event)
│   │   └── onUserPreferenceUpdated(event)
│   ├── BatchRecalculator
│   │   ├── recalculateAllWeights()
│   │   ├── recalculateUserWeights(userId)
│   │   └── updateSimilarityScores()
│   └── GraphPruner
│       ├── pruneStaleEdges(maxAgeDays, minWeight)
│       ├── pruneInactiveUsers(inactiveDays)
│       └── compactGraph()
│
└── GraphAdminService
    ├── DataExporter
    │   ├── exportUserGraph(userId) -> GraphData
    │   ├── exportAnalytics() -> AnalyticsData
    │   └── exportToCSV(query) -> Buffer
    ├── GDPRDeleter
    │   ├── deleteUserData(userId) -> DeletionReport
    │   ├── anonymizeUserData(userId) -> AnonymizationReport
    │   └── generateDeletionAuditLog(userId) -> AuditLog
    └── GraphHealthChecker
        ├── checkConnectivity() -> HealthStatus
        ├── checkDataIntegrity() -> IntegrityReport
        └── getGraphStatistics() -> GraphStats
```

### Weight Calculation Formula

```
weight = frequency_score * recency_score * rating_score * context_multiplier

Where:
- frequency_score = min(order_count / max_orders, 1.0)
- recency_score = exp(-decay_rate * days_since_last_order)
  - decay_rate = ln(2) / half_life_days  (half_life = 30 days)
- rating_score = avg_rating_given / 5.0
- context_multiplier:
  - 1.2 if matches current time context (same day/hour pattern)
  - 1.0 if no specific context
  - 0.8 if opposite context (weekend preference on weekday)
```

### Cypher Query Examples

```cypher
// Get user's top restaurants for Tuesday evening
MATCH (u:User {id: $userId})-[f:FREQUENTS]->(r:Restaurant),
      (u)-[d:ORDERS_ON]->(day:DayOfWeek {name: 'Tuesday'}),
      (u)-[t:ORDERS_AT_TIME]->(time:TimeSlot {range: '18:00-20:00'})
WHERE f.weight > 0.3
RETURN r, f.weight * d.weight * t.weight AS score
ORDER BY score DESC
LIMIT 5

// Find similar users by preference overlap
MATCH (u1:User {id: $userId})-[:LIKES_CATEGORY]->(c:Category)<-[:LIKES_CATEGORY]-(u2:User)
WHERE u1 <> u2
WITH u2, COUNT(c) AS overlap,
     COLLECT(c.name) AS sharedCategories
WHERE overlap >= 3
RETURN u2, overlap, sharedCategories
ORDER BY overlap DESC
LIMIT 10

// Generate preference summary for LLM
MATCH (u:User {id: $userId})-[r:LIKES_CATEGORY]->(c:Category)
WHERE r.weight > 0.5
WITH u, COLLECT({category: c.name, weight: r.weight}) AS topCategories
MATCH (u)-[f:FREQUENTS]->(rest:Restaurant)
WHERE f.weight > 0.5
WITH u, topCategories, COLLECT({name: rest.name, weight: f.weight}) AS topRestaurants
MATCH (u)-[fd:FAVORITE_DISH]->(d:Dish)
WHERE fd.weight > 0.5
RETURN topCategories, topRestaurants,
       COLLECT({dish: d.name, weight: fd.weight}) AS topDishes

// GDPR: Delete all user data
MATCH (u:User {id: $userId})-[r]-()
DELETE r
WITH u
DELETE u
```

---

## Acceptance Criteria

- [ ] Neo4j running in Docker/K8s with proper schema
- [ ] Preference graph auto-built from order history
- [ ] Time-decay working (30-day half-life)
- [ ] Time-aware recommendations (day + hour context)
- [ ] Location-aware recommendations
- [ ] Collaborative filtering between similar users
- [ ] Kafka consumer updating graph on order events
- [ ] Daily batch recalculation job
- [ ] Preference summary generation for LLM context
- [ ] GDPR deletion working (complete user data removal)
- [ ] Graph pruning removing stale edges
- [ ] Performance: preference query < 100ms
- [ ] 85%+ test coverage
- [ ] Load test: 500 preference queries/sec

---

## SDLC Phases

### Phase 1: Planning & Design (Day 1-2)

**Objectives:**
- Finalize graph schema and relationship model
- Design weight calculation algorithms
- Plan data migration from order history
- Define recommendation strategies

**Deliverables:**
- Graph schema document with all node types and relationships
- Weight calculation algorithm specification
- Data migration plan (order history -> graph)
- Recommendation algorithm specifications
- API contract for GraphQueryService
- Cypher query library (documented)

**Activities:**
1. Define complete graph schema:
   - Node labels, properties, and constraints
   - Relationship types, properties, and directions
   - Indexes for common query patterns
2. Design weight calculation:
   - Frequency scoring algorithm
   - Recency decay function (exponential, half-life = 30 days)
   - Rating normalization
   - Context multiplier rules
3. Design recommendation algorithms:
   - Time-aware: Cypher path traversal through day/time nodes
   - Location-aware: Geo-distance with preference boosting
   - Collaborative: Jaccard similarity on category/dish overlap
   - Exploration: Random walk with novelty factor
4. Plan order history migration:
   - Batch processing strategy
   - Initial weight calculation
   - Data validation rules
5. Review with team, gather feedback, finalize design

### Phase 2: Neo4j Infrastructure & Core Service (Day 2-4)

**Objectives:**
- Deploy Neo4j in Docker and Kubernetes
- Implement core Neo4jService with connection management
- Create schema with constraints and indexes

**Deliverables:**
- Neo4j Docker configuration
- Kubernetes StatefulSet for Neo4j
- Neo4jService implementation (connection pool, transactions)
- Schema creation scripts (constraints, indexes)
- Health check endpoint
- Unit tests

**Activities:**
1. Configure Neo4j Docker:
   - Community Edition with APOC plugin
   - Persistent storage volume
   - Memory configuration (heap: 1G, pagecache: 1G)
   - Authentication setup
   - Backup configuration
2. Create Kubernetes StatefulSet:
   - Persistent volume claims (50Gi)
   - Readiness/liveness probes
   - Resource limits (CPU: 2, Memory: 4Gi)
   - Anti-affinity for HA (if clustered)
3. Implement Neo4jService:
   - Connection pool management (neo4j-driver)
   - Transaction wrapper with auto-retry
   - Query executor with parameterized queries
   - Session management
   - Health check (connectivity + schema validation)
4. Create schema initialization:
   ```cypher
   // Constraints
   CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE;
   CREATE CONSTRAINT restaurant_id IF NOT EXISTS FOR (r:Restaurant) REQUIRE r.id IS UNIQUE;
   CREATE CONSTRAINT dish_id IF NOT EXISTS FOR (d:Dish) REQUIRE d.id IS UNIQUE;
   CREATE CONSTRAINT category_name IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE;

   // Indexes
   CREATE INDEX user_location IF NOT EXISTS FOR (u:User) ON (u.latitude, u.longitude);
   CREATE INDEX restaurant_location IF NOT EXISTS FOR (r:Restaurant) ON (r.latitude, r.longitude);
   CREATE INDEX relationship_weight IF NOT EXISTS FOR ()-[r:FREQUENTS]-() ON (r.weight);
   ```
5. Write unit tests for Neo4jService:
   - Connection lifecycle
   - Transaction management
   - Error handling and retries
   - Health check scenarios

### Phase 3: Preference Graph Builder (Day 4-7)

**Objectives:**
- Implement order history import and graph construction
- Build weight calculation engine
- Implement decay management
- Add explicit preference handling

**Deliverables:**
- OrderHistoryImporter (batch + single order)
- WeightCalculator with configurable algorithms
- DecayManager with exponential decay
- ExplicitPreferenceHandler
- Integration tests with Neo4j test container

**Activities:**
1. Implement OrderHistoryImporter:
   - Parse order data: userId, restaurant, dishes, timestamp, rating
   - Create/update User node
   - Create/update Restaurant, Dish, Category nodes
   - Create/update relationships with initial weights
   - Batch import with progress tracking
   - Transaction batching (100 orders per transaction)
2. Implement WeightCalculator:
   ```typescript
   calculateWeight(params: WeightParams): number {
     const frequencyScore = Math.min(params.orderCount / MAX_ORDERS, 1.0);
     const daysSinceLastOrder = daysBetween(params.lastOrdered, new Date());
     const decayRate = Math.LN2 / HALF_LIFE_DAYS; // 30 days
     const recencyScore = Math.exp(-decayRate * daysSinceLastOrder);
     const ratingScore = (params.avgRating || 3.0) / 5.0;
     const contextMultiplier = this.getContextMultiplier(params.context);
     return frequencyScore * recencyScore * ratingScore * contextMultiplier;
   }
   ```
3. Implement weight normalization:
   - Normalize all outgoing relationship weights per user to sum to 1.0 within each relationship type
   - Re-normalize after any weight update
4. Implement DecayManager:
   - Apply exponential decay to all relationship weights
   - Configurable half-life (default: 30 days)
   - Prune edges below threshold (default: 0.05)
   - Track pruned edges for analytics
5. Implement ExplicitPreferenceHandler:
   - Handle "I like X" (boost weight by 0.3)
   - Handle "I don't like X" (set negative weight, -1.0)
   - Handle "I'm vegetarian" (create dietary preference node)
   - Handle price preferences ("I prefer budget meals")
6. Implement context-aware weight adjustment:
   - Weekday vs weekend patterns
   - Lunch vs dinner patterns
   - Seasonal patterns (if data available)
7. Write integration tests:
   - Import sample order history (100 orders)
   - Verify graph structure
   - Verify weight calculations
   - Verify decay application
   - Verify pruning

### Phase 4: Recommendation Engine (Day 7-10)

**Objectives:**
- Implement time-aware and location-aware recommenders
- Build collaborative filtering
- Add exploration recommendations
- Integrate with LLM context generation

**Deliverables:**
- TimeAwareRecommender
- LocationAwareRecommender
- CollaborativeFilter
- ExplorationRecommender
- PreferenceSummarizer (natural language output for LLM)
- Integration tests
- Performance benchmarks

**Activities:**
1. Implement TimeAwareRecommender:
   - Input: userId, dayOfWeek, hourOfDay
   - Query: traverse User -> DayOfWeek -> TimeSlot -> historical orders
   - Score: combine time-context weight with dish/restaurant weight
   - Output: ranked list of dishes and restaurants
   - Cypher query with weighted path scoring
2. Implement LocationAwareRecommender:
   - Input: userId, latitude, longitude, radius (km)
   - Query: find preferred restaurants within radius
   - Score: preference weight * (1 / distance_factor)
   - Include restaurants user hasn't tried but similar users like
   - Geo-spatial index for efficient querying
3. Implement CollaborativeFilter:
   - Find similar users via Jaccard similarity on category preferences
   - Minimum overlap threshold: 3 shared categories
   - Get dishes liked by similar users but not by target user
   - Weight by similarity score
   - Update similarity scores daily (batch job)
4. Implement ExplorationRecommender:
   - Identify categories the user hasn't tried
   - Rank unexplored categories by popularity among similar users
   - Add diversity factor to prevent echo chamber
   - "You like Indian food, you might also like Thai" logic
5. Implement PreferenceSummarizer:
   - Generate natural language preference summary:
     ```
     "John typically orders Indian food, especially biryani and
     butter chicken, on weekday evenings around 7-8pm. He frequents
     Spice Garden and Curry House. He prefers non-vegetarian dishes
     in the $10-$20 price range. Recently, he's been exploring
     Thai cuisine."
     ```
   - Contextual summary (include current day/time relevance)
   - Compact format for token-efficient LLM prompts
6. Implement budget-aware filtering:
   - Filter recommendations by user's price range preference
   - Include slightly above-budget options if highly relevant
7. Write integration tests:
   - Time-aware recommendations accuracy
   - Location-aware recommendations correctness
   - Collaborative filtering quality
   - Preference summary generation
8. Performance benchmarks:
   - Recommendation query < 200ms at p95
   - Preference query < 100ms at p95

### Phase 5: Real-time Sync & Maintenance (Day 10-12)

**Objectives:**
- Implement Kafka consumer for real-time graph updates
- Build batch recalculation job
- Implement graph pruning and maintenance
- Add GDPR compliance features

**Deliverables:**
- Kafka consumer for order events
- Batch recalculation cron job
- Graph pruner
- GDPR data deletion service
- Data export service
- Integration tests

**Activities:**
1. Implement Kafka consumer:
   - Subscribe to order.completed, order.rated, user.preference.updated topics
   - On order.completed:
     - Update FREQUENTS relationship (weight, count, last_visit)
     - Update FAVORITE_DISH relationships
     - Update ORDERS_ON and ORDERS_AT_TIME
     - Update LIKES_CATEGORY
   - On order.rated:
     - Update rating component of weights
   - On user.preference.updated:
     - Handle explicit preference changes
   - Error handling: dead letter queue for failed events
   - Idempotency: check event ID before processing
2. Implement batch recalculation:
   - Daily cron job (2 AM)
   - Recalculate all weights with fresh decay
   - Update similarity scores between users
   - Generate statistics report
   - Configurable scope: all users or specific segments
3. Implement graph pruner:
   - Remove edges with weight < 0.05 and age > 90 days
   - Remove orphaned nodes (no relationships)
   - Compact graph (merge duplicate nodes)
   - Run weekly as cron job
   - Report pruning statistics
4. Implement GDPR data deletion:
   - Delete ALL nodes and relationships for a user
   - Cascade: remove user from similarity graphs
   - Generate deletion audit log
   - Verify complete deletion (no orphaned data)
   - Support anonymization as alternative to deletion
5. Implement data export:
   - Export user preference graph as JSON
   - Export analytics data as CSV
   - Export graph visualization data (for admin dashboard)
6. Write integration tests:
   - Kafka consumer event processing
   - Batch recalculation accuracy
   - Graph pruning correctness
   - GDPR deletion completeness

### Phase 6: Testing, Optimization & Documentation (Day 12-14)

**Objectives:**
- Comprehensive testing of all components
- Performance optimization and load testing
- Documentation and operational guides

**Deliverables:**
- Full test suite (85%+ coverage)
- Load test results (500 queries/sec)
- Performance optimization report
- Grafana dashboard for graph metrics
- API documentation
- Operations runbook

**Activities:**
1. Unit test completion:
   - All services at 85%+ coverage
   - Mock Neo4j driver for unit tests
   - Test weight calculation edge cases
   - Test decay with various time ranges
2. Integration testing:
   - Use Neo4j test container for integration tests
   - Full workflow: order -> Kafka -> graph update -> recommendation
   - Multi-user scenarios with collaborative filtering
   - Concurrent update scenarios
   - Failure scenarios (Neo4j down, Kafka lag)
3. Load testing:
   - Target: 500 preference queries/sec
   - Measure: query latency, throughput, Neo4j resource usage
   - Profile: Cypher query execution plans
   - Identify: slow queries and optimize with indexes
4. Performance optimization:
   - Cypher query optimization (EXPLAIN/PROFILE)
   - Index tuning for common query patterns
   - Connection pool sizing
   - Result caching for hot queries (Redis layer)
   - Batch write optimization
5. Create Grafana dashboard:
   - Query latency by type
   - Graph size (nodes, relationships)
   - Kafka consumer lag
   - Cache hit rate for recommendation cache
   - Weight distribution histograms
   - Pruning statistics
6. Write documentation:
   - API documentation for all services
   - Graph schema reference
   - Cypher query cookbook
   - Configuration guide
   - Operations runbook (backup, restore, scaling, migration)
   - GDPR compliance guide
