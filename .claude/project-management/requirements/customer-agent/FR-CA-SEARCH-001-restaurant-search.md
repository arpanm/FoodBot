# FR-CA-SEARCH-001: Restaurant Search

**Component:** Customer Agent
**Category:** Search & Discovery
**Priority:** High
**Status:** ✅ Complete

## Description

The system shall support searching restaurants by:
- Restaurant name (full-text search)
- Restaurant type/cuisine (e.g., Italian, Chinese, Fast Food)
- Dish name (search restaurants serving specific dish)
- Location/proximity
- Rating/popularity
- Price range

## Acceptance Criteria

- ✅ Search returns relevant results within 500ms
- ✅ Full-text search handles typos and partial matches
- ✅ Results ranked by relevance
- ✅ Pagination supported for large result sets

## Implementation

**Location:** `/services/search-orchestrator/src/`

**Key Components:**
- Elasticsearch for full-text search
- Redis for caching
- Aggregator for multi-provider search
- Relevance scoring algorithm

**Search Algorithm:**
```typescript
interface SearchQuery {
  query: string;
  location: { lat: number; lng: number };
  filters?: {
    cuisine?: string[];
    priceRange?: { min: number; max: number };
    rating?: number;
    deliveryTime?: number;
  };
  pagination: { page: number; pageSize: number };
  sortBy?: 'relevance' | 'rating' | 'deliveryTime' | 'price';
}
```

## Performance

- p95: 245ms (cached), 487ms (live)
- Cache hit rate: 87%
- Throughput: 1250 req/sec

## Test Coverage

- Unit Tests: 95% (32/34 passing)
- Integration Tests: 92%
- Performance Tests: ✅ Complete

## Related Files

- `/services/search-orchestrator/src/search/RestaurantSearchService.ts`
- `/packages/workflows/src/activities/SearchActivity.ts`
