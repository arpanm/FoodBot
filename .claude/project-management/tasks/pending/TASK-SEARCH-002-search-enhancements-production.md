# TASK-SEARCH-002: Production Search Enhancements

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P1 (High)
**Estimated Effort:** 22 days
**Component:** Search Orchestrator / Elasticsearch
**Depends On:** TASK-VECTOR-001 (embeddings for semantic search)
**Blocks:** Personalized experience, diet/party planner search
**Related Requirements:** FR-CA-SEARCH-001, search-requirements.md

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

Implement production-grade search enhancements including personalized ranking, semantic search with embeddings, voice search, autocomplete, typo tolerance, faceted filtering, search analytics, geo-spatial search, and multi-language support. This task transforms the basic search functionality into a comprehensive, intelligent search system that understands user intent, personalizes results, and continuously improves through analytics.

---

## Requirements

### Functional Requirements

1. **Personalized Search Ranking**
   - User preference-based boosting (from Neo4j graph)
   - Order history influence on ranking
   - Time-of-day contextual ranking
   - Location-based proximity boosting
   - A/B test different ranking algorithms

2. **Semantic Search with Embeddings**
   - Natural language queries: "something spicy for lunch"
   - Ingredient-based search: "gluten-free desserts"
   - Cuisine similarity: dishes similar to specific items
   - Hybrid scoring: BM25 (keyword) + cosine similarity (semantic)
   - Query expansion using LLM

3. **Autocomplete & Suggestions**
   - Prefix-based autocomplete (< 50ms)
   - Popular search suggestions
   - Personalized suggestions based on history
   - "Did you mean?" for typos
   - Trending searches in user's area

4. **Advanced Filtering**
   - Multi-facet filters: cuisine, price range, rating, delivery time, veg/non-veg, dietary restrictions
   - Dynamic filter counts (show available items per filter)
   - Geo-spatial filtering (within X km)
   - Availability filtering (open now, open at time X)
   - Promotion/discount filtering
   - Allergen exclusion filtering

5. **Voice Search**
   - Web Speech API integration in frontend
   - Speech-to-text processing
   - Intent extraction from voice query
   - Multi-language voice support (English, Hindi)
   - Voice search analytics

6. **Search Analytics**
   - Search query logging and analysis
   - Click-through rate tracking
   - Search-to-order conversion rate
   - Zero-result query analysis
   - Popular search terms dashboard
   - Search quality scoring

### Non-Functional Requirements

1. **Performance:**
   - Search response time < 200ms at p95
   - Autocomplete response time < 50ms at p95
   - Facet aggregation < 100ms at p95
   - Voice-to-search pipeline < 500ms total

2. **Scalability:**
   - Handle 2000 search queries/sec
   - Support 1M+ indexed documents (dishes + restaurants)
   - Autocomplete with 500K+ terms

3. **Reliability:**
   - Fallback to keyword-only search if semantic search fails
   - Graceful degradation if Neo4j is unavailable (skip personalization)
   - Circuit breaker for each search component

4. **Quality:**
   - Typo tolerance: correct up to 2 character edits
   - Relevance scoring: NDCG@10 > 0.7
   - Zero-result rate < 5%

5. **Internationalization:**
   - English and Hindi search support
   - Language detection on query
   - Transliteration support (Hindi written in English script)

---

## Architecture

### Search Pipeline

```
Query -> Autocomplete -> Spell Check -> Query Understanding (LLM/Rules)
  -> Semantic Embedding -> Hybrid Search (ES + Qdrant)
  -> Personalized Ranking (Neo4j boost) -> Facet Aggregation
  -> Result Assembly -> Response
```

### Detailed Pipeline Flow

