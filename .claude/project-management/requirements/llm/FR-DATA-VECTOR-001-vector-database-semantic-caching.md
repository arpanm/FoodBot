# FR-DATA-VECTOR-001: Vector Database for Semantic Caching

**ID**: `FR-DATA-VECTOR-001`
**Created**: 2026-02-20
**Status**: 🟡 Pending
**Priority**: High
**Assigned To**: Backend Team

---

## Description

Implement a vector database to enable semantic caching of LLM prompts and responses, reducing API costs and improving response times. The system shall embed user prompts as vectors, store prompt-intent-workflow mappings, and perform similarity searches to retrieve cached results for semantically similar queries.

**Key Capabilities:**
- Embed prompts using OpenAI ada-002 or similar (1536 dimensions)
- Store prompt embeddings with associated intent, workflow JSON, and metadata
- Perform cosine similarity search (threshold >0.85 for cache hits)
- Support TTL-based cache expiration
- Track cache hit rate, cost savings, and performance metrics

**Technology Options:**
- Pinecone (managed, fast, expensive)
- Weaviate (open-source, flexible, hybrid search)
- Qdrant (open-source, Rust-based, fast, low latency)
- Chroma (open-source, simple, good for development)

**Recommended:** Qdrant for production (performance + cost), Chroma for development

---

## Acceptance Criteria

### Core Functionality
- [ ] Vector database deployed and accessible
- [ ] Embedding generation service integrated (OpenAI ada-002 or open-source alternative)
- [ ] Prompt embedding stored with metadata (userId, timestamp, intent, workflow)
- [ ] Similarity search with configurable threshold (default: 0.85)
- [ ] TTL-based cache expiration (default: 24 hours)
- [ ] Cache hit/miss tracking with metrics

### Performance
- [ ] Embedding generation: <200ms (OpenAI API)
- [ ] Similarity search: <50ms (p95)
- [ ] Cache hit rate: >70% after warm-up period
- [ ] Cost reduction: >60% in LLM API calls

### Integration
- [ ] LLM Router integration (check cache before API call)
- [ ] Automatic cache population on LLM responses
- [ ] Cache invalidation on user preference changes
- [ ] Monitoring dashboard for cache metrics

---

## Technical Details

### Implementation Approach

**Architecture:**
```
User Prompt → Embed Prompt → Check Vector DB (similarity search)
  ↓ Cache Miss                     ↓ Cache Hit (similarity > 0.85)
LLM API Call                       Return Cached Response
  ↓
Store Response + Embedding in Vector DB
  ↓
Return Response to User
```

**Data Model:**
```typescript
interface CachedPrompt {
  id: string;
  userId: string;
  prompt: string;
  embedding: number[]; // 1536 dimensions
  intent: string;
  workflowJson: object;
  response: string;
  metadata: {
    llmProvider: 'claude' | 'openai' | 'gemini';
    model: string;
    tokensUsed: number;
    cost: number;
    timestamp: Date;
  };
  ttl: number; // seconds
  accessCount: number;
  lastAccessedAt: Date;
}
```

**Similarity Search:**
```typescript
async function findSimilarPrompts(
  promptEmbedding: number[],
  threshold: number = 0.85,
  limit: number = 5
): Promise<CachedPrompt[]> {
  return await vectorDB.search({
    vector: promptEmbedding,
    metric: 'cosine',
    minScore: threshold,
    limit: limit,
    filter: {
      ttl: { $gte: Date.now() }
    }
  });
}
```

### Dependencies
- **Depends on:**
  - FR-LLM-001: LLM Router (integration point)
  - FR-LLM-INTENT-001: Intent Detection (store intent with embeddings)
  - TR-DB-VECTOR-001: Vector Database Infrastructure

- **Blocks:**
  - FR-LLM-CACHE-002: Cache Management (manual invalidation, warming)
  - Performance optimization across the platform

### Files Affected
- `/packages/llm-router/src/cache/VectorCacheService.ts` (new)
- `/packages/llm-router/src/cache/EmbeddingService.ts` (new)
- `/packages/llm-router/src/router.ts` (modify to integrate cache)
- `/services/mcp-adapter/src/llm/LLMOrchestrator.ts` (integrate cache)
- `/infrastructure/docker-compose.yml` (add Qdrant/Chroma service)

