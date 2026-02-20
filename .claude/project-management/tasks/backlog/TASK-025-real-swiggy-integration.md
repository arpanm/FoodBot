# TASK-025: Real Swiggy API Integration

**Status:** Backlog
**Priority:** P1 (High)
**Component:** MCP Aggregation Layer
**Assigned To:** Unassigned
**Estimated Effort:** 3 weeks
**Dependencies:** Partnership agreement with Swiggy

## Description

Replace mock Swiggy implementation with real API integration once partnership agreement is established.

## Context

Currently, Swiggy integration uses mock data because:
1. Swiggy doesn't provide public APIs
2. No partnership agreement in place
3. OAuth integration framework ready but untested

## Requirements

- FR-MCP-SWIGGY-001: Swiggy MCP Server Integration
- Official Swiggy API documentation
- API keys and credentials
- OAuth 2.0 flow testing with real endpoints

## Prerequisites

- [ ] Partnership agreement signed with Swiggy
- [ ] API access granted
- [ ] API documentation received
- [ ] Test environment credentials received
- [ ] Rate limits and quotas defined

## Implementation Checklist

- [ ] Review Swiggy API documentation
- [ ] Update SwiggyAPIProvider with real endpoints
- [ ] Implement OAuth flow with real authorization server
- [ ] Add data mapping layer (Swiggy → FoodBot schema)
- [ ] Handle Swiggy-specific error codes
- [ ] Implement rate limiting per Swiggy quotas
- [ ] Add comprehensive error handling
- [ ] Update ID mapping (Swiggy IDs → Internal IDs)
- [ ] Test all API endpoints
- [ ] Update unit tests with real API responses
- [ ] Integration testing with staging environment
- [ ] Load testing with production-like data
- [ ] Update monitoring and alerting
- [ ] Documentation update
- [ ] Deploy to production

## API Endpoints to Implement

```
GET  /api/v1/restaurants/search
GET  /api/v1/restaurants/:id
GET  /api/v1/restaurants/:id/menu
POST /api/v1/cart
GET  /api/v1/cart/:id
POST /api/v1/orders
GET  /api/v1/orders/:id
GET  /api/v1/orders/:id/tracking
```

## Data Mapping

```typescript
// Swiggy → FoodBot
interface DataMapper {
  mapRestaurant(swiggyRestaurant: SwiggyRestaurant): Restaurant;
  mapDish(swiggyDish: SwiggyDish): Dish;
  mapOrder(swiggyOrder: SwiggyOrder): Order;
  mapAddress(swiggyAddress: SwiggyAddress): Address;
}
```

## Testing Strategy

1. **Unit Tests:** Mock Swiggy API responses
2. **Integration Tests:** Use Swiggy staging environment
3. **E2E Tests:** Full order flow in test environment
4. **Performance Tests:** Load testing with real API
5. **Security Tests:** OAuth flow, token encryption

## Risks

- **High:** Swiggy API may differ from documentation
- **High:** Rate limits may be restrictive
- **Medium:** Data format changes may break mapping
- **Medium:** OAuth flow complexity
- **Low:** Network latency to Swiggy servers

## Mitigation

- Early API testing with sandbox
- Fallback to browser automation if API fails
- Comprehensive error handling
- Circuit breaker to prevent cascading failures
- Extensive monitoring and alerting

## Acceptance Criteria

- [ ] All Swiggy API endpoints integrated
- [ ] OAuth flow works end-to-end
- [ ] Data mapping accurate (>99%)
- [ ] Error handling comprehensive
- [ ] Rate limiting respected
- [ ] Performance: p95 < 2s
- [ ] Test coverage > 85%
- [ ] Production deployment successful
- [ ] No critical bugs for 1 week

## Estimated Timeline

- Week 1: API review, OAuth implementation, data mapping
- Week 2: Error handling, testing, monitoring
- Week 3: Integration testing, staging deployment, production release

## Resources Required

- 1 Backend Engineer (full-time)
- 1 QA Engineer (part-time)
- Swiggy technical contact (for API questions)
- Staging and production API keys