```
Step 1: Query Preprocessing
  Input: raw query string + user context
  ├── Language detection
  ├── Transliteration (if needed)
  ├── Spell correction
  └── Output: clean query

Step 2: Query Understanding
  Input: clean query
  ├── Intent classification (search, filter, navigate)
  ├── Entity extraction (cuisine, dish, restaurant, location)
  ├── Query expansion (synonyms, related terms)
  └── Output: structured query + entities

Step 3: Hybrid Search Execution
  Input: structured query + embedding
  ├── Keyword search (Elasticsearch BM25)
  ├── Semantic search (Qdrant cosine similarity)
  ├── Geo-spatial filtering (Elasticsearch)
  ├── Facet aggregation (Elasticsearch)
  └── Output: raw results from both engines

Step 4: Score Fusion
  Input: keyword results + semantic results
  ├── Reciprocal Rank Fusion (RRF)
  ├── Weight: 0.4 keyword + 0.6 semantic
  └── Output: fused and ranked results

Step 5: Personalized Re-ranking
  Input: fused results + user preferences (Neo4j)
  ├── Preference boosting (frequency, recency, rating)
  ├── Time-of-day contextual boosting
  ├── Location proximity boosting
  ├── Dietary restriction filtering
  └── Output: personalized ranked results

Step 6: Result Assembly
  Input: ranked results
  ├── Fetch full entities from database
  ├── Add promotional badges/tags
  ├── Add delivery time estimates
  ├── Format facet counts
  └── Output: final search response
```

### Component Architecture

```
Components:
├── QueryProcessor
│   ├── Autocompleter (ES completion suggester)
│   │   ├── prefixSuggest(query, limit) -> Suggestion[]
│   │   ├── popularSuggestions(location) -> Suggestion[]
│   │   ├── personalizedSuggestions(userId) -> Suggestion[]
│   │   └── trendingSuggestions(location) -> Suggestion[]
│   ├── SpellChecker (ES did-you-mean)
│   │   ├── check(query) -> Correction | null
│   │   ├── suggestAlternatives(query) -> string[]
│   │   └── autoCorrect(query) -> string
│   ├── QueryUnderstanding (LLM + rules)
│   │   ├── classifyIntent(query) -> SearchIntent
│   │   ├── extractEntities(query) -> Entity[]
│   │   ├── detectLanguage(query) -> Language
│   │   └── transliterate(query, from, to) -> string
│   └── QueryExpander
│       ├── expandWithSynonyms(query) -> string
│       ├── expandWithLLM(query) -> string
│       └── expandWithRelatedTerms(query) -> string
│
├── HybridSearchEngine
│   ├── KeywordSearcher (ES BM25)
│   │   ├── search(query, filters, page) -> ScoredResult[]
│   │   ├── multiMatch(query, fields[], boosts[]) -> ScoredResult[]
│   │   └── fuzzySearch(query, fuzziness) -> ScoredResult[]
│   ├── SemanticSearcher (Qdrant cosine)
│   │   ├── search(embedding, filters, limit) -> ScoredResult[]
│   │   ├── searchSimilar(itemId, limit) -> ScoredResult[]
│   │   └── searchByExample(text, limit) -> ScoredResult[]
│   ├── GeoSpatialSearcher (ES geo_distance)
│   │   ├── searchWithinRadius(lat, lon, radius, query) -> ScoredResult[]
│   │   ├── searchWithinBbox(topLeft, bottomRight, query) -> ScoredResult[]
│   │   └── sortByDistance(lat, lon, results) -> ScoredResult[]
│   └── ScoreFusion (RRF algorithm)
│       ├── fuse(keywordResults, semanticResults, weights) -> FusedResult[]
│       ├── reciprocalRankFusion(rankings[], k) -> FusedResult[]
│       └── linearCombination(scores[], weights) -> float
│
├── PersonalizedRanker
│   ├── PreferenceBooster (Neo4j)
│   │   ├── getBoostFactors(userId, context) -> BoostMap
│   │   ├── applyBoosts(results, boostMap) -> BoostedResult[]
│   │   └── cacheBoosts(userId, boostMap, ttl)
│   ├── ContextualRanker (time, location)
│   │   ├── applyTimeContext(results, dayOfWeek, hour) -> Result[]
│   │   ├── applyLocationContext(results, lat, lon) -> Result[]
│   │   └── applySeasonalContext(results, month) -> Result[]
│   ├── PopularityBooster
│   │   ├── getPopularityScores(area) -> ScoreMap
│   │   ├── applyPopularityBoost(results, scores) -> Result[]
│   │   └── calculateTrendingScore(itemId) -> float
│   └── ABTestRouter
│       ├── assignVariant(userId, experimentId) -> Variant
│       ├── getRankingAlgorithm(variant) -> RankingFn
│       └── trackExperimentResult(userId, variant, action)
│
├── FacetEngine
│   ├── DynamicFacetBuilder
│   │   ├── buildFacets(query, filters) -> Facet[]
│   │   ├── getCuisineFacets(query) -> FacetBucket[]
│   │   ├── getPriceRangeFacets(query) -> FacetBucket[]
│   │   ├── getRatingFacets(query) -> FacetBucket[]
│   │   ├── getDietaryFacets(query) -> FacetBucket[]
│   │   └── getDeliveryTimeFacets(query) -> FacetBucket[]
│   ├── FilterApplier
│   │   ├── applyFilters(query, filters) -> ESQuery
│   │   ├── buildBoolQuery(filters) -> BoolQuery
│   │   └── buildRangeFilter(field, min, max) -> RangeQuery
│   └── FacetCounter
│       ├── countPerFacet(query) -> FacetCount[]
│       └── updateCountsWithFilters(facets, activeFilters) -> FacetCount[]
│
├── VoiceSearchModule
│   ├── SpeechToText (Web Speech API)
│   │   ├── startListening(language) -> stream
│   │   ├── stopListening() -> transcript
│   │   └── getInterimResults() -> string
│   ├── VoiceIntentExtractor
│   │   ├── extractIntent(transcript) -> SearchIntent
│   │   ├── handleAmbiguity(transcript) -> Clarification
│   │   └── confirmIntent(intent) -> boolean
│   └── VoiceResponseFormatter
│       ├── formatForVoice(results) -> string
│       └── speakResults(text) -> void
│
└── AnalyticsCollector
    ├── QueryLogger
    │   ├── logQuery(query, userId, results, latency)
    │   ├── logZeroResults(query, userId)
    │   └── getQueryStats(timeRange) -> QueryStats
    ├── ClickTracker
    │   ├── trackClick(queryId, resultId, position)
    │   ├── getCTR(queryPattern) -> float
    │   └── getClickDistribution(queryId) -> Distribution
    ├── ConversionTracker
    │   ├── trackSearchToOrder(queryId, orderId)
    │   ├── getConversionRate(timeRange) -> float
    │   └── getTopConvertingQueries(limit) -> Query[]
    └── AnalyticsDashboard
        ├── getSearchOverview(timeRange) -> Overview
        ├── getTopQueries(timeRange, limit) -> Query[]
        ├── getZeroResultQueries(timeRange) -> Query[]
        ├── getSearchQualityMetrics() -> QualityMetrics
        └── getABTestResults(experimentId) -> TestResults
```

