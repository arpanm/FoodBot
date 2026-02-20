# FoodBot MCP Integration Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. MCP Protocol Overview](#1-mcp-protocol-overview)
- [2. Provider Integrations](#2-provider-integrations)
- [3. Account Linking Flow](#3-account-linking-flow)
- [4. Authentication](#4-authentication)
- [5. Rate Limiting](#5-rate-limiting)
- [6. Fallback Mechanisms](#6-fallback-mechanisms)

---

## 1. MCP Protocol Overview

MCP (Model Context Protocol) is an open standard for connecting AI models with external data sources and tools. In FoodBot, the MCP Orchestrator acts as a multi-provider aggregation layer that connects to restaurant data providers (Swiggy, Zomato, and internal mock data) through a unified interface.

### Architecture

```
Gateway API / Temporal Workflows
         |
         | HTTP/REST
         v
MCP Orchestrator (Spring Boot)
    |          |          |
    v          v          v
Mock MCP    Swiggy     Zomato
Provider    MCP        MCP
(Internal)  (External) (External)
```

### Provider Interface

All MCP providers implement the `MCPProviderClient` interface:

```java
public interface MCPProviderClient {
    List<Restaurant> searchRestaurants(SearchRequest request);
    Restaurant getRestaurantDetails(String restaurantId);
    List<Dish> searchDishes(SearchRequest request);
    List<Dish> getMenu(String restaurantId);
    ProviderHealth getHealth();
}
```

---

## 2. Provider Integrations

### 2.1 Mock Provider (Internal)

**Status:** Fully implemented
**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/providers/mock/`

The mock provider generates realistic test data for development and testing:

- `MockMCPClient` -- Implements the provider interface
- `MockMCPService` -- Business logic for mock data queries
- `MockDataGenerator` -- Generates random restaurants, dishes, and menus
- `MockRestaurantRepository` -- In-memory repository
- `MockDishRepository` -- In-memory repository

**Configuration:**
```yaml
mcp:
  providers:
    mock:
      enabled: true
      base-url: http://localhost:3010
      timeout: 5000ms
```

### 2.2 Swiggy Integration

**Status:** Client implemented, requires API key
**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/providers/swiggy/SwiggyMCPClient.java`

**Integration Strategy:**
- Uses Swiggy's MCP server manifest for restaurant and menu data
- WebClient (reactive) for non-blocking HTTP calls
- Resilience4j circuit breaker with 10-call window, 60% failure threshold
- Rate limited to 50 requests/second

**Configuration:**
```yaml
mcp:
  providers:
    swiggy:
      enabled: ${SWIGGY_MCP_ENABLED:false}
      base-url: ${SWIGGY_MCP_BASE_URL:https://api.swiggy.com/mcp}
      api-key: ${SWIGGY_API_KEY:}
      timeout: 10000ms
```

### 2.3 Zomato Integration

**Status:** Client implemented, requires API key
**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/providers/zomato/ZomatoMCPClient.java`

**Integration Strategy:**
- Uses Zomato's MCP server manifest
- Same resilience patterns as Swiggy
- Rate limited to 50 requests/second

**Configuration:**
```yaml
mcp:
  providers:
    zomato:
      enabled: ${ZOMATO_MCP_ENABLED:false}
      base-url: ${ZOMATO_MCP_BASE_URL:https://api.zomato.com/mcp}
      api-key: ${ZOMATO_API_KEY:}
      timeout: 10000ms
```

---

## 3. Account Linking Flow

The customer app supports linking external provider accounts (Swiggy, Zomato) for order history import and seamless cross-platform ordering.

**Frontend Service:** `apps/customer-app/src/services/account-linking.service.ts`
**Redux Slice:** `apps/customer-app/src/store/slices/accountLinkingSlice.ts`

### Flow

```
1. User initiates account linking in Settings
2. Frontend redirects to provider OAuth page
3. Provider authenticates user and returns authorization code
4. Frontend sends code to Gateway API
5. Gateway API exchanges code for access token
6. Access token stored securely (encrypted at rest)
7. Future requests to that provider include the user's token
```

---

## 4. Authentication

### Provider API Keys

Each external MCP provider requires an API key for server-to-server communication:

| Provider | Auth Method | Header |
|----------|------------|--------|
| Mock | None | -- |
| Swiggy | API Key | `X-API-Key: {key}` |
| Zomato | API Key | `X-API-Key: {key}` |

API keys are stored in environment variables and never logged or exposed in responses.

### User Authentication

The MCP Orchestrator does not handle user authentication directly. The Gateway API authenticates users via JWT and passes the user context to Temporal workflows, which then call the MCP Orchestrator.

---

## 5. Rate Limiting

### Per-Provider Rate Limits

| Provider | Limit | Period | Burst |
|----------|-------|--------|-------|
| Mock | 100 req | 1 second | Unlimited |
| Swiggy | 50 req | 1 second | 10 |
| Zomato | 50 req | 1 second | 10 |

### Resilience4j Configuration

```yaml
resilience4j:
  ratelimiter:
    instances:
      swiggy-mcp:
        limitForPeriod: 50
        limitRefreshPeriod: 1s
        timeoutDuration: 0s
```

When rate limited, the provider returns a 429 status and the circuit breaker may open.

---

## 6. Fallback Mechanisms

### Provider Health Monitoring

**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/router/ProviderHealthMonitor.java`

Health checks run every 60 seconds against each enabled provider. Health status is tracked per-provider:

| Status | Meaning |
|--------|---------|
| UP | Provider responding normally |
| DEGRADED | Provider responding slowly (>2s) |
| DOWN | Provider not responding |
| DISABLED | Provider disabled in configuration |

### Failover Strategy

**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/router/FailoverManager.java`

When a provider fails:

1. **Circuit Breaker Opens** -- After 5 consecutive failures (50% failure rate in 10-call window)
2. **Requests Routed to Other Providers** -- The ProviderRouter selects the next healthy provider
3. **Half-Open Test** -- After 60 seconds, 3 test requests are sent to check if the provider recovered
4. **Circuit Closes** -- If test requests succeed, the provider is marked as healthy

### Provider Router

**File:** `services/mcp-orchestrator/src/main/java/com/foodbot/mcp/router/ProviderRouter.java`

The router selects providers based on:
1. Enabled status
2. Health status (UP or DEGRADED)
3. Circuit breaker state (CLOSED or HALF_OPEN)
4. Current rate limiter availability

If all external providers are down, the mock provider serves as the final fallback.

### Bulkhead Isolation

Each provider has an isolated bulkhead (max 10 concurrent calls) to prevent a slow provider from consuming all connection pool resources.

```yaml
resilience4j:
  bulkhead:
    instances:
      swiggy-mcp:
        maxConcurrentCalls: 10
        maxWaitDuration: 1s
```
