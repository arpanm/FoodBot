# TASK-PROVIDER-001: Real Provider Integration (Swiggy, Zomato, ONDC)

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P2 (Medium)
**Estimated Effort:** 25 days
**Component:** MCP Adapter / External Integrations
**Depends On:** TASK-OAUTH-002, TASK-MCP-004
**Blocks:** Real food ordering from external platforms
**Related Requirements:** FR-MCP-PROVIDER-001, provider-integration-requirements.md

---

## Overview

Implement production-grade integrations with real external food delivery providers: Swiggy (via MCP server), Zomato (via MCP server), and ONDC (via protocol). This includes API/MCP client implementation, authentication, rate limiting compliance, response mapping, error handling, mock-to-real toggle, comprehensive testing with mock servers, and monitoring.

---

## Requirements

### Functional Requirements

1. **Swiggy Integration (MCP Server)**
   - Implement Swiggy MCP server client per https://github.com/Swiggy/swiggy-mcp-server-manifest
   - Restaurant search by location, cuisine, name
   - Menu fetching with real-time pricing and availability
   - Cart validation against Swiggy inventory
   - Order placement through Swiggy
   - Order status tracking (poll or webhook)
   - Order cancellation
   - Delivery tracking coordinates
   - Swiggy promotions/offers passthrough
   - Rating/review submission
   - Authentication: Swiggy OAuth or API key
   - Rate limiting: respect Swiggy's rate limits (429 handling)
   - Response mapping: Swiggy schema → FoodBot internal schema

2. **Zomato Integration (MCP Server)**
   - Implement Zomato MCP server client per https://github.com/Zomato/mcp-server-manifest
   - Restaurant search and discovery
   - Menu fetching with pricing
   - Order placement through Zomato
   - Order status tracking
   - Delivery tracking
   - Zomato Gold / Pro offers passthrough
   - Authentication: Zomato API key + OAuth
   - Rate limiting compliance
   - Response mapping: Zomato schema → FoodBot internal schema

3. **ONDC Integration (Protocol)**
   - ONDC buyer app registration
   - ONDC search (broadcast search to sellers)
   - ONDC select (select items from catalog)
   - ONDC init (initialize order)
   - ONDC confirm (confirm order)
   - ONDC status (track order)
   - ONDC cancel (cancel order)
   - ONDC update (update order)
   - ONDC rating (submit feedback)
   - Digital signature for all ONDC messages
   - Registry lookup for seller network participants
   - ONDC compliance testing

4. **Provider Configuration & Toggle**
   - Enable/disable each provider independently
   - Provider priority ordering (which to search first)
   - Per-feature toggle (search enabled but ordering disabled)
   - Fallback chain: primary → secondary → mock
   - Configuration via environment variables + admin UI
   - Feature flags for gradual rollout
   - A/B testing between providers

5. **Mock Provider System**
   - Mock MCP server for Swiggy (mimics real API)
   - Mock MCP server for Zomato (mimics real API)
   - Mock ONDC network (simulates protocol)
   - Configurable response delays (simulate network latency)
   - Configurable error injection (test error handling)
   - Realistic mock data (restaurants, menus, orders)
   - Record/replay mode (capture real responses for mock)
   - Toggle: mock ↔ real per provider

6. **Provider Health & Monitoring**
   - Per-provider health checks (every 30 seconds)
   - Circuit breaker per provider (5 failures → open)
   - Provider SLA monitoring (availability, latency)
   - Automatic failover on provider outage
   - Provider dashboard (health, latency, error rate)
   - Alerting on provider degradation
   - Provider cost tracking (API calls, fees)

---

### Non-Functional Requirements

- Provider API call latency < 2 seconds at p95
- Circuit breaker opens after 5 consecutive failures
- Circuit breaker half-open retry after 30 seconds
- Rate limiting: no more than provider-specified RPS
- Mock server response time < 100ms
- Provider health check interval: 30 seconds
- Failover time < 5 seconds
- 99.9% availability for provider routing layer
- Zero data loss on provider failures (queue and retry)

---