### Elasticsearch Index Schema

```json
{
  "dishes": {
    "mappings": {
      "properties": {
        "id": { "type": "keyword" },
        "name": {
          "type": "text",
          "analyzer": "custom_analyzer",
          "fields": {
            "keyword": { "type": "keyword" },
            "autocomplete": {
              "type": "text",
              "analyzer": "autocomplete_analyzer"
            },
            "phonetic": {
              "type": "text",
              "analyzer": "phonetic_analyzer"
            }
          }
        },
        "name_hi": {
          "type": "text",
          "analyzer": "hindi_analyzer"
        },
        "description": { "type": "text", "analyzer": "custom_analyzer" },
        "cuisine": { "type": "keyword" },
        "category": { "type": "keyword" },
        "subcategory": { "type": "keyword" },
        "price": { "type": "float" },
        "rating": { "type": "float" },
        "is_veg": { "type": "boolean" },
        "is_vegan": { "type": "boolean" },
        "dietary_tags": { "type": "keyword" },
        "allergens": { "type": "keyword" },
        "ingredients": { "type": "text" },
        "restaurant_id": { "type": "keyword" },
        "restaurant_name": { "type": "text" },
        "restaurant_location": { "type": "geo_point" },
        "restaurant_rating": { "type": "float" },
        "delivery_time_mins": { "type": "integer" },
        "is_available": { "type": "boolean" },
        "popularity_score": { "type": "float" },
        "suggest": { "type": "completion" },
        "created_at": { "type": "date" },
        "updated_at": { "type": "date" }
      }
    },
    "settings": {
      "analysis": {
        "analyzer": {
          "custom_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "synonym_filter", "stemmer"]
          },
          "autocomplete_analyzer": {
            "type": "custom",
            "tokenizer": "edge_ngram_tokenizer",
            "filter": ["lowercase"]
          },
          "phonetic_analyzer": {
            "type": "custom",
            "tokenizer": "standard",
            "filter": ["lowercase", "phonetic_filter"]
          },
          "hindi_analyzer": {
            "type": "custom",
            "tokenizer": "icu_tokenizer",
            "filter": ["lowercase", "hindi_normalization", "hindi_stemmer"]
          }
        },
        "tokenizer": {
          "edge_ngram_tokenizer": {
            "type": "edge_ngram",
            "min_gram": 2,
            "max_gram": 15,
            "token_chars": ["letter", "digit"]
          }
        },
        "filter": {
          "synonym_filter": {
            "type": "synonym",
            "synonyms_path": "synonyms.txt"
          },
          "phonetic_filter": {
            "type": "phonetic",
            "encoder": "double_metaphone"
          }
        }
      }
    }
  }
}
```

