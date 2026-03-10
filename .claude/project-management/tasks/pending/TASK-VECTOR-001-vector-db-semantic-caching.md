# TASK-VECTOR-001: Vector Database & Semantic Caching System

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 14 days
**Component:** Backend / LLM Integration
**Depends On:** TASK-DB-001 (base infrastructure)
**Blocks:** LLM cost optimization, intent caching
**Related Requirements:** FR-DATA-VECTOR-001

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

Implement a vector database (Qdrant/Weaviate) for semantic caching of user prompts, LLM intent mappings, workflow templates, and search embeddings. This system will dramatically reduce LLM API calls and token usage by caching prompt-to-intent mappings and providing semantic similarity search for previously processed queries.

---

## Requirements

### Functional Requirements

1. **Vector Database Setup (Qdrant)**
   - Self-hosted Qdrant instance in Docker/K8s
   - Collections: prompt_intents, workflow_templates, search_embeddings, dish_embeddings, restaurant_embeddings
   - Configurable embedding dimensions (1536 for OpenAI, 1024 for Claude, 768 for Gemini)
   - HNSW indexing for fast approximate nearest neighbor search
   - Multi-tenancy support per user/restaurant

2. **Embedding Generation**
   - Multi-provider embedding support:
     - OpenAI text-embedding-3-small (default)
     - Claude embedding via Anthropic API
     - Gemini embedding-001
     - Local model fallback (all-MiniLM-L6-v2)
   - Batch embedding pipeline for bulk indexing
   - Incremental embedding on data changes
   - Embedding versioning and migration

3. **Semantic Cache Layer**
   - Prompt deduplication via cosine similarity (threshold: 0.92)
   - Cache hierarchy: exact match (Redis) -> semantic match (Qdrant) -> LLM call
   - TTL-based cache invalidation (24h for intents, 1h for search results)
   - Cache warming on service startup
   - Cache hit/miss metrics
   - User-specific cache isolation
   - Cache size management (max 100K entries per collection)

4. **Intent Caching Workflow**
   - Hash incoming prompt for exact match check (Redis)
   - If miss, generate embedding and search Qdrant (top-5, threshold 0.92)
   - If semantic match found, return cached intent + workflow
   - If no match, call LLM, cache result in both Redis and Qdrant
   - Track cache savings (tokens saved, cost saved, latency saved)

5. **Search Embedding**
   - Pre-compute embeddings for all restaurants and dishes
   - Semantic search: "spicy chicken near me" -> relevant dishes
   - Re-rank search results using embedding similarity
   - Hybrid search: keyword (Elasticsearch) + semantic (Qdrant) fusion

6. **Workflow Template Caching**
   - Cache common workflow patterns as templates
   - Template matching for similar user requests
   - Template parameterization (fill in user-specific details)
   - Template versioning and A/B testing

### Non-Functional Requirements

1. **Performance:**
   - Semantic search latency < 50ms at p95
   - Embedding generation < 100ms per query
   - Cache lookup (Redis exact match) < 1ms
   - Cache lookup (Qdrant semantic match) < 10ms
   - Batch embedding: 1000 items/minute

2. **Scalability:**
   - Support 100K+ cached entries per collection
   - Handle 1000 queries/sec with 60%+ cache hit rate
   - Horizontal scaling for Qdrant (sharding)

3. **Reliability:**
   - Graceful degradation if Qdrant is unavailable (fall through to LLM)
   - Graceful degradation if embedding provider is unavailable (use fallback)
   - Data durability with Qdrant snapshots

4. **Observability:**
   - Cache hit/miss rate metrics
   - Token savings metrics (cost dashboard)
   - Latency histograms per cache tier
   - Collection size and growth tracking

---

## Architecture

### Cache Hierarchy

```
Request -> Redis (exact hash) -> Qdrant (semantic similarity) -> LLM (new request)
              | hit                    | hit                       | result
           Return cached            Return cached              Cache in both
           (< 1ms)                  (< 10ms)                   (200-2000ms)
```

### Component Architecture