## Architecture

```
Provider Integration Architecture:

Request → Provider Router → Health Check → Select Provider
  → Authenticate (OAuth/API Key) → Call Provider API/MCP
  → Map Response → Cache → Return

Detailed Flow:
1. Client Request (search/order/track)
2. Provider Router evaluates:
   - Provider priority list
   - Provider health status
   - Feature toggles
   - A/B test assignment
3. Selected Provider:
   - Check circuit breaker state
   - Authenticate (refresh token if needed)
   - Apply rate limiter
   - Make API/MCP call
   - Handle response/error
   - Map to internal schema
   - Cache if applicable
4. Fallback on failure:
   - Try next provider in chain
   - Fall back to mock if all fail

Provider Stack:
├── ProviderRouter
│   ├── PriorityRouter
│   │   └── Configurable priority per operation type
│   ├── HealthAwareRouter
│   │   └── Skip unhealthy providers
│   ├── ABTestRouter
│   │   └── Route based on user segment
│   └── FallbackChain
│       └── primary → secondary → mock
├── SwiggyProvider
│   ├── SwiggyMCPClient
│   │   ├── searchRestaurants(location, query)
│   │   ├── getMenu(restaurantId)
│   │   ├── validateCart(cartItems)
│   │   ├── placeOrder(orderDetails)
│   │   ├── getOrderStatus(orderId)
│   │   ├── cancelOrder(orderId)
│   │   ├── getDeliveryLocation(orderId)
│   │   └── submitRating(orderId, rating)
│   ├── SwiggyAuthAdapter
│   │   ├── authenticate()
│   │   ├── refreshToken()
│   │   └── getAuthHeaders()
│   ├── SwiggyResponseMapper
│   │   ├── mapRestaurant(swiggyRestaurant) → Restaurant
│   │   ├── mapMenu(swiggyMenu) → Menu
│   │   ├── mapOrder(swiggyOrder) → Order
│   │   └── mapDeliveryStatus(swiggyStatus) → DeliveryStatus
│   └── SwiggyRateLimiter
│       ├── checkLimit()
│       ├── recordCall()
│       └── waitForSlot()
├── ZomatoProvider
│   ├── ZomatoMCPClient
│   │   ├── searchRestaurants(location, query)
│   │   ├── getMenu(restaurantId)
│   │   ├── placeOrder(orderDetails)
│   │   ├── getOrderStatus(orderId)
│   │   ├── getDeliveryTracking(orderId)
│   │   └── submitRating(orderId, rating)
│   ├── ZomatoAuthAdapter
│   ├── ZomatoResponseMapper
│   └── ZomatoRateLimiter
├── ONDCProvider
│   ├── ONDCProtocolClient
│   │   ├── search(searchIntent)
│   │   ├── select(selectedItems)
│   │   ├── init(orderInit)
│   │   ├── confirm(orderConfirm)
│   │   ├── status(orderId)
│   │   ├── cancel(orderId, reason)
│   │   ├── update(orderId, updateDetails)
│   │   └── rating(orderId, rating)
│   ├── ONDCSignatureManager
│   │   ├── signMessage(message)
│   │   ├── verifySignature(message, signature)
│   │   └── getPublicKey()
│   ├── ONDCRegistryClient
│   │   ├── lookupSeller(sellerId)
│   │   ├── lookupGateway(domain)
│   │   └── registerBuyer(buyerDetails)
│   ├── ONDCResponseMapper
│   └── ONDCComplianceTester
├── MockProviders
│   ├── MockSwiggyServer
│   │   ├── Express server mimicking Swiggy MCP
│   │   ├── Realistic restaurant/menu data
│   │   ├── Order lifecycle simulation
│   │   └── Configurable delays/errors
│   ├── MockZomatoServer
│   │   ├── Express server mimicking Zomato MCP
│   │   ├── Realistic data
│   │   └── Configurable behavior
│   ├── MockONDCNetwork
│   │   ├── Mock gateway + seller nodes
│   │   ├── Protocol compliance simulation
│   │   └── Async callback simulation
│   └── RecordReplayManager
│       ├── recordResponse(provider, endpoint, response)
│       ├── replayResponse(provider, endpoint)
│       └── exportRecordings()
├── ProviderConfigService
│   ├── ToggleManager
│   │   ├── isProviderEnabled(provider)
│   │   ├── isFeatureEnabled(provider, feature)
│   │   └── setToggle(provider, feature, enabled)
│   ├── PriorityManager
│   │   ├── getPriority(operationType)
│   │   └── setPriority(operationType, providers[])
│   ├── FeatureFlagService
│   │   ├── isEnabled(flag, context)
│   │   └── getVariant(flag, context)
│   └── ABTestConfig
│       ├── getAssignment(userId, experiment)
│       └── recordOutcome(userId, experiment, outcome)
└── ProviderMonitor
    ├── HealthChecker
    │   ├── checkHealth(provider) → HealthStatus
    │   ├── scheduleChecks(interval)
    │   └── getHealthHistory(provider)
    ├── CircuitBreaker
    │   ├── execute(provider, operation)
    │   ├── getState(provider) → open|closed|half-open
    │   └── reset(provider)
    ├── SLATracker
    │   ├── recordLatency(provider, operation, ms)
    │   ├── recordSuccess(provider, operation)
    │   ├── recordFailure(provider, operation, error)
    │   └── getSLAReport(provider, timeRange)
    ├── CostTracker
    │   ├── recordAPICall(provider, operation)
    │   ├── getCostReport(provider, timeRange)
    │   └── setBudgetAlert(provider, threshold)
    └── AlertManager
        ├── checkThresholds()
        ├── sendAlert(alertType, details)
        └── getAlertHistory()
```