---

## Acceptance Criteria

- [ ] Personalized ranking using Neo4j preferences
- [ ] Semantic search with hybrid BM25 + vector scoring
- [ ] Autocomplete < 50ms response time
- [ ] Typo tolerance ("birynai" -> "biryani")
- [ ] 10+ faceted filters with dynamic counts
- [ ] Geo-spatial search within radius
- [ ] Voice search working in Chrome
- [ ] Search analytics dashboard
- [ ] Multi-language support (English + Hindi)
- [ ] Click-through tracking
- [ ] A/B testing infrastructure for ranking
- [ ] Performance: search < 200ms p95
- [ ] 85%+ test coverage
- [ ] Load test: 2000 search queries/sec

---

## SDLC Phases

### Phase 1: Planning & Design (Day 1-3)

**Objectives:**
- Design complete search pipeline architecture
- Define Elasticsearch index schemas
- Plan personalization integration with Neo4j
- Design analytics data model
- Create search quality metrics

**Deliverables:**
- Search pipeline architecture document
- Elasticsearch index schema definitions
- Synonym and phonetic dictionaries
- Personalization strategy document
- Analytics data model
- API contracts for all search endpoints
- Search quality baseline metrics

**Activities:**
1. Design search pipeline:
   - Map query preprocessing steps
   - Define hybrid search score fusion algorithm
   - Design personalization re-ranking strategy
   - Plan failover and circuit breaker logic
2. Design Elasticsearch indexes:
   - dishes index with multi-field mappings
   - restaurants index with geo-spatial fields
   - search_analytics index for logging
   - autocomplete index with completion suggesters
3. Create linguistic resources:
   - Synonym dictionary (biryani/biriyani/briyani, etc.)
   - Phonetic mappings for common food terms
   - Hindi transliteration mappings
   - Stop words list (food domain specific)
4. Design personalization integration:
   - Define boost factor calculation from Neo4j preferences
   - Design context injection (time, location, history)
   - Plan preference caching strategy (Redis with TTL)
5. Design analytics data model:
   - Query log schema
   - Click event schema
   - Conversion tracking schema
   - A/B test assignment and results schema
6. Define search quality metrics:
   - NDCG@10 for relevance
   - MRR for first-result accuracy
   - Click-through rate
   - Zero-result rate
   - Search-to-order conversion rate
7. Review with team, gather feedback

### Phase 2: Elasticsearch Enhancement (Day 3-6)

**Objectives:**
- Create optimized Elasticsearch indexes
- Implement autocomplete and spell checking
- Set up typo tolerance and phonetic search
- Add multi-language support

**Deliverables:**
- Enhanced dishes index with autocomplete, phonetic, and Hindi support
- Enhanced restaurants index with geo-spatial
- Autocompleter service
- SpellChecker service
- Custom analyzers (synonym, phonetic, Hindi)
- Synonym dictionary
- Unit and integration tests

**Activities:**
1. Create enhanced Elasticsearch index mappings:
   - Dish index with text, keyword, autocomplete, and phonetic fields
   - Restaurant index with geo_point for location
   - Multi-field mapping for typo tolerance (fuzzy search)
   - Edge n-gram analyzer for autocomplete