```
Components:
├── EmbeddingService
│   ├── OpenAIEmbedder
│   │   └── text-embedding-3-small (1536 dimensions)
│   ├── ClaudeEmbedder
│   │   └── Anthropic embedding API (1024 dimensions)
│   ├── GeminiEmbedder
│   │   └── embedding-001 (768 dimensions)
│   └── LocalEmbedder (fallback)
│       └── all-MiniLM-L6-v2 (384 dimensions)
│
├── VectorStore (Qdrant client)
│   ├── CollectionManager
│   │   ├── createCollection(name, dimensions, distance)
│   │   ├── deleteCollection(name)
│   │   └── listCollections()
│   ├── PointManager (CRUD)
│   │   ├── upsertPoints(collection, points[])
│   │   ├── deletePoints(collection, ids[])
│   │   └── getPoints(collection, ids[])
│   ├── SearchEngine (ANN)
│   │   ├── search(collection, vector, limit, threshold)
│   │   ├── searchWithFilter(collection, vector, filter, limit)
│   │   └── recommend(collection, positive[], negative[])
│   └── FilterBuilder
│       ├── must(conditions[])
│       ├── should(conditions[])
│       └── mustNot(conditions[])
│
├── SemanticCache
│   ├── CacheOrchestrator
│   │   ├── get(prompt, userId) -> CacheResult | null
│   │   ├── set(prompt, result, userId, ttl)
│   │   └── invalidate(patterns[])
│   ├── SimilarityScorer
│   │   ├── cosineSimilarity(vectorA, vectorB)
│   │   └── isAboveThreshold(score, threshold)
│   ├── CacheInvalidator
│   │   ├── invalidateByTTL()
│   │   ├── invalidateByPattern(pattern)
│   │   └── invalidateByUser(userId)
│   └── MetricsTracker
│       ├── recordHit(tier, latency)
│       ├── recordMiss(latency)
│       └── getStats() -> CacheStats
│
├── IntentCache
│   ├── PromptHasher
│   │   ├── hash(prompt) -> string
│   │   └── normalize(prompt) -> string
│   ├── IntentMatcher
│   │   ├── matchExact(hash) -> Intent | null
│   │   ├── matchSemantic(embedding) -> Intent | null
│   │   └── cacheIntent(prompt, intent)
│   └── WorkflowTemplateCache
│       ├── findTemplate(intent) -> Template | null
│       ├── parameterize(template, context) -> Workflow
│       └── cacheTemplate(intent, workflow)
│
└── SearchEmbedding
    ├── DishEmbedder
    │   ├── embedDish(dish) -> vector
    │   ├── batchEmbedDishes(dishes[]) -> vectors[]
    │   └── updateDishEmbedding(dishId)
    ├── RestaurantEmbedder
    │   ├── embedRestaurant(restaurant) -> vector
    │   ├── batchEmbedRestaurants(restaurants[]) -> vectors[]
    │   └── updateRestaurantEmbedding(restaurantId)
    ├── HybridSearchFusion
    │   ├── keywordSearch(query) -> ScoredResult[]
    │   ├── semanticSearch(query) -> ScoredResult[]
    │   └── fuseResults(keyword[], semantic[], weights) -> FusedResult[]
    └── ReRanker
        ├── reRank(results[], query) -> RankedResult[]
        └── crossEncoderScore(query, document) -> float
```

### Data Flow Diagram

```
User Prompt: "I want spicy biryani for dinner"
    │
    ▼
[1] PromptHasher.normalize()
    → "want spicy biryani dinner"
    │
    ▼
[2] PromptHasher.hash()
    → "sha256:abc123..."
    │
    ▼
[3] Redis.get("intent:sha256:abc123")
    → MISS
    │
    ▼
[4] EmbeddingService.embed("want spicy biryani dinner")
    → [0.123, -0.456, 0.789, ...] (1536 dims)
    │
    ▼
[5] Qdrant.search("prompt_intents", vector, limit=5, threshold=0.92)
    → MATCH (similarity: 0.94, cached prompt: "order spicy biryani tonight")
    │
    ▼
[6] Return cached intent: { type: "FOOD_ORDER", cuisine: "Indian", dish: "biryani", ... }
    │
    ▼
[7] MetricsTracker.recordHit("qdrant", latencyMs=8)
```