---

## SDLC Phases

### Phase 1: Provider Infrastructure & Routing (Days 1-4)

**Objectives:** Build the provider routing layer, configuration system, and circuit breaker.

**Tasks:**
1. Implement ProviderRouter with priority-based routing
2. Implement HealthAwareRouter (skip unhealthy providers)
3. Implement FallbackChain (primary → secondary → mock)
4. Implement CircuitBreaker (5 failures → open, 30s half-open)
5. Implement ProviderConfigService (toggle, priority, feature flags)
6. Implement rate limiter (token bucket algorithm)
7. Implement provider health checker (HTTP ping every 30s)
8. Define internal schema interfaces (Restaurant, Menu, Order, DeliveryStatus)
9. Unit tests for router, circuit breaker, rate limiter
10. Integration tests for routing with mock providers

**Deliverables:**
- Provider routing infrastructure
- Circuit breaker and rate limiter
- Configuration service with toggles
- Health checking system

### Phase 2: Swiggy Integration (Days 5-9)

**Objectives:** Full Swiggy MCP client implementation with auth, mapping, and testing.

**Tasks:**
1. Implement SwiggyAuthAdapter (OAuth flow, token refresh)
2. Implement SwiggyMCPClient.searchRestaurants()
3. Implement SwiggyMCPClient.getMenu()
4. Implement SwiggyMCPClient.validateCart()
5. Implement SwiggyMCPClient.placeOrder()
6. Implement SwiggyMCPClient.getOrderStatus()
7. Implement SwiggyMCPClient.cancelOrder()
8. Implement SwiggyMCPClient.getDeliveryLocation()
9. Implement SwiggyMCPClient.submitRating()
10. Implement SwiggyResponseMapper (all entity types)
11. Implement SwiggyRateLimiter (respect Swiggy limits)
12. Implement Swiggy promotions/offers passthrough
13. Build MockSwiggyServer (Express, realistic data)
14. Unit tests for all Swiggy client methods
15. Contract tests against MockSwiggyServer
16. Integration tests: search → order → track flow

**Deliverables:**
- Complete Swiggy MCP client
- Swiggy auth adapter with token management
- Response mapper (100% field coverage)
- Mock Swiggy server
- Full test suite

### Phase 3: Zomato Integration (Days 10-14)

**Objectives:** Full Zomato MCP client implementation with auth, mapping, and testing.

