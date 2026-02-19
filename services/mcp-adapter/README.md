# FoodBot MCP Adapter Service

**Package:** `@foodbot/mcp-adapter`
**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Overview

The MCP Adapter is a TypeScript microservice that provides a unified interface for integrating with multiple food delivery providers (Swiggy, Zomato, Internal, Mock) using the Model Context Protocol (MCP). It handles provider authentication, data normalization, result aggregation, and implements resilience patterns including circuit breakers, rate limiters, and retry logic.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| TypeScript 5 | Language |
| Zod 3 | Runtime schema validation |
| ioredis 5 | Redis client for caching |
| Pino 9 | Structured JSON logging |
| dotenv | Environment variable management |

## Features

- Multi-provider integration (Swiggy, Zomato, Internal, Mock)
- OAuth-based provider authentication with token management and encryption
- Result aggregation with deduplication, merging, and ranking
- Redis caching with configurable TTL
- Per-provider circuit breaker with automatic recovery
- Per-provider rate limiting (token-bucket algorithm)
- Retry logic with exponential backoff
- Secure token encryption for credential storage

## Project Structure

```
src/
  providers/
    swiggy/
      SwiggyAPIProvider.ts    # Swiggy MCP provider client
      swiggyAuth.ts           # Swiggy session-proxied authentication
      swiggyClient.ts         # Swiggy HTTP client
      swiggyMapper.ts         # Response normalization mapper
    zomato/
      ZomatoAPIProvider.ts    # Zomato MCP provider client
      zomatoAuth.ts           # Zomato API key + session authentication
      zomatoClient.ts         # Zomato HTTP client
      zomatoMapper.ts         # Response normalization mapper
    internal/
      InternalProvider.ts     # Internal database provider
      internalClient.ts       # Internal data client
      internalMapper.ts       # Response normalization mapper
    mock/
      MockProvider.ts         # Mock provider for development/testing
  aggregator/
    ResultAggregator.ts       # Main aggregation orchestrator
    ResultDeduplicator.ts     # Removes duplicate results across providers
    ResultMerger.ts           # Merges results from multiple providers
    ResultRanker.ts           # Scores and ranks combined results
  resilience/
    CircuitBreaker.ts         # Per-provider circuit breaker
    RateLimiter.ts            # Per-provider rate limiting (token-bucket)
    RetryManager.ts           # Retry with exponential backoff
    Fallback.ts               # Fallback strategies
  auth/
    OAuthManager.ts           # OAuth flow management
    TokenManager.ts           # Token lifecycle management
    tokenEncryption.ts        # Secure token storage (AES-256-GCM)
  cache/
    CacheManager.ts           # Redis cache operations with TTL
  config/
    adapter.config.ts         # General adapter configuration
    swiggy.config.ts          # Swiggy-specific configuration
    zomato.config.ts          # Zomato-specific configuration
  types/                      # TypeScript type definitions
  app.ts                      # Application setup
  server.ts                   # Server entry point
tests/                        # Test suites
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Redis (for caching)

### Installation

```bash
cd services/mcp-adapter
pnpm install
```

### Running

```bash
# Development mode (with hot reload via tsx)
pnpm dev

# Production mode
pnpm build
pnpm start
```

### Testing

```bash
pnpm test              # Run tests (passWithNoTests)
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

### Code Quality

```bash
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues
pnpm format            # Format with Prettier
pnpm clean             # Remove build artifacts
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/search` | Search restaurants across all enabled providers |
| `GET` | `/restaurant/:id` | Get restaurant details from originating provider |
| `GET` | `/restaurant/:id/menu` | Get restaurant menu |
| `POST` | `/order` | Place an order via the appropriate provider |
| `GET` | `/health` | Health check for all providers |
| `GET` | `/metrics` | Prometheus metrics |

## Provider Status

| Provider | Auth Strategy | Status |
|----------|--------------|--------|
| Mock | None (synthetic data) | Ready (always available) |
| Internal | Direct DB/API | Ready |
| Swiggy | Session-proxied API calls | Ready (requires user session) |
| Zomato | Legacy API key + Session | Ready (requires API key/session) |

## Configuration

### Environment Variables

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `MCP_ADAPTER_PORT` | `3100` | No | Service port |
| `MCP_MOCK_ENABLED` | `true` | No | Enable mock provider |
| `MCP_SWIGGY_ENABLED` | `false` | No | Enable Swiggy provider |
| `MCP_ZOMATO_ENABLED` | `false` | No | Enable Zomato provider |
| `MCP_INTERNAL_ENABLED` | `true` | No | Enable internal provider |
| `TOKEN_ENCRYPTION_KEY` | dev key | Yes (prod) | AES-256 key for token encryption |
| `ZOMATO_API_KEY` | `''` | For Zomato | Zomato read-only API key |
| `REDIS_HOST` | `localhost` | No | Redis host |
| `REDIS_PORT` | `6379` | No | Redis port |

## Resilience Patterns

### Circuit Breaker (per provider)
- Opens after 5 consecutive failures
- Half-open after 60 seconds
- Closes after 3 successful requests in half-open state
- Automatic failover to other providers when open

### Rate Limiter (per provider)
- Token-bucket algorithm
- Swiggy: 100 requests/minute
- Zomato: 80 requests/minute
- Internal: 500 requests/minute
- Mock: unlimited

### Retry Manager
- Maximum 3 retries per request
- Exponential backoff: 1s, 2s, 4s
- Only retries on transient failures (timeouts, 5xx responses)
- Non-retryable errors propagated immediately

### Fallback Strategy
- If primary provider fails, routes to next enabled provider
- Mock provider serves as ultimate fallback
- Partial results returned if some providers fail

## Docker

```bash
docker build -t foodbot-mcp-adapter .
docker run -p 3100:3100 -e MCP_MOCK_ENABLED=true foodbot-mcp-adapter
```

## Related Documentation

- [MCP Integration Guide](../../docs/MCP_INTEGRATION.md)
- [Search Architecture](../../docs/SEARCH_ARCHITECTURE.md)
- [Architecture](../../docs/ARCHITECTURE.md)
- [Deployment](../../docs/DEPLOYMENT.md)