### Collection Schema

```
Collection: prompt_intents
├── Vector: embedding (1536 dims, cosine distance)
├── Payload:
│   ├── prompt_hash: string (SHA-256)
│   ├── original_prompt: string
│   ├── normalized_prompt: string
│   ├── intent: object (cached LLM response)
│   ├── workflow_id: string (optional)
│   ├── user_id: string (for isolation)
│   ├── hit_count: int
│   ├── created_at: datetime
│   ├── expires_at: datetime
│   └── embedding_model: string

Collection: dish_embeddings
├── Vector: embedding (1536 dims, cosine distance)
├── Payload:
│   ├── dish_id: string
│   ├── dish_name: string
│   ├── description: string
│   ├── cuisine: string
│   ├── category: string
│   ├── price: float
│   ├── restaurant_id: string
│   ├── dietary_tags: string[]
│   ├── ingredients: string[]
│   └── updated_at: datetime

Collection: restaurant_embeddings
├── Vector: embedding (1536 dims, cosine distance)
├── Payload:
│   ├── restaurant_id: string
│   ├── name: string
│   ├── description: string
│   ├── cuisines: string[]
│   ├── location: geo_point
│   ├── rating: float
│   ├── price_range: string
│   └── updated_at: datetime
```

---

## Acceptance Criteria

- [ ] Qdrant running in Docker/K8s with 5 collections
- [ ] 3 embedding providers working with fallback
- [ ] Semantic cache with 0.92 similarity threshold
- [ ] Cache hierarchy: Redis -> Qdrant -> LLM
- [ ] Intent caching reducing LLM calls by 40%+
- [ ] Search embedding for restaurants and dishes
- [ ] Hybrid search (keyword + semantic) fusion
- [ ] Cache metrics dashboard (hit rate, savings)
- [ ] TTL-based invalidation working
- [ ] Batch embedding pipeline for bulk data
- [ ] Performance: semantic search < 50ms p95
- [ ] 85%+ test coverage
- [ ] Load test: 1000 queries/sec with 60%+ cache hit

---

## SDLC Phases

### Phase 1: Planning & Design (Day 1-2)

**Objectives:**
- Finalize vector database choice and configuration
- Design collection schemas and indexing strategy
- Plan embedding provider integration
- Design cache hierarchy and invalidation strategy

**Deliverables:**
- Vector database architecture document
- Collection schema definitions
- Embedding provider comparison matrix
- Cache strategy document
- API contract for SemanticCache service

**Activities:**
1. Evaluate Qdrant vs Weaviate vs Pinecone for self-hosted deployment
2. Define collection schemas with payload structures
3. Benchmark embedding providers (latency, quality, cost)
4. Design cache invalidation rules per collection type
5. Plan data migration strategy for existing search data
6. Define metrics and monitoring requirements
7. Review with team and finalize architecture

### Phase 2: Vector Database Infrastructure (Day 2-4)

**Objectives:**
- Deploy Qdrant in Docker and Kubernetes
- Create all collections with proper indexing
- Implement VectorStore service with full CRUD operations

**Deliverables:**
- Qdrant Docker configuration
- Kubernetes manifests for Qdrant (StatefulSet)
- VectorStore service implementation
- CollectionManager with schema management
- PointManager with CRUD operations
- SearchEngine with ANN search
- FilterBuilder for complex queries
- Unit tests for all VectorStore components

**Activities:**
1. Configure Qdrant Docker image:
   - Persistent storage volume
   - HNSW index configuration (m=16, ef_construct=100)
   - Memory limits and optimization
   - Backup/snapshot configuration
2. Create Kubernetes StatefulSet for Qdrant:
   - Persistent volume claims
   - Health check endpoints
   - Resource limits
3. Implement CollectionManager:
   - Create/delete collections with configurable dimensions
   - Schema migration support
   - Collection statistics
4. Implement PointManager:
   - Batch upsert with chunking (500 points per batch)
   - Delete by ID or filter
   - Get points by ID