**Tasks:**
1. Implement ZomatoAuthAdapter (API key + OAuth)
2. Implement ZomatoMCPClient.searchRestaurants()
3. Implement ZomatoMCPClient.getMenu()
4. Implement ZomatoMCPClient.placeOrder()
5. Implement ZomatoMCPClient.getOrderStatus()
6. Implement ZomatoMCPClient.getDeliveryTracking()
7. Implement ZomatoMCPClient.submitRating()
8. Implement ZomatoResponseMapper (all entity types)
9. Implement ZomatoRateLimiter
10. Implement Zomato Gold/Pro offers passthrough
11. Build MockZomatoServer (Express, realistic data)
12. Unit tests for all Zomato client methods
13. Contract tests against MockZomatoServer
14. Integration tests: search → order → track flow

**Deliverables:**
- Complete Zomato MCP client
- Zomato auth adapter
- Response mapper
- Mock Zomato server
- Full test suite

### Phase 4: ONDC Integration (Days 15-20)

**Objectives:** Full ONDC protocol client implementation with digital signatures and compliance.

**Tasks:**
1. Implement ONDCRegistryClient (buyer registration, seller lookup)
2. Implement ONDCSignatureManager (Ed25519 signing/verification)
3. Implement ONDCProtocolClient.search() (broadcast to gateway)
4. Implement ONDCProtocolClient.select() (select from catalog)
5. Implement ONDCProtocolClient.init() (initialize order)
6. Implement ONDCProtocolClient.confirm() (confirm order)
7. Implement ONDCProtocolClient.status() (track order)
8. Implement ONDCProtocolClient.cancel() (cancel with reason)
9. Implement ONDCProtocolClient.update() (modify order)
10. Implement ONDCProtocolClient.rating() (submit feedback)
11. Implement ONDC async callback handler (on_search, on_select, etc.)
12. Implement ONDCResponseMapper (ONDC catalog → internal schema)
13. Build MockONDCNetwork (mock gateway + seller nodes)
14. Implement ONDCComplianceTester (validate message format)
15. Unit tests for all ONDC protocol methods
16. Contract tests against MockONDCNetwork
17. Compliance tests (ONDC test suite)
18. Integration tests: full order lifecycle

**Deliverables:**
- Complete ONDC protocol client
- Digital signature management
- Registry client
- Mock ONDC network
- Compliance test suite
- Full test suite

### Phase 5: Mock System, Monitoring & E2E (Days 21-25)

**Objectives:** Complete mock system, monitoring dashboard, and end-to-end validation.

**Tasks:**
1. Implement RecordReplayManager (capture real responses)
2. Implement mock ↔ real toggle per provider
3. Implement configurable delays/error injection in mocks
4. Implement A/B testing router
5. Implement ProviderMonitor dashboard API
6. Implement SLA tracker (availability, latency percentiles)
7. Implement cost tracker (API calls per provider)
8. Implement alerting (provider degradation, budget threshold)
9. Build provider health dashboard UI
10. E2E test: Swiggy search → order → track (mock)
11. E2E test: Zomato search → order → track (mock)
12. E2E test: ONDC search → order → track (mock)
13. E2E test: provider failover (primary fails → secondary)
14. E2E test: circuit breaker opens and recovers
15. Load test: 100 concurrent provider requests
16. Performance tuning based on load test results
17. Documentation: provider integration guide, runbooks
18. Security review: OAuth token storage, API key rotation

**Deliverables:**
- Record/replay mock system
- Provider monitoring dashboard
- SLA and cost tracking
- Complete E2E test suite
- Load test results
- Documentation and runbooks

---

## Acceptance Criteria

