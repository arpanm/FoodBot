# Search Orchestrator Service

A standalone microservice that coordinates searches across multiple data sources
(Elasticsearch, MCP Adapter, PostgreSQL) and returns aggregated, ranked results.

## Architecture

```
Customer Search Request
        |
Gateway API (searchController)
        |
Search Orchestrator Service
        |
    +---+---+-----------+
    |       |           |
Elasticsearch  MCP Adapter  PostgreSQL
    |       |           |
    +---+---+-----------+
        |
Result Aggregation & Ranking
        |
Unified Search Response
```

## Features

- **Multi-source parallel search** across Elasticsearch, MCP Adapter, and PostgreSQL
- **Search strategies**: Fast (ES only, <100ms), Comprehensive (all sources, <500ms), Fallback (DB only)
- **Result aggregation**: deduplication, merging, filtering, scoring, and ranking
- **Redis caching** with 5-minute TTL and pattern-based invalidation
- **Circuit breaker** per source with automatic recovery
- **Per-source timeouts**: ES 200ms, MCP 2s, DB 500ms
- **Prometheus metrics** endpoint for monitoring

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/search` | Main search endpoint |
| GET | `/search/autocomplete?prefix=...` | Fast autocomplete suggestions |
| GET | `/search/popular` | Popular search terms |
| POST | `/cache/invalidate` | Cache invalidation webhook |
| GET | `/health` | Health check for all sources |
| GET | `/metrics` | Prometheus metrics |

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Service port |
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | Elasticsearch URL |
| `ELASTICSEARCH_INDEX` | `foodbot_restaurants` | ES index name |
| `MCP_ADAPTER_URL` | `http://localhost:8082/api/v1` | MCP Adapter URL |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `foodbot` | Database name |
| `REDIS_URL` | (none) | Redis URL for caching |
| `ES_TIMEOUT_MS` | `200` | Elasticsearch timeout |
| `MCP_TIMEOUT_MS` | `2000` | MCP Adapter timeout |
| `DB_TIMEOUT_MS` | `500` | Database timeout |
| `MAX_TOTAL_TIMEOUT_MS` | `3000` | Global search timeout |
| `DEFAULT_SEARCH_STRATEGY` | `comprehensive` | Default strategy |
| `CACHE_TTL_SECONDS` | `300` | Cache TTL (seconds) |
| `LOG_LEVEL` | `info` | Log level |

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Docker

```bash
docker build -t foodbot/search-orchestrator .
docker run -p 3002:3002 foodbot/search-orchestrator
```

## Scoring Algorithm

Results are ranked by a weighted score:

| Component | Weight | Description |
|-----------|--------|-------------|
| Relevance | 35% | Source relevance score (ES BM25, etc.) |
| Rating | 20% | Restaurant/dish rating boost |
| Proximity | 15% | Distance from user location |
| Availability | 10% | Currently open boost |
| Delivery Time | 8% | Fast delivery boost |
| User Preference | 7% | Preferred cuisine/past orders boost |
| Popularity | 5% | Review count boost |

## Project Structure

```
src/
  orchestrator/     - Core orchestration (parallel execution, fallback, timeout)
  sources/          - Data source implementations (ES, MCP, DB)
  aggregation/      - Result merging, dedup, scoring, ranking
  strategies/       - Search strategy selection and execution
  cache/            - Redis cache with invalidation
  filters/          - Business filters (cuisine, price, rating, location, availability)
  types/            - TypeScript type definitions
  config/           - Configuration management
  app.ts            - Express application setup
  server.ts         - Server entry point
tests/
  orchestrator.test.ts   - Orchestrator unit tests
  aggregation.test.ts    - Aggregation unit tests
  strategies.test.ts     - Strategy and filter unit tests
  e2e.test.ts            - API E2E tests
```