5. Implement SearchEngine:
   - ANN search with configurable limit and threshold
   - Filtered search with complex conditions
   - Recommendation queries (positive/negative examples)
6. Implement FilterBuilder:
   - Must/should/must_not conditions
   - Range filters, keyword filters, geo filters
7. Write comprehensive unit tests (85%+ coverage)

### Phase 3: Embedding Service (Day 4-6)

**Objectives:**
- Implement multi-provider embedding generation
- Set up fallback chain for reliability
- Implement batch embedding pipeline

**Deliverables:**
- EmbeddingService with provider abstraction
- OpenAIEmbedder implementation
- ClaudeEmbedder implementation
- GeminiEmbedder implementation
- LocalEmbedder (fallback) implementation
- Batch embedding pipeline
- Embedding versioning system
- Unit tests for all embedding components

**Activities:**
1. Create EmbeddingService interface:
   ```typescript
   interface EmbeddingService {
     embed(text: string): Promise<number[]>;
     embedBatch(texts: string[]): Promise<number[][]>;
     getDimensions(): number;
     getModelName(): string;
   }
   ```
2. Implement OpenAIEmbedder:
   - text-embedding-3-small (1536 dimensions)
   - Rate limiting and retry logic
   - Token counting and cost tracking
3. Implement ClaudeEmbedder:
   - Anthropic embedding API (1024 dimensions)
   - Request/response handling
4. Implement GeminiEmbedder:
   - embedding-001 (768 dimensions)
   - Request/response handling
5. Implement LocalEmbedder:
   - all-MiniLM-L6-v2 via ONNX runtime (384 dimensions)
   - Zero external API dependency
   - Suitable for development and fallback
6. Implement provider fallback chain:
   - Primary -> Secondary -> Local
   - Circuit breaker pattern per provider
   - Fallback latency tracking
7. Implement batch embedding pipeline:
   - Chunked processing (100 items per batch)
   - Progress tracking and resumption
   - Error handling per item (skip failed, continue)
8. Implement embedding versioning:
   - Track model version per embedding
   - Migration support when model changes
   - Dual-write during migration period
9. Write unit tests with mocked providers

### Phase 4: Semantic Cache Implementation (Day 6-9)

**Objectives:**
- Implement the three-tier cache hierarchy
- Build intent caching workflow
- Implement cache invalidation and metrics

**Deliverables:**
- CacheOrchestrator with three-tier lookup
- PromptHasher for exact matching
- IntentMatcher for semantic matching
- CacheInvalidator with TTL and pattern support
- MetricsTracker with dashboard data
- WorkflowTemplateCache
- Integration tests for cache hierarchy
- Performance benchmarks

**Activities:**
1. Implement PromptHasher:
   - Normalize prompt (lowercase, strip whitespace, remove stopwords)
   - Generate SHA-256 hash for exact matching
   - Store hash -> result mapping in Redis
2. Implement CacheOrchestrator:
   ```typescript
   async get(prompt: string, userId: string): Promise<CacheResult | null> {
     // Tier 1: Exact match in Redis
     const hash = this.promptHasher.hash(prompt);
     const exactMatch = await this.redis.get(`intent:${hash}`);
     if (exactMatch) {
       this.metrics.recordHit('redis', elapsed);
       return JSON.parse(exactMatch);
     }

     // Tier 2: Semantic match in Qdrant
     const embedding = await this.embeddingService.embed(prompt);
     const semanticMatch = await this.vectorStore.search(
       'prompt_intents',
       embedding,
       { limit: 5, threshold: 0.92, filter: { user_id: userId } }
     );
     if (semanticMatch.length > 0) {
       this.metrics.recordHit('qdrant', elapsed);
       return semanticMatch[0].payload.intent;
     }

     // Tier 3: No cache hit
     this.metrics.recordMiss(elapsed);
     return null;
   }
   ```