- [ ] Swiggy MCP client implementing full manifest (search, menu, order, track, cancel, rate)
- [ ] Zomato MCP client implementing full manifest (search, menu, order, track, rate)
- [ ] ONDC protocol client with all message types (search, select, init, confirm, status, cancel, update, rating)
- [ ] OAuth authentication for Swiggy and Zomato (token refresh, secure storage)
- [ ] ONDC digital signatures working (Ed25519 sign/verify)
- [ ] ONDC registry lookup for seller discovery
- [ ] Provider toggle (enable/disable) working per provider and per feature
- [ ] Provider priority ordering configurable
- [ ] Mock servers for all 3 providers (realistic data, configurable behavior)
- [ ] Mock ↔ real toggle per provider (seamless switch)
- [ ] Record/replay mode for capturing real API responses
- [ ] Circuit breaker per provider (5 failures → open, 30s recovery)
- [ ] Automatic failover on provider outage (< 5 seconds)
- [ ] Rate limiting compliance (no 429 errors from providers)
- [ ] Response mapping to internal schema (100% field coverage for all entity types)
- [ ] Provider health dashboard (health, latency, error rate, cost)
- [ ] SLA monitoring and alerting
- [ ] A/B testing between providers
- [ ] Performance: provider call < 2 seconds p95
- [ ] 85%+ test coverage
- [ ] Contract tests against mock servers for all providers
- [ ] Integration tests with mock servers
- [ ] E2E: search → order → track through each provider
- [ ] E2E: provider failover scenario
- [ ] E2E: circuit breaker open/close cycle
- [ ] Load test: 100 concurrent requests without degradation
- [ ] Security: OAuth tokens encrypted at rest, API keys in secret manager

---

## Files to Create/Modify

### MCP Adapter - Provider Infrastructure

- `services/mcp-adapter/src/routing/provider-router.ts`
- `services/mcp-adapter/src/routing/priority-router.ts`
- `services/mcp-adapter/src/routing/health-aware-router.ts`
- `services/mcp-adapter/src/routing/fallback-chain.ts`
- `services/mcp-adapter/src/routing/ab-test-router.ts`
- `services/mcp-adapter/src/config/provider-config.service.ts`
- `services/mcp-adapter/src/config/toggle-manager.ts`
- `services/mcp-adapter/src/config/priority-manager.ts`
- `services/mcp-adapter/src/config/feature-flag.service.ts`
- `services/mcp-adapter/src/health/circuit-breaker.ts`
- `services/mcp-adapter/src/health/health-checker.ts`
- `services/mcp-adapter/src/health/rate-limiter.ts`
- `services/mcp-adapter/src/interfaces/provider.interface.ts`
- `services/mcp-adapter/src/interfaces/restaurant.interface.ts`
- `services/mcp-adapter/src/interfaces/menu.interface.ts`
- `services/mcp-adapter/src/interfaces/order.interface.ts`
- `services/mcp-adapter/src/interfaces/delivery.interface.ts`

### Swiggy Provider

- `services/mcp-adapter/src/providers/swiggy/swiggy-mcp-client.ts` (extend)
- `services/mcp-adapter/src/providers/swiggy/swiggy-auth.ts`
- `services/mcp-adapter/src/providers/swiggy/swiggy-mapper.ts` (extend)
- `services/mcp-adapter/src/providers/swiggy/swiggy-rate-limiter.ts`
- `services/mcp-adapter/src/providers/swiggy/swiggy-promotions.ts`
- `services/mcp-adapter/src/providers/swiggy/swiggy.types.ts`

### Zomato Provider

- `services/mcp-adapter/src/providers/zomato/zomato-mcp-client.ts` (extend)
- `services/mcp-adapter/src/providers/zomato/zomato-auth.ts`
- `services/mcp-adapter/src/providers/zomato/zomato-mapper.ts` (extend)
- `services/mcp-adapter/src/providers/zomato/zomato-rate-limiter.ts`
- `services/mcp-adapter/src/providers/zomato/zomato-promotions.ts`
- `services/mcp-adapter/src/providers/zomato/zomato.types.ts`

### ONDC Provider

- `services/mcp-adapter/src/providers/ondc/ondc-protocol-client.ts` (extend)
- `services/mcp-adapter/src/providers/ondc/ondc-signature.ts`
- `services/mcp-adapter/src/providers/ondc/ondc-registry.ts`
- `services/mcp-adapter/src/providers/ondc/ondc-mapper.ts`
- `services/mcp-adapter/src/providers/ondc/ondc-callback-handler.ts`
- `services/mcp-adapter/src/providers/ondc/ondc-compliance.ts`
- `services/mcp-adapter/src/providers/ondc/ondc.types.ts`