---

## Implementation Notes

### Progress Log
- 2026-02-20: Requirement created based on system architecture analysis

### Technology Selection

**Evaluation:**

| Feature | Pinecone | Weaviate | Qdrant | Chroma |
|---------|----------|----------|--------|--------|
| **Performance** | Excellent | Good | Excellent | Good |
| **Cost** | High (managed) | Low (self-hosted) | Low (self-hosted) | Low (self-hosted) |
| **Ease of Use** | Excellent | Good | Excellent | Excellent |
| **Scalability** | Excellent | Good | Good | Fair |
| **Hybrid Search** | No | Yes | Yes | Limited |
| **Community** | Large | Large | Growing | Medium |

**Recommendation:**
- **Production:** Qdrant (performance + cost-effective)
- **Development:** Chroma (simple setup, good for prototyping)

### Challenges
- Embedding generation cost (OpenAI ada-002: $0.0001/1K tokens)
- Cache invalidation strategy (when to invalidate?)
- Cold start problem (cache empty initially)
- Context drift (user preferences change over time)

### Decisions Made
- Use cosine similarity with threshold 0.85 (industry standard)
- Default TTL: 24 hours (balances freshness and cache hits)
- Store full prompt + embedding (enables debugging and analysis)
- Track access count for cache warming strategies

---

## Testing

### Unit Tests
- [ ] Embedding generation service tests
- [ ] Similarity search tests with known embeddings
- [ ] Cache hit/miss logic tests
- [ ] TTL expiration tests
- [ ] Metadata storage and retrieval tests

### Integration Tests
- [ ] End-to-end cache flow (embed → store → retrieve)
- [ ] LLM Router integration (cache check before API call)
- [ ] Cache invalidation on user changes
- [ ] Multiple concurrent requests handling

### E2E Tests
- [ ] User sends prompt → cache miss → LLM call → cache store
- [ ] User sends similar prompt → cache hit → instant response
- [ ] Cache expiration after TTL
- [ ] Performance benchmarking (latency, cost savings)

### Performance Tests
- [ ] 1000 similarity searches under 50ms (p95)
- [ ] Embedding generation under 200ms
- [ ] Cache hit rate >70% after 1000 unique prompts
- [ ] Cost reduction >60% over baseline (no cache)

---

## Cost Analysis

### Without Caching (Baseline)
- 10,000 prompts/day
- Average 500 tokens/prompt
- Claude Sonnet: $3.00 per million input tokens
- **Daily cost:** 10,000 × 500 × $3.00 / 1,000,000 = **$15.00/day** = **$450/month**

### With Caching (70% hit rate)
- Cache misses: 3,000/day (30%)
- LLM API cost: $4.50/day = $135/month
- Embedding cost: 10,000 × $0.0001 / 1K = $1.00/day = $30/month
- Vector DB cost: ~$50/month (Qdrant self-hosted)
- **Total:** $135 + $30 + $50 = **$215/month**
- **Savings:** $450 - $215 = **$235/month (52% reduction)**

---

## Links

- Related Requirements:
  - [FR-LLM-001: LLM Router](../llm-orchestration/FR-LLM-001-llm-router.md)
  - [FR-LLM-CACHE-002: Cache Management](./FR-LLM-CACHE-002-cache-management.md) (to be created)
  - [TR-DB-VECTOR-001: Vector Database Infrastructure](../technical-requirements.md#44-vector-database-semantic-caching)

- Related Tasks:
  - `TASK-BACKEND-015`: Setup Qdrant vector database
  - `TASK-BACKEND-016`: Implement embedding service
  - `TASK-BACKEND-017`: Integrate cache with LLM Router

- Documentation:
  - [Qdrant Documentation](https://qdrant.tech/documentation/)
  - [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
  - [Vector Database Comparison](https://github.com/erikbern/ann-benchmarks)

---

**Last Updated**: 2026-02-20
**Updated By**: Claude (AI Agent - Requirement Analysis)