2. Implement Autocompleter:
   - Prefix-based suggestions using ES completion suggester
   - Context-aware completions (user location, time of day)
   - Popular query suggestions (aggregation on search_analytics)
   - Personalized suggestions (user's past searches)
   - Response time < 50ms
3. Implement SpellChecker:
   - ES phrase suggester for "did you mean?"
   - Phonetic matching for food-specific terms
   - Levenshtein distance with max edit distance 2
   - Auto-correction for high-confidence corrections
4. Set up multi-language support:
   - Hindi analyzer with ICU tokenizer
   - Transliteration: "biryani" (English) <-> "बिरयानी" (Hindi)
   - Language detection on incoming queries
   - Language-specific field routing
5. Create synonym dictionary:
   - Food synonyms: burger/hamburger, fries/chips, naan/nan
   - Cuisine synonyms: Chinese/Sino, Mexican/Tex-Mex
   - Spelling variants: biryani/biriyani/briyani/biriani
6. Implement fuzzy search:
   - Configurable fuzziness (AUTO:3,6)
   - Prefix-based fuzziness for short queries
   - Combined with phonetic for maximum recall
7. Write tests:
   - Autocomplete accuracy tests
   - Spell check correction tests
   - Fuzzy search relevance tests
   - Hindi search tests
   - Performance benchmarks

### Phase 3: Hybrid Search & Score Fusion (Day 6-10)

**Objectives:**
- Implement keyword + semantic hybrid search
- Build score fusion algorithm (RRF)
- Integrate with Qdrant for semantic search
- Implement query understanding

**Deliverables:**
- KeywordSearcher (ES BM25)
- SemanticSearcher (Qdrant)
- ScoreFusion (RRF algorithm)
- QueryUnderstanding (intent + entity extraction)
- QueryExpander (synonym + LLM expansion)
- GeoSpatialSearcher
- Integration tests
- Relevance benchmarks

**Activities:**
1. Implement KeywordSearcher:
   - Multi-match across name, description, cuisine, ingredients
   - Field boosting: name^3, cuisine^2, description^1
   - Function score with popularity and rating decay
   - Filter by availability, dietary restrictions
2. Implement SemanticSearcher:
   - Generate query embedding via EmbeddingService
   - Search dish_embeddings collection in Qdrant
   - Filter by metadata (cuisine, price_range, etc.)
   - Return top-K with cosine similarity scores
3. Implement ScoreFusion:
   - Reciprocal Rank Fusion:
     ```typescript
     function reciprocalRankFusion(
       rankings: ScoredResult[][],
       k: number = 60
     ): FusedResult[] {
       const scores = new Map<string, number>();
       for (const ranking of rankings) {
         for (let rank = 0; rank < ranking.length; rank++) {
           const id = ranking[rank].id;
           const currentScore = scores.get(id) || 0;
           scores.set(id, currentScore + 1 / (k + rank + 1));
         }
       }
       return Array.from(scores.entries())
         .map(([id, score]) => ({ id, score }))
         .sort((a, b) => b.score - a.score);
     }
     ```
   - Configurable weights for keyword vs semantic
   - Default: 0.4 keyword + 0.6 semantic (tunable via A/B test)
4. Implement QueryUnderstanding:
   - Intent classification: food_search, restaurant_search, filter_command
   - Entity extraction: cuisine type, dish name, dietary restriction, price range
   - Rule-based extraction for common patterns
   - LLM-based extraction for complex natural language queries
   - Caching of query understanding results (semantic cache)
5. Implement QueryExpander:
   - Synonym expansion from dictionary
   - LLM-based expansion for ambiguous queries
   - "spicy food" -> "spicy food OR hot food OR chili"
   - Controlled expansion (max 3 additional terms)
6. Implement GeoSpatialSearcher:
   - Search within radius using ES geo_distance query
   - Bounding box search for map-based UI
   - Distance-based scoring (closer = higher score)
   - Combine geo-filter with keyword/semantic search
7. Write tests:
   - RRF fusion correctness
   - Query understanding accuracy
   - Hybrid search relevance (NDCG@10)
   - Geo-spatial search accuracy
   - Performance benchmarks

### Phase 4: Personalized Ranking (Day 10-13)

**Objectives:**
- Integrate Neo4j preferences for ranking
- Build contextual ranking (time, location)
- Implement A/B testing infrastructure
- Add popularity boosting

**Deliverables:**
- PreferenceBooster (Neo4j integration)
- ContextualRanker (time + location)
- PopularityBooster
- ABTestRouter
- Preference caching layer
- Integration tests
- A/B test configuration

**Activities:**
1. Implement PreferenceBooster:
   - Query Neo4j for user preferences (cached in Redis, TTL: 5 min)
   - Build boost map: { restaurant_id: boost, cuisine: boost, dish_id: boost }
   - Apply multiplicative boost to search scores
   - Handle missing preferences gracefully (no boost = 1.0)
   - Circuit breaker: if Neo4j slow/down, skip personalization
2. Implement ContextualRanker:
   - Time-of-day boosting:
     - Morning (6-11): boost breakfast items
     - Lunch (11-14): boost lunch specials
     - Evening (17-21): boost dinner items
     - Late night (21-2): boost late-night options
   - Day-of-week boosting:
     - Weekend: boost brunch, family meals
     - Weekday: boost quick lunches, office meals
   - Location boosting:
     - Boost restaurants within 3km by 1.5x
     - Boost restaurants within 5km by 1.2x
     - Boost restaurants within 10km by 1.0x (no boost)
3. Implement PopularityBooster:
   - Calculate trending score: recent_orders / time_window
   - Boost currently trending dishes/restaurants
   - Time-windowed popularity (last 24 hours)
   - Location-specific popularity
4. Implement ABTestRouter:
   - Consistent hashing for user-variant assignment
   - Support multiple concurrent experiments
   - Track impressions, clicks, and conversions per variant
   - Statistical significance calculator
   - Experiment configuration:
     ```typescript
     {
       experimentId: "ranking_v2",
       variants: [
         { id: "control", weight: 50, algorithm: "keyword_only" },
         { id: "hybrid", weight: 25, algorithm: "hybrid_rrf" },
         { id: "personalized", weight: 25, algorithm: "hybrid_personalized" }
       ],
       startDate: "2026-03-01",
       endDate: "2026-03-31"
     }
     ```
5. Implement preference caching:
   - Cache user boost factors in Redis (TTL: 5 minutes)
   - Invalidate on preference change (Kafka event)
   - Warm cache for active users on startup
6. Write tests:
   - Preference boosting correctness
   - Contextual ranking accuracy
   - A/B test assignment consistency
   - Personalized vs non-personalized quality comparison

### Phase 5: Faceted Search & Voice Search (Day 13-17)

**Objectives:**
- Implement comprehensive faceted filtering
- Build voice search integration
- Add search analytics collection

**Deliverables:**
- FacetEngine with 10+ facet types
- DynamicFacetBuilder with filter counts
- VoiceSearchModule (frontend)
- VoiceIntentExtractor
- AnalyticsCollector (query logging, click tracking)
- Integration tests

**Activities:**
1. Implement FacetEngine:
   - Cuisine facet (aggregation on cuisine field)
   - Price range facet (range aggregation: $, $$, $$$, $$$$)
   - Rating facet (range: 3+, 4+, 4.5+)
   - Delivery time facet (range: <30min, 30-45min, 45-60min)
   - Dietary facet (terms: veg, vegan, gluten-free, halal, kosher)
   - Allergen exclusion facet (terms: nuts, dairy, shellfish, etc.)
   - Distance facet (range: <1km, <3km, <5km, <10km)
   - Availability facet (filter: open now, open at specific time)
   - Promotion facet (filter: has discount, free delivery)
   - Meal type facet (terms: breakfast, lunch, dinner, snacks)
2. Implement DynamicFacetBuilder:
   - Calculate counts per facet value for current query
   - Update counts when filters are applied
   - Show only relevant facets based on query context
   - Sort facet values by count (descending)
3. Implement FilterApplier:
   - Convert facet selections to ES bool query
   - Support multi-select within same facet (OR)
   - Support multi-facet combination (AND)
   - Support range filters (price, rating, distance)
4. Implement VoiceSearchModule (frontend):
   - Web Speech API integration (Chrome, Edge, Safari)
   - Microphone permission handling
   - Real-time transcript display
   - Language selection (English, Hindi)
   - Fallback for unsupported browsers
5. Implement VoiceIntentExtractor:
   - Convert voice transcript to search query
   - Handle conversational queries ("I want something like pizza")
   - Extract filters from voice ("vegetarian food under 200 rupees")
   - Confirm ambiguous queries with user
6. Implement AnalyticsCollector:
   - Log all search queries with context:
     ```typescript
     {
       queryId: uuid,
       userId: string,
       rawQuery: string,
       processedQuery: string,
       filters: object,
       resultCount: number,
       topResults: string[],
       latencyMs: number,
       source: "text" | "voice",
       timestamp: date
     }
     ```
   - Track click events: { queryId, resultId, position, timestamp }
   - Track conversion events: { queryId, orderId, timestamp }
   - Store in search_analytics ES index
7. Write tests:
   - All facet types with correct counts
   - Multi-facet combination
   - Voice transcript to search query
   - Analytics event logging

### Phase 6: Search Analytics Dashboard (Day 17-19)

**Objectives:**
- Build search analytics dashboard
- Implement search quality metrics
- Create zero-result query analysis
- Build A/B test results viewer

**Deliverables:**
- Search analytics API endpoints
- Grafana dashboard for search metrics
- Zero-result query report
- Popular queries report
- A/B test results viewer
- Search quality scoring

**Activities:**
1. Implement analytics API endpoints:
   - GET /analytics/search/overview (total queries, avg latency, CTR)
   - GET /analytics/search/top-queries (most searched terms)
   - GET /analytics/search/zero-results (queries with no results)
   - GET /analytics/search/conversion (search-to-order rate)
   - GET /analytics/search/quality (NDCG, MRR metrics)
   - GET /analytics/search/ab-tests/:id (experiment results)
2. Create Grafana dashboard panels:
   - Search volume over time (queries/minute)
   - Average search latency (p50, p95, p99)
   - Cache hit rate (from semantic cache)
   - Click-through rate over time
   - Zero-result rate over time
   - Top 20 search queries (live)
   - Voice search percentage
   - Search-to-order conversion funnel
3. Implement zero-result analysis:
   - Identify queries that return no results
   - Suggest index improvements (missing synonyms, new dishes)
   - Auto-generate synonym suggestions
   - Alert when zero-result rate exceeds 5%
4. Implement search quality scoring:
   - Calculate NDCG@10 from click data:
     ```
     Relevance = clicked ? 1 : 0 (binary)
     DCG@10 = sum(relevance_i / log2(i + 1))
     NDCG@10 = DCG@10 / IDCG@10
     ```
   - Calculate Mean Reciprocal Rank (MRR)
   - Track quality trends over time
5. Implement A/B test results:
   - Show per-variant metrics (CTR, conversion, revenue)
   - Statistical significance test (chi-squared)
   - Recommendation: which variant wins
   - Auto-promote winning variant

### Phase 7: Testing, Optimization & Documentation (Day 19-22)

**Objectives:**
- Comprehensive testing of all search components
- Performance optimization and load testing
- Search quality tuning
- Documentation and operational guides

**Deliverables:**
- Full test suite (85%+ coverage)
- Load test results (2000 queries/sec)
- Search quality report (NDCG, MRR)
- Performance optimization report
- API documentation
- Search tuning guide
- Operations runbook

**Activities:**
1. Unit test completion:
   - All services at 85%+ coverage
   - Autocomplete edge cases
   - Spell check accuracy
   - Facet counting correctness
   - Score fusion algorithm
   - Voice search transcript processing
2. Integration testing:
   - Full search pipeline end-to-end
   - Hybrid search relevance testing
   - Personalized ranking validation
   - Multi-language search
   - Voice search end-to-end
   - Analytics event pipeline
3. Load testing:
   - Target: 2000 search queries/sec
   - Measure: latency per pipeline stage
   - Profile: ES cluster performance
   - Profile: Qdrant performance
   - Profile: Neo4j preference lookup
   - Identify and resolve bottlenecks
4. Search quality tuning:
   - Tune BM25 parameters (k1, b)
   - Tune field boost weights
   - Tune RRF fusion weights
   - Tune personalization boost factors
   - Evaluate NDCG@10 against test queries
   - A/B test different configurations
5. Performance optimization:
   - ES query optimization (profiling)
   - Index optimization (shard sizing, refresh interval)
   - Result caching for popular queries
   - Connection pooling tuning
   - Async operations where possible
6. Write documentation:
   - Search API documentation
   - Elasticsearch index management guide
   - Synonym dictionary maintenance guide
   - A/B test setup guide
   - Search quality monitoring guide
   - Operations runbook (reindex, failover, scaling)
   - Search tuning playbook