3. Implement cache set with dual-write:
   - Write to Redis (with TTL)
   - Write to Qdrant (with expiry payload)
   - Async write (don't block response)
4. Implement CacheInvalidator:
   - TTL-based: cron job to prune expired entries
   - Pattern-based: invalidate by collection/filter
   - User-based: invalidate all cache for a user
   - Collection-size based: evict LRU when > 100K entries
5. Implement MetricsTracker:
   - Hit/miss counts per tier
   - Latency histograms per tier
   - Token savings calculation
   - Cost savings calculation
   - Cache size tracking
6. Implement WorkflowTemplateCache:
   - Store workflow patterns as templates
   - Match incoming intents to templates
   - Parameterize templates with user context
   - Version templates for A/B testing
7. Write integration tests:
   - Full cache hierarchy flow
   - Cache invalidation scenarios
   - Concurrent access patterns
   - Failure scenarios (Redis down, Qdrant down)

### Phase 5: Search Embedding & Hybrid Search (Day 9-12)

**Objectives:**
- Pre-compute embeddings for all dishes and restaurants
- Implement hybrid search with score fusion
- Build re-ranking pipeline

**Deliverables:**
- DishEmbedder with batch processing
- RestaurantEmbedder with batch processing
- HybridSearchFusion (BM25 + cosine)
- ReRanker for result quality
- Search API integration
- Integration tests
- Performance benchmarks

**Activities:**
1. Implement DishEmbedder:
   - Generate embedding text: `{dish_name} {description} {cuisine} {ingredients}`
   - Batch embed all dishes on startup / data change
   - Incremental update on dish CRUD events
   - Store in dish_embeddings collection
2. Implement RestaurantEmbedder:
   - Generate embedding text: `{name} {description} {cuisines} {location}`
   - Batch embed all restaurants
   - Incremental update on restaurant changes
   - Store in restaurant_embeddings collection
3. Implement HybridSearchFusion:
   - Keyword search via Elasticsearch (BM25 scoring)
   - Semantic search via Qdrant (cosine similarity)
   - Reciprocal Rank Fusion (RRF) algorithm:
     ```
     RRF_score = sum(1 / (k + rank_i)) for each ranking system
     ```
   - Configurable weights: keyword_weight + semantic_weight = 1.0
   - Default: 0.4 keyword + 0.6 semantic
4. Implement ReRanker:
   - Cross-encoder scoring for top-N results
   - Re-order based on cross-encoder score
   - Configurable re-rank depth (default: top 20)
5. Integrate with search-orchestrator:
   - Replace pure keyword search with hybrid search
   - Add semantic search endpoint
   - Maintain backward compatibility
6. Write integration tests:
   - Hybrid search accuracy tests
   - Re-ranking quality tests
   - Performance benchmarks (< 50ms p95)

### Phase 6: Testing, Optimization & Documentation (Day 12-14)

**Objectives:**
- Comprehensive testing of all components
- Performance optimization and load testing
- Documentation and operational guides

**Deliverables:**
- Full test suite (85%+ coverage)
- Load test results (1000 queries/sec)
- Performance optimization report
- Cache metrics dashboard (Grafana)
- API documentation
- Operations runbook

**Activities:**
1. Unit test completion:
   - All services at 85%+ coverage
   - Edge cases: empty collections, provider failures, concurrent writes
   - Boundary conditions: threshold edge cases, collection limits
2. Integration testing:
   - Full flow: prompt -> cache lookup -> embedding -> search -> cache write
   - Multi-provider failover
   - Cache invalidation correctness
   - Data consistency across tiers
3. Load testing:
   - Target: 1000 queries/sec
   - Measure: cache hit rate, latency per tier, throughput
   - Profile: CPU/memory usage under load
   - Identify: bottlenecks and optimize
4. Performance optimization:
   - Qdrant HNSW tuning (ef, m parameters)
   - Redis pipeline for batch operations
   - Connection pooling optimization
   - Embedding batch size tuning
5. Create Grafana dashboard:
   - Cache hit/miss rates per tier
   - Latency histograms
   - Token/cost savings over time
   - Collection sizes and growth
   - Provider health and failover events
6. Write documentation:
   - API documentation for all services
   - Configuration guide
   - Operations runbook (backup, restore, scaling)
   - Troubleshooting guide