### Mock Providers

- `services/mcp-adapter/src/mock/mock-swiggy-server.ts`
- `services/mcp-adapter/src/mock/mock-zomato-server.ts`
- `services/mcp-adapter/src/mock/mock-ondc-network.ts`
- `services/mcp-adapter/src/mock/record-replay.ts`
- `services/mcp-adapter/src/mock/mock-data/restaurants.json`
- `services/mcp-adapter/src/mock/mock-data/menus.json`
- `services/mcp-adapter/src/mock/mock-data/orders.json`

### Monitoring

- `services/mcp-adapter/src/monitoring/sla-tracker.ts`
- `services/mcp-adapter/src/monitoring/cost-tracker.ts`
- `services/mcp-adapter/src/monitoring/alert-manager.ts`
- `services/mcp-adapter/src/monitoring/provider-dashboard.controller.ts`

### Tests

- `services/mcp-adapter/src/__tests__/routing/provider-router.spec.ts`
- `services/mcp-adapter/src/__tests__/routing/circuit-breaker.spec.ts`
- `services/mcp-adapter/src/__tests__/routing/rate-limiter.spec.ts`
- `services/mcp-adapter/src/__tests__/routing/fallback-chain.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/swiggy/swiggy-client.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/swiggy/swiggy-auth.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/swiggy/swiggy-mapper.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/zomato/zomato-client.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/zomato/zomato-auth.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/zomato/zomato-mapper.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/ondc/ondc-client.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/ondc/ondc-signature.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/ondc/ondc-registry.spec.ts`
- `services/mcp-adapter/src/__tests__/providers/ondc/ondc-compliance.spec.ts`
- `services/mcp-adapter/src/__tests__/contract/swiggy-contract.spec.ts`
- `services/mcp-adapter/src/__tests__/contract/zomato-contract.spec.ts`
- `services/mcp-adapter/src/__tests__/contract/ondc-contract.spec.ts`
- `services/mcp-adapter/src/__tests__/e2e/provider-swiggy.spec.ts`
- `services/mcp-adapter/src/__tests__/e2e/provider-zomato.spec.ts`
- `services/mcp-adapter/src/__tests__/e2e/provider-ondc.spec.ts`
- `services/mcp-adapter/src/__tests__/e2e/provider-failover.spec.ts`
- `services/mcp-adapter/src/__tests__/e2e/circuit-breaker-recovery.spec.ts`
- `services/mcp-adapter/src/__tests__/load/concurrent-requests.spec.ts`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Swiggy/Zomato MCP server API changes | High | High | Version pinning, contract tests, change detection alerts |
| ONDC compliance certification delays | Medium | High | Start compliance testing early, engage ONDC team |
| Rate limiting causing order failures | Medium | High | Queuing, backpressure, rate limit monitoring |
| OAuth token expiry during order flow | Medium | Medium | Proactive token refresh, retry with fresh token |
| Provider outage during peak hours | Medium | High | Multi-provider fallback, circuit breaker, mock fallback |
| Schema drift between providers | High | Medium | Strict response mapping, validation layer, alerts |
| ONDC digital signature verification failures | Medium | Medium | Key rotation strategy, signature debugging tools |

---

## Dependencies

- Swiggy MCP server manifest (external)
- Zomato MCP server manifest (external)
- ONDC protocol specification v1.2+
- ONDC buyer app registration (requires business registration)
- @modelcontextprotocol/sdk (MCP client)
- libsodium or tweetnacl (Ed25519 signatures for ONDC)
- TASK-OAUTH-002 (OAuth infrastructure)
- TASK-MCP-004 (MCP adapter base)
- Express (for mock servers)
- Prometheus + Grafana (for monitoring dashboard)

---

**This document is a living guide. Update it as implementation progresses.**
