# REST API Integration Plan - Swiggy & Zomato

# ⚠️ DEPRECATED PLAN

**This plan was superseded by:**
- Chrome Plugin Integration Plan (browser automation)
- Internal Provider implementation (mock data)

**Reason:** Swiggy/Zomato do not provide public REST APIs
**Date Deprecated:** 2026-02-20
**Replaced By:** Chrome Extension Integration (see `chrome-extension/` directory)

**Original Status:** Planning Phase (never implemented)

---

**Created:** 2026-02-19
**Status:** ~~Planning Phase~~ **DEPRECATED**
**Version:** 1.0.0

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Feasibility Analysis](#2-feasibility-analysis)
- [3. API Research & Discovery](#3-api-research--discovery)
- [4. Architecture Design](#4-architecture-design)
- [5. Implementation Plan](#5-implementation-plan)
- [6. Testing Strategy](#6-testing-strategy)
- [7. Agent Task Breakdown](#7-agent-task-breakdown)
- [8. Risks & Mitigations](#8-risks--mitigations)

---

## 1. Executive Summary

This document outlines a comprehensive plan to integrate with Swiggy and Zomato using their **official REST APIs** as an alternative to the Model Context Protocol (MCP) approach. Based on research findings that MCP servers are not publicly accessible for third-party applications, this plan pivots to REST API integration.

### Key Objectives

1. **Verify API Availability**: Confirm Swiggy and Zomato provide public REST APIs for restaurant search, menu retrieval, and order placement
2. **Obtain API Access**: Register as developers, obtain API keys/credentials, review Terms of Service
3. **Test APIs**: Validate API endpoints, response formats, rate limits, and authentication mechanisms
4. **Implement Integration**: Build REST API clients in the MCP Orchestrator service with proper error handling and resilience patterns
5. **Data Normalization**: Map platform-specific responses to FoodBot's internal data models
6. **Fallback Strategy**: Maintain Mock provider as fallback when external APIs are unavailable

### Success Criteria

- [ ] Swiggy REST API access obtained and tested
- [ ] Zomato REST API access obtained and tested
- [ ] API clients implemented with 80%+ test coverage
- [ ] Response time < 2 seconds at p95
- [ ] Circuit breaker and retry logic implemented
- [ ] Data normalization complete with schema validation
- [ ] Integration tests passing for all critical workflows

---

## 2. Feasibility Analysis

### 2.1 Swiggy REST API

#### Research Findings

**Developer Portal:**
- **URL**: https://developers.swiggy.com/ (needs verification)
- **Status**: Swiggy has traditionally been closed to public API access
- **Partner Program**: Swiggy Partner Program exists for restaurant partners, but typically does not provide search/order APIs

**Expected API Capabilities:**
```
✅ Restaurant Search - Search by location, cuisine, rating
✅ Menu Retrieval - Get dishes, prices, availability
❌ Order Placement - Likely restricted to partners only
❌ Order Tracking - Likely restricted to partners only
❓ User Authentication - OAuth 2.0 or API Key (needs verification)
```

**Feasibility Score: 3/10**

**Assessment:** Swiggy does not provide a public API for third-party aggregators. The GitHub MCP manifest repository exists but actual API access is restricted to approved partners. Without official API access, REST integration is not feasible.

**Alternative Approaches:**
1. **Business Partnership**: Apply for Swiggy Partner Program (3-6 months approval)
2. **Chrome Plugin**: Browser automation with user consent (see Chrome Plugin Plan)
3. **Mock Data**: Continue using internal Mock provider for development

#### Action Items

- [ ] **Task 1.1**: Visit https://developers.swiggy.com/ and verify portal existence
- [ ] **Task 1.2**: Check for public API documentation or developer registration
- [ ] **Task 1.3**: Research Swiggy Partner Program application process
- [ ] **Task 1.4**: Contact Swiggy developer relations (if available)
- [ ] **Task 1.5**: Document findings and update feasibility score

---

### 2.2 Zomato REST API

#### Research Findings

**Developer Portal:**
- **URL**: https://developers.zomato.com/api (DEPRECATED as of 2020)
- **Status**: ❌ **Zomato officially discontinued their public API in 2020**
- **Reason**: Business model shift - Zomato moved to closed-partner ecosystem

**Historical API Capabilities (Now Deprecated):**
```
✅ Restaurant Search - search endpoint (DEPRECATED)
✅ Menu Retrieval - dailymenu endpoint (DEPRECATED)
❌ Order Placement - Never publicly available
❌ Order Tracking - Never publicly available
✅ Authentication - API Key (DEPRECATED - no new keys issued)
```

**Feasibility Score: 1/10**

**Assessment:** Zomato REST API is **officially discontinued**. The API was shut down in 2020 and no new API keys are being issued. Existing keys for legacy users may still work but are not available to new developers.

**Alternative Approaches:**
1. **Business Partnership**: Direct B2B partnership discussions with Zomato (6+ months)
2. **Chrome Plugin**: Browser automation approach (most viable)
3. **Mock Data**: Use internal Mock provider

#### Action Items

- [ ] **Task 2.1**: Verify API deprecation status on developers.zomato.com
- [ ] **Task 2.2**: Search for any new Zomato developer programs or beta APIs
- [ ] **Task 2.3**: Research Zomato for Business API (restaurant partner API)
- [ ] **Task 2.4**: Document findings and confirm no public API available

---

### 2.3 Alternative Public APIs

Since Swiggy and Zomato do not provide public APIs, consider these alternatives for restaurant data:

#### Google Places API

- **Status**: ✅ Publicly Available
- **Capabilities**: Restaurant search, details, photos, reviews, ratings
- **Limitations**: No order placement, no delivery integration
- **Use Case**: Supplement internal Mock provider with real restaurant metadata

#### Uber Eats API

- **Status**: ❓ Partner-only
- **Capabilities**: Restaurant onboarding, order management (for partners)
- **Limitations**: Not for consumer applications

#### DoorDash Drive API

- **Status**: ✅ Available for delivery-as-a-service
- **Capabilities**: Delivery logistics, order fulfillment
- **Limitations**: Requires restaurant to use DoorDash for delivery

#### Recommendation

For MVP/Phase 1, use **Internal Mock Provider** with rich dummy data (already implemented with 54 restaurants, 500+ dishes). Enhance with **Google Places API** for real restaurant metadata where needed.

---

## 3. API Research & Discovery

### 3.1 Research Checklist

#### For Each Platform (Swiggy, Zomato):

- [ ] **Developer Portal Discovery**
  - [ ] Find and visit developer portal URL
  - [ ] Check for API documentation
  - [ ] Look for authentication guides
  - [ ] Review Terms of Service

- [ ] **Registration Process**
  - [ ] Create developer account
  - [ ] Complete KYC/verification if required
  - [ ] Apply for API access/keys
  - [ ] Note approval timeline

- [ ] **API Documentation Review**
  - [ ] List available endpoints
  - [ ] Identify authentication method (API Key, OAuth 2.0, JWT)
  - [ ] Note rate limits (requests per minute/hour/day)
  - [ ] Check for sandbox/test environment
  - [ ] Review request/response schemas
  - [ ] Identify pagination patterns
  - [ ] Check for webhooks support

- [ ] **API Testing**
  - [ ] Test authentication flow
  - [ ] Test restaurant search endpoint
  - [ ] Test menu retrieval endpoint
  - [ ] Test order placement endpoint (if available)
  - [ ] Measure response times
  - [ ] Validate response schemas
  - [ ] Test error handling (401, 403, 429, 500)

- [ ] **Cost Analysis**
  - [ ] Check for free tier limits
  - [ ] Review paid plan pricing
  - [ ] Calculate estimated monthly costs
  - [ ] Identify cost optimization strategies

---

### 3.2 Expected API Endpoints

Based on typical food delivery REST APIs, we expect these endpoints:

#### Restaurant Search

```http
GET /api/v1/restaurants/search
Authorization: Bearer {api_key}

Query Parameters:
- lat: number (required) - User latitude
- lon: number (required) - User longitude
- radius: number - Search radius in km (default: 5)
- cuisine: string - Filter by cuisine type
- sort: string - Sort by (relevance, rating, distance, delivery_time)
- page: number - Page number (default: 1)
- limit: number - Results per page (default: 20)

Response: {
  "restaurants": [
    {
      "id": "string",
      "name": "string",
      "cuisine": ["string"],
      "rating": number,
      "reviewCount": number,
      "deliveryTime": number,
      "priceRange": string,
      "location": {
        "lat": number,
        "lon": number,
        "address": "string"
      },
      "isOpen": boolean
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "totalCount": number,
    "totalPages": number
  }
}
```

#### Restaurant Details

```http
GET /api/v1/restaurants/{id}
Authorization: Bearer {api_key}

Response: {
  "id": "string",
  "name": "string",
  "description": "string",
  "cuisine": ["string"],
  "rating": number,
  "reviewCount": number,
  "deliveryTime": number,
  "priceRange": string,
  "location": {...},
  "menu": {
    "categories": [
      {
        "id": "string",
        "name": "string",
        "dishes": [
          {
            "id": "string",
            "name": "string",
            "description": "string",
            "price": number,
            "image": "string",
            "dietary": ["vegetarian", "vegan"],
            "available": boolean
          }
        ]
      }
    ]
  }
}
```

#### Order Placement

```http
POST /api/v1/orders
Authorization: Bearer {user_token}
Content-Type: application/json

{
  "restaurantId": "string",
  "items": [
    {
      "dishId": "string",
      "quantity": number,
      "customizations": ["string"]
    }
  ],
  "deliveryAddress": {
    "street": "string",
    "city": "string",
    "pincode": "string",
    "lat": number,
    "lon": number
  },
  "paymentMethod": "string"
}

Response: {
  "orderId": "string",
  "status": "pending",
  "total": number,
  "estimatedDeliveryTime": number
}
```

---

## 4. Architecture Design

### 4.1 High-Level Architecture

```
┌─────────────────┐
│  Customer App   │
│   (React/TS)    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   Gateway API   │
│   (NestJS/TS)   │
└────────┬────────┘
         │ gRPC
         ▼
┌─────────────────┐
│ MCP Orchestrator│ ◄── Main Integration Point
│ (Spring Boot)   │
└────────┬────────┘
         │
   ┌─────┴─────────────┐
   │                   │
   ▼                   ▼
┌──────────┐    ┌──────────┐
│ Swiggy   │    │ Zomato   │
│ REST API │    │ REST API │
│ Client   │    │ Client   │
└──────────┘    └──────────┘
```

### 4.2 Component Design

#### SwiggyRestClient (Java)

```java
@Service
@Slf4j
public class SwiggyRestClient implements MCPProviderClient {

    private final RestTemplate restTemplate;
    private final SwiggyApiConfig config;
    private final DataMapper dataMapper;
    private final CacheService cacheService;

    @CircuitBreaker(name = "swiggy-rest",
        fallbackMethod = "searchFallback")
    @RateLimiter(name = "swiggy-rest")
    @Retry(name = "swiggy-rest")
    @Override
    public SearchResponse searchRestaurants(SearchRequest request) {

        // Check cache
        String cacheKey = cacheService.generateKey(
            "swiggy", "search", request);
        return cacheService.get(cacheKey, SearchResponse.class)
            .orElseGet(() -> {

                // Call Swiggy REST API
                ResponseEntity<SwiggySearchResponse> response =
                    restTemplate.exchange(
                        buildSearchUrl(request),
                        HttpMethod.GET,
                        buildHeaders(),
                        SwiggySearchResponse.class
                    );

                // Map to internal model
                List<Restaurant> restaurants = dataMapper
                    .mapSwiggyRestaurants(response.getBody());

                SearchResponse result = SearchResponse.builder()
                    .restaurants(restaurants)
                    .provider("swiggy")
                    .build();

                // Cache for 10 minutes
                cacheService.put(cacheKey, result,
                    Duration.ofMinutes(10));

                return result;
            });
    }

    private String buildSearchUrl(SearchRequest request) {
        return UriComponentsBuilder
            .fromHttpUrl(config.getBaseUrl())
            .path("/api/v1/restaurants/search")
            .queryParam("lat", request.getLocation().getLat())
            .queryParam("lon", request.getLocation().getLon())
            .queryParam("query", request.getQuery())
            .queryParam("page", request.getPage())
            .queryParam("limit", request.getPageSize())
            .build()
            .toUriString();
    }

    private HttpEntity<?> buildHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(config.getApiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(headers);
    }
}
```

#### Configuration

```yaml
# application.yml
swiggy:
  api:
    base-url: https://api.swiggy.com
    api-key: ${SWIGGY_API_KEY}
    timeout: 5000
  resilience:
    circuit-breaker:
      failure-rate-threshold: 50
      wait-duration-in-open-state: 30000
      sliding-window-size: 100
    rate-limiter:
      limit-for-period: 50
      limit-refresh-period: 60s
    retry:
      max-attempts: 3
      wait-duration: 1000

zomato:
  api:
    base-url: https://api.zomato.com
    api-key: ${ZOMATO_API_KEY}
    timeout: 5000
  resilience:
    circuit-breaker:
      failure-rate-threshold: 50
      wait-duration-in-open-state: 30000
      sliding-window-size: 100
    rate-limiter:
      limit-for-period: 50
      limit-refresh-period: 60s
    retry:
      max-attempts: 3
      wait-duration: 1000
```

---

## 5. Implementation Plan

### Phase 1: Research & Discovery (Week 1)

#### Agent Tasks

1. **Research Swiggy API**
   - **Agent**: `explore-agent`
   - **Input**: "Research Swiggy developer portal, API documentation, registration process"
   - **Output**: Feasibility report with screenshots and findings
   - **Duration**: 1 day

2. **Research Zomato API**
   - **Agent**: `explore-agent`
   - **Input**: "Research Zomato developer portal, verify API deprecation, look for alternatives"
   - **Output**: Feasibility report with deprecation confirmation
   - **Duration**: 1 day

3. **Research Alternative APIs**
   - **Agent**: `explore-agent`
   - **Input**: "Research Google Places API, Uber Eats API, DoorDash API for restaurant data"
   - **Output**: Comparison matrix with capabilities and pricing
   - **Duration**: 1 day

4. **Decision Document**
   - **Agent**: Manual (human review)
   - **Input**: All research findings
   - **Output**: Go/No-Go decision for REST API integration
   - **Duration**: 2 days

---

### Phase 2: API Access & Testing (Week 2-3)

**Prerequisites**: API access confirmed from Phase 1

#### Agent Tasks

5. **Register for API Access**
   - **Agent**: Manual (human action required)
   - **Tasks**:
     - Create developer accounts
     - Complete verification/KYC
     - Apply for API keys
     - Review and accept Terms of Service
   - **Duration**: 3-5 days (depends on approval time)

6. **API Testing Script**
   - **Agent**: `code-agent`
   - **Input**: "Create Node.js script to test Swiggy REST API endpoints with sample queries"
   - **Output**: `test-swiggy-api.ts` with test cases
   - **Duration**: 4 hours

7. **Run API Tests**
   - **Agent**: Manual (human execution)
   - **Tasks**:
     - Test authentication
     - Test restaurant search
     - Test menu retrieval
     - Measure response times
     - Validate schemas
   - **Output**: Test results document
   - **Duration**: 1 day

8. **Schema Validation**
   - **Agent**: `code-agent`
   - **Input**: "Create Zod schemas for Swiggy API responses"
   - **Output**: `swiggy-api.schemas.ts`
   - **Duration**: 4 hours

---

### Phase 3: Client Implementation (Week 4-5)

**Prerequisites**: API tested and validated

#### Agent Tasks

9. **Create SwiggyRestClient**
   - **Agent**: `code-agent`
   - **Input**: "Implement SwiggyRestClient.java with RestTemplate, circuit breaker, rate limiter"
   - **Files**:
     - `services/mcp-orchestrator/.../providers/swiggy/SwiggyRestClient.java`
     - `services/mcp-orchestrator/.../config/SwiggyApiConfig.java`
   - **Duration**: 2 days

10. **Create ZomatoRestClient**
    - **Agent**: `code-agent`
    - **Input**: "Implement ZomatoRestClient.java with RestTemplate, circuit breaker, rate limiter"
    - **Files**:
      - `services/mcp-orchestrator/.../providers/zomato/ZomatoRestClient.java`
      - `services/mcp-orchestrator/.../config/ZomatoApiConfig.java`
    - **Duration**: 2 days

11. **Data Mappers**
    - **Agent**: `code-agent`
    - **Input**: "Create data mappers to convert Swiggy/Zomato responses to FoodBot Restaurant model"
    - **Files**:
      - `SwiggyDataMapper.java`
      - `ZomatoDataMapper.java`
    - **Duration**: 1 day

12. **Configuration**
    - **Agent**: `code-agent`
    - **Input**: "Update application.yml with Swiggy/Zomato REST API configuration"
    - **Files**: `services/mcp-orchestrator/src/main/resources/application.yml`
    - **Duration**: 2 hours

---

### Phase 4: Testing & Validation (Week 6)

#### Agent Tasks

13. **Unit Tests**
    - **Agent**: `test-agent`
    - **Input**: "Write unit tests for SwiggyRestClient and ZomatoRestClient with mocked responses"
    - **Files**:
      - `SwiggyRestClientTest.java`
      - `ZomatoRestClientTest.java`
    - **Coverage Target**: 80%+
    - **Duration**: 2 days

14. **Integration Tests**
    - **Agent**: `test-agent`
    - **Input**: "Write integration tests calling real Swiggy/Zomato APIs (if sandbox available)"
    - **Files**: `SwiggyIntegrationTest.java`
    - **Duration**: 1 day

15. **Performance Tests**
    - **Agent**: `test-agent`
    - **Input**: "Load test REST API clients with 100 concurrent requests, measure p95 latency"
    - **Tools**: JMeter or k6
    - **Duration**: 1 day

16. **Resilience Tests**
    - **Agent**: `test-agent`
    - **Input**: "Test circuit breaker, rate limiter, and retry logic with chaos engineering"
    - **Scenarios**:
      - API returns 500 errors
      - API times out
      - API rate limit exceeded
    - **Duration**: 1 day

---

### Phase 5: Documentation & Deployment (Week 7)

#### Agent Tasks

17. **API Documentation**
    - **Agent**: `docs-agent`
    - **Input**: "Document Swiggy/Zomato REST API integration in ARCHITECTURE.md"
    - **Duration**: 4 hours

18. **Deployment Guide**
    - **Agent**: `docs-agent`
    - **Input**: "Create deployment guide for REST API clients with environment variables"
    - **Duration**: 4 hours

19. **Monitoring Setup**
    - **Agent**: `code-agent`
    - **Input**: "Add Prometheus metrics for REST API calls (request count, latency, errors)"
    - **Duration**: 4 hours

20. **Production Deployment**
    - **Agent**: Manual (human action)
    - **Tasks**:
      - Deploy to staging environment
      - Run smoke tests
      - Deploy to production
      - Monitor metrics for 24 hours
    - **Duration**: 1 day

---

## 6. Testing Strategy

### 6.1 Test Pyramid

```
       E2E Tests (5%)
       ↑
  Integration Tests (25%)
       ↑
    Unit Tests (70%)
```

### 6.2 Unit Tests

**Target Coverage: 80%+**

**Test Cases:**
```java
@Test
void searchRestaurants_shouldReturnResults_whenApiRespondsSuccessfully() {
    // Given
    SearchRequest request = SearchRequest.builder()
        .query("pizza")
        .location(new Location(12.9716, 77.5946))
        .build();

    SwiggySearchResponse mockResponse = createMockSwiggyResponse();
    when(restTemplate.exchange(anyString(), eq(HttpMethod.GET),
        any(), eq(SwiggySearchResponse.class)))
        .thenReturn(ResponseEntity.ok(mockResponse));

    // When
    SearchResponse result = swiggyRestClient.searchRestaurants(request);

    // Then
    assertThat(result.getRestaurants()).hasSize(10);
    assertThat(result.getProvider()).isEqualTo("swiggy");
}

@Test
void searchRestaurants_shouldFallbackToMock_whenApiThrowsException() {
    // Given
    SearchRequest request = createSearchRequest();
    when(restTemplate.exchange(anyString(), any(), any(), any()))
        .thenThrow(new RestClientException("API unavailable"));

    // When
    SearchResponse result = swiggyRestClient.searchRestaurants(request);

    // Then
    assertThat(result.getRestaurants()).isEmpty();
    assertThat(result.getError()).contains("unavailable");
}

@Test
void searchRestaurants_shouldUseCache_whenSameRequestMadeWithin10Minutes() {
    // Given
    SearchRequest request = createSearchRequest();

    // When
    SearchResponse result1 = swiggyRestClient.searchRestaurants(request);
    SearchResponse result2 = swiggyRestClient.searchRestaurants(request);

    // Then
    verify(restTemplate, times(1)).exchange(any(), any(), any(), any());
    assertThat(result1).isEqualTo(result2);
}
```

### 6.3 Integration Tests

**Test with real APIs (if available) or mock server**

```java
@SpringBootTest
@Testcontainers
class SwiggyRestClientIntegrationTest {

    @Container
    static MockServerContainer mockServer = new MockServerContainer(
        "mockserver/mockserver:5.15.0"
    );

    @Test
    void searchRestaurants_shouldCallRealEndpoint() {
        // Setup mock server expectations
        new MockServerClient(mockServer.getHost(), mockServer.getServerPort())
            .when(request()
                .withPath("/api/v1/restaurants/search")
                .withQueryStringParameter("lat", "12.9716")
                .withQueryStringParameter("lon", "77.5946"))
            .respond(response()
                .withStatusCode(200)
                .withBody(readFixture("swiggy-search-response.json"))
                .withHeader("Content-Type", "application/json"));

        // Call client
        SearchResponse result = swiggyRestClient.searchRestaurants(
            createSearchRequest());

        // Verify
        assertThat(result.getRestaurants()).isNotEmpty();
    }
}
```

### 6.4 Performance Tests

**Load Testing with k6**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp up to 50 users
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% requests < 2s
    http_req_failed: ['rate<0.05'],    // < 5% failure rate
  },
};

export default function () {
  const url = 'http://localhost:8081/mcp/v1/restaurants/search';
  const payload = JSON.stringify({
    query: 'pizza',
    lat: 12.9716,
    lon: 77.5946,
    providers: ['swiggy', 'zomato'],
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.API_TOKEN}`,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response has restaurants': (r) =>
      JSON.parse(r.body).restaurants.length > 0,
  });

  sleep(1);
}
```

---

## 7. Agent Task Breakdown

### Task List for Multi-Agent System

#### Discovery & Research Agents

| ID | Agent Type | Task Description | Input | Output | Duration |
|----|------------|------------------|-------|--------|----------|
| T1 | explore-agent | Research Swiggy developer portal and API docs | Portal URL | Feasibility report | 1 day |
| T2 | explore-agent | Research Zomato developer portal and verify deprecation | Portal URL | Deprecation confirmation | 1 day |
| T3 | explore-agent | Research alternative restaurant APIs (Google Places, etc.) | API list | Comparison matrix | 1 day |

#### Implementation Agents

| ID | Agent Type | Task Description | Input | Output | Duration |
|----|------------|------------------|-------|--------|----------|
| T4 | code-agent | Create SwiggyRestClient.java | API spec, interface | Java class + config | 2 days |
| T5 | code-agent | Create ZomatoRestClient.java | API spec, interface | Java class + config | 2 days |
| T6 | code-agent | Create data mappers (Swiggy, Zomato) | Response schemas | Mapper classes | 1 day |
| T7 | code-agent | Update application.yml configuration | Config requirements | Updated YAML | 2 hours |

#### Testing Agents

| ID | Agent Type | Task Description | Input | Output | Duration |
|----|------------|------------------|-------|--------|----------|
| T8 | test-agent | Write unit tests for REST clients | Client classes | Test files | 2 days |
| T9 | test-agent | Write integration tests | Client classes | Integration tests | 1 day |
| T10 | test-agent | Run performance load tests | k6 script | Load test report | 1 day |
| T11 | test-agent | Run resilience chaos tests | Chaos scenarios | Resilience report | 1 day |

#### Documentation Agents

| ID | Agent Type | Task Description | Input | Output | Duration |
|----|------------|------------------|-------|--------|----------|
| T12 | docs-agent | Update ARCHITECTURE.md with REST API integration | Implementation details | Updated docs | 4 hours |
| T13 | docs-agent | Create deployment guide | Env vars, configs | Deployment guide | 4 hours |

---

## 8. Risks & Mitigations

### Risk Matrix

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | No public API available from Swiggy/Zomato | **High** | Critical | Use Mock provider, apply for partner program, consider Chrome plugin |
| R2 | API keys take weeks to approve | Medium | High | Start application process early, use Mock provider meanwhile |
| R3 | Rate limits are too restrictive | Medium | High | Implement aggressive caching (10 min TTL), request batching |
| R4 | API responses don't match expected schema | Medium | Medium | Schema validation with Zod, adapter pattern for mapping |
| R5 | API costs exceed budget | Low | High | Monitor usage, implement cost alerts, optimize cache strategy |
| R6 | API deprecated after integration | Low | Critical | Maintain Mock provider, monitor deprecation notices |
| R7 | Terms of Service prohibit aggregation | Medium | Critical | Legal review before launch, apply for partner status |
| R8 | Authentication flow is complex (OAuth 2.0) | Medium | Medium | Implement OAuth flow in Gateway API, store tokens encrypted |

### Critical Risk: R1 - No Public API Available

**Analysis**: Based on research, both Swiggy and Zomato have historically been closed ecosystems without public APIs. The MCP repositories are specification/manifest repos, not actual running API servers accessible to third parties.

**Mitigation Plan**:

```
IF Swiggy API NOT available:
  ├─ Option 1: Apply for Swiggy Partner Program
  │  ├─ Expected Timeline: 3-6 months
  │  ├─ Approval Probability: Low (requires restaurant partnerships)
  │  └─ Action: Submit application, wait for response
  │
  ├─ Option 2: Chrome Plugin with Browser Automation
  │  ├─ Expected Timeline: 4-6 weeks implementation
  │  ├─ Technical Feasibility: High
  │  └─ Action: See Chrome Plugin Integration Plan
  │
  └─ Option 3: Use Mock Provider + Google Places API
     ├─ Expected Timeline: 1 week
     ├─ Data Quality: Good (real restaurant metadata)
     └─ Action: Enhance Mock provider with Google Places data
```

**Recommendation**: Proceed with **Option 3 (Mock + Google Places)** for MVP launch, implement **Option 2 (Chrome Plugin)** in Phase 2 if partner APIs remain unavailable.

---

## 9. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-02-19 | Prioritize REST API research over MCP | MCP protocol not accessible for third-party apps |
| 2026-02-19 | Document feasibility as "Low" until API access confirmed | Swiggy/Zomato historically closed to public APIs |
| 2026-02-19 | Plan for Mock provider + Google Places API as fallback | Ensures MVP can launch even without partner APIs |
| 2026-02-19 | Implement resilience patterns (circuit breaker, retry) | External APIs can fail; graceful degradation required |

---

## 10. Next Steps

### Immediate Actions (This Week)

1. **Verify Swiggy API Availability**
   - [ ] Visit https://developers.swiggy.com/
   - [ ] Screenshot and document findings
   - [ ] Update feasibility score

2. **Verify Zomato API Status**
   - [ ] Confirm API deprecation
   - [ ] Check for any new developer programs
   - [ ] Update feasibility score

3. **Research Google Places API**
   - [ ] Review documentation
   - [ ] Obtain API key
   - [ ] Test restaurant search
   - [ ] Evaluate as Mock provider enhancement

4. **Go/No-Go Decision**
   - [ ] Review all findings
   - [ ] Decide: REST API vs Chrome Plugin vs Mock+Google
   - [ ] Update project roadmap

### Follow-Up Actions (Next 2 Weeks)

- If APIs available: Proceed with Phase 2 (API Access & Testing)
- If APIs not available: Pivot to Chrome Plugin Integration Plan
- Continue development with Mock provider for immediate needs

---

**Document Status**: Planning Phase - Awaiting API Availability Confirmation
**Next Review**: After feasibility research complete (Week 1)
**Related Documents**:
- [MCP Research & Feasibility Report](../prompt-docs/MCP_RESEARCH_REPORT.md)
- [Chrome Plugin Integration Plan](./CHROME_PLUGIN_INTEGRATION_PLAN.md)
- [Architecture Documentation](./ARCHITECTURE_FINAL.md)
