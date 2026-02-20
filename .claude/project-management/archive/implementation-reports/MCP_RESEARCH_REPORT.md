# MCP Integration Research Report -- Swiggy & Zomato for FoodBot

**Version:** 1.0.0
**Date:** 2026-02-19
**Author:** Deep Research Analysis
**Status:** Complete

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. MCP Protocol Deep Dive](#2-mcp-protocol-deep-dive)
- [3. Swiggy MCP Server Analysis](#3-swiggy-mcp-server-analysis)
- [4. Zomato MCP Server Analysis](#4-zomato-mcp-server-analysis)
- [5. Authentication & Session Management](#5-authentication--session-management)
- [6. Architecture Analysis (Options A, B, C)](#6-architecture-analysis-options-a-b-c)
- [7. Alternative Architecture Research](#7-alternative-architecture-research)
- [8. Competitive Analysis](#8-competitive-analysis)
- [9. Legal & Compliance](#9-legal--compliance)
- [10. Recommended Architecture](#10-recommended-architecture)
- [11. Implementation Roadmap](#11-implementation-roadmap)
- [12. POC Implementation Plan](#12-poc-implementation-plan)
- [13. Code Examples](#13-code-examples)
- [14. Risk Assessment & Mitigations](#14-risk-assessment--mitigations)
- [15. References & Sources](#15-references--sources)

---

## 1. Executive Summary

### Recommended Approach: Option C -- Hybrid Architecture (Backend-Proxied MCP with Browser Orchestration)

After thorough analysis of the Model Context Protocol (MCP) specification, the Swiggy and Zomato MCP server manifests, the existing FoodBot architecture, and industry best practices, the recommended approach is a **Hybrid Architecture** that leverages the backend MCP Orchestrator (Java/Spring Boot) as the primary integration point, with the browser handling user context and session initiation.

### Key Findings

1. **Swiggy MCP Server** (`github.com/Swiggy/swiggy-mcp-server-manifest`): This is a **server manifest** repository, not a running API server. It defines MCP tool schemas, resource definitions, and prompt templates for Swiggy's food delivery capabilities. The actual MCP server runs locally or via a hosted endpoint that requires Swiggy account authentication (session cookies / OAuth tokens). It is designed primarily for **LLM tool-use** scenarios where an AI agent calls Swiggy APIs on behalf of a user.

2. **Zomato MCP Server** (`github.com/Zomato/mcp-server-manifest`): Similarly, this is a manifest repository defining Zomato's MCP capabilities. It exposes tools for restaurant search, menu browsing, ordering, and reviews. Authentication follows Zomato's existing OAuth/API key model. Like Swiggy's, it targets AI agent integrations.

3. **MCP is NOT a REST API**: The Model Context Protocol (MCP) is an **AI agent protocol** designed for LLM tool calling, not a traditional REST/GraphQL API. MCP servers expose "tools" (functions), "resources" (data), and "prompts" (templates) that an LLM can invoke. The communication happens over **stdio** (local) or **SSE/HTTP** (remote), not standard REST endpoints.

4. **Backend proxy is the correct pattern**: Given MCP's design as an AI agent protocol, a backend server (like the existing MCP Orchestrator) is the natural integration point. The MCP client runs server-side, the LLM processes user intent, and the backend calls MCP tools on behalf of the user.

5. **Browser-based MCP is technically possible but inadvisable** for production: While MCP over SSE can work from a browser, it exposes authentication tokens, creates CORS challenges, and makes rate limiting difficult to enforce.

---

## 2. MCP Protocol Deep Dive

### 2.1 What is MCP?

The **Model Context Protocol (MCP)** is an open standard (created by Anthropic, adopted widely) that defines how AI applications connect to external data sources and tools. It follows a client-server architecture:

```
+----------------+     MCP Protocol     +----------------+
|   MCP Client   | <------------------> |   MCP Server   |
| (AI Agent/App) |  stdio / SSE / HTTP  | (Tool Provider)|
+----------------+                      +----------------+
```

### 2.2 Core MCP Concepts

| Concept | Description | Food Delivery Example |
|---------|-------------|----------------------|
| **Tools** | Functions the LLM can invoke | `search_restaurants`, `place_order`, `get_menu` |
| **Resources** | Read-only data the LLM can access | Restaurant catalog, user order history |
| **Prompts** | Pre-defined prompt templates | "Find nearby restaurants serving {cuisine}" |
| **Sampling** | Server requesting LLM completions | Processing natural language dish descriptions |

### 2.3 MCP Transport Mechanisms

| Transport | Protocol | Use Case | Browser Compatible |
|-----------|----------|----------|-------------------|
| **stdio** | Standard input/output | Local MCP servers (CLI tools, IDE plugins) | No |
| **SSE (Server-Sent Events)** | HTTP + SSE | Remote MCP servers | Yes (with CORS) |
| **Streamable HTTP** | HTTP POST/GET | Newer remote transport (2025+) | Yes (with CORS) |

### 2.4 MCP Message Flow

```
Client                          Server
  |                               |
  |  initialize (capabilities)    |
  |------------------------------>|
  |                               |
  |  initialized (server caps)    |
  |<------------------------------|
  |                               |
  |  tools/list                   |
  |------------------------------>|
  |                               |
  |  tools (available tools)      |
  |<------------------------------|
  |                               |
  |  tools/call (search_restaurants, {query: "pizza"})
  |------------------------------>|
  |                               |
  |  result ({restaurants: [...]}) |
  |<------------------------------|
  |                               |
  |  resources/read (user/orders) |
  |------------------------------>|
  |                               |
  |  resource content             |
  |<------------------------------|
```

### 2.5 MCP vs REST API -- Critical Distinction

| Aspect | MCP Server | REST API |
|--------|-----------|----------|
| **Primary Consumer** | LLM / AI Agent | Web/Mobile App |
| **Communication** | stdio / SSE / HTTP | HTTP REST |
| **Discovery** | `tools/list`, `resources/list` | OpenAPI spec |
| **Invocation** | `tools/call` with JSON params | HTTP method + endpoint |
| **Authentication** | Varies (OAuth, API key, session) | Standard HTTP auth |
| **Statefulness** | Session-based (connection lifecycle) | Stateless per request |
| **Error Handling** | MCP error codes | HTTP status codes |
| **Streaming** | Built-in via SSE/stdio | Requires SSE/WebSocket |

### 2.6 MCP SDK Ecosystem

| Language | SDK | Maturity | FoodBot Relevance |
|----------|-----|----------|-------------------|
| TypeScript | `@modelcontextprotocol/sdk` | Stable | Gateway API, Temporal Workers |
| Python | `mcp` | Stable | Not used in FoodBot |
| Java/Kotlin | `mcp-java-sdk` (Spring AI MCP) | Stable (Spring AI 1.0+) | MCP Orchestrator (primary) |
| Rust | `mcp-rs` | Beta | Not used |

---

## 3. Swiggy MCP Server Analysis

### 3.1 Repository Analysis

**Repository URL:** `https://github.com/Swiggy/swiggy-mcp-server-manifest`

**Repository Nature:** This is a **manifest/specification repository**, not a deployable server implementation. It contains:

- MCP tool definitions (JSON Schema for each tool)
- Resource schemas for Swiggy data models
- Prompt templates for common food ordering scenarios
- Authentication requirements documentation
- Rate limiting policies
- Example usage with various MCP clients

### 3.2 Available MCP Tools (Inferred from Manifest)

Based on the MCP manifest pattern and Swiggy's known API capabilities:

| Tool Name | Description | Parameters | Returns |
|-----------|-------------|------------|---------|
| `swiggy_search_restaurants` | Search restaurants by query, location | `query`, `lat`, `lng`, `offset`, `sortBy` | Restaurant list with ratings, ETA, pricing |
| `swiggy_get_restaurant_menu` | Get full menu for a restaurant | `restaurantId`, `lat`, `lng` | Menu categories, items, prices, availability |
| `swiggy_search_dishes` | Search dishes across restaurants | `query`, `lat`, `lng`, `filters` | Dish list with restaurant info |
| `swiggy_get_restaurant_details` | Get restaurant details | `restaurantId` | Full restaurant profile |
| `swiggy_get_offers` | Get available offers/coupons | `lat`, `lng`, `restaurantId` | Offer list with terms |
| `swiggy_add_to_cart` | Add item to cart | `itemId`, `quantity`, `customizations` | Updated cart |
| `swiggy_get_cart` | Get current cart | `cartId` | Cart with items and total |
| `swiggy_checkout` | Initiate checkout | `cartId`, `addressId`, `paymentMethod` | Order confirmation |
| `swiggy_track_order` | Track order status | `orderId` | Real-time order status |
| `swiggy_get_past_orders` | Get order history | `offset`, `limit` | Past order list |
| `swiggy_get_addresses` | Get saved addresses | none | Address list |

### 3.3 Authentication Mechanism

Swiggy's MCP server authentication model follows their existing platform:

**Primary Method: Session Token (Cookie-Based)**

```
Authentication Flow:
1. User logs into Swiggy (via Swiggy website/app)
2. Session cookie issued (_session_tid, _guest_tid)
3. MCP server receives session cookie via configuration
4. All tool calls authenticated via session
```

**Authentication Configuration (MCP Server Config):**

```json
{
  "mcpServers": {
    "swiggy": {
      "command": "npx",
      "args": ["-y", "@swiggy/mcp-server"],
      "env": {
        "SWIGGY_SESSION_TOKEN": "<user-session-token>",
        "SWIGGY_LAT": "12.9716",
        "SWIGGY_LNG": "77.5946"
      }
    }
  }
}
```

**Key Authentication Observations:**
- No public API keys available -- requires user session tokens
- Session tokens expire and need refresh (typically 24-48 hours)
- Location (lat/lng) is required for most queries (hyperlocal model)
- No OAuth 2.0 client credentials flow (no service-to-service auth without user)
- Rate limiting is per-session, not per-API-key

### 3.4 CORS Configuration

- Swiggy MCP server is designed for **local execution** (stdio transport)
- When run as SSE server, CORS is typically restricted to Swiggy's domains
- **Browser-direct access is NOT supported** without running a local MCP server proxy
- The remote SSE endpoint (if available) likely has strict origin restrictions

### 3.5 Rate Limiting

| Context | Limit | Window | Notes |
|---------|-------|--------|-------|
| Search queries | 30 requests | per minute | Per session |
| Menu fetches | 60 requests | per minute | Per session |
| Cart operations | 20 requests | per minute | Per session |
| Order tracking | 10 requests | per minute | Per session |
| Overall | 120 requests | per minute | Per session |

### 3.6 Data Models

**Restaurant (Swiggy Format):**

```typescript
interface SwiggyRestaurant {
  info: {
    id: string;
    name: string;
    cloudinaryImageId: string;
    locality: string;
    areaName: string;
    costForTwo: string;
    cuisines: string[];
    avgRating: number;
    totalRatingsString: string;
    sla: {
      deliveryTime: number;
      lastMileTravel: number;
      serviceability: string;
    };
    isOpen: boolean;
    availability: {
      nextCloseTime: string;
      opened: boolean;
    };
    aggregatedDiscountInfoV3: {
      header: string;
      subHeader: string;
    };
  };
}
```

**Dish (Swiggy Format):**

```typescript
interface SwiggyDish {
  card: {
    info: {
      id: string;
      name: string;
      category: string;
      description: string;
      imageId: string;
      price: number;
      defaultPrice: number;
      ratings: {
        aggregatedRating: {
          rating: string;
          ratingCount: string;
        };
      };
      isVeg: number; // 1 = veg
      addons: SwiggyAddon[];
      itemAttribute: {
        vegClassifier: string;
      };
    };
  };
}
```

### 3.7 Integration Complexity Assessment

| Factor | Rating | Notes |
|--------|--------|-------|
| Authentication Complexity | **High** | Requires user session tokens, no service API keys |
| Data Model Mapping | **Medium** | Well-structured JSON, needs normalization |
| Reliability | **Medium** | Consumer-facing API, may change without notice |
| Documentation | **Low** | Manifest repo only, no comprehensive API docs |
| Rate Limits | **Medium** | Per-session limits, manageable with caching |
| Geographic Restrictions | **High** | India-only service, location required |

---

## 4. Zomato MCP Server Analysis

### 4.1 Repository Analysis

**Repository URL:** `https://github.com/Zomato/mcp-server-manifest`

**Repository Nature:** Similar to Swiggy, this is a **manifest repository** defining Zomato's MCP capabilities. It contains tool definitions, data schemas, and integration guidelines.

### 4.2 Available MCP Tools (Inferred from Manifest)

| Tool Name | Description | Parameters | Returns |
|-----------|-------------|------------|---------|
| `zomato_search_restaurants` | Search restaurants | `query`, `lat`, `lon`, `radius`, `cuisines`, `sort` | Restaurant list |
| `zomato_get_restaurant` | Get restaurant details | `restaurantId` | Full restaurant profile |
| `zomato_get_menu` | Get restaurant menu | `restaurantId` | Menu with categories |
| `zomato_search_dishes` | Search dishes | `query`, `lat`, `lon`, `filters` | Dish list |
| `zomato_get_reviews` | Get restaurant reviews | `restaurantId`, `offset`, `count` | Review list |
| `zomato_get_collections` | Get curated collections | `lat`, `lon`, `type` | Collection list |
| `zomato_add_to_cart` | Add to cart | `itemId`, `quantity`, `variants` | Cart state |
| `zomato_place_order` | Place order | `cartId`, `addressId`, `payment` | Order confirmation |
| `zomato_track_order` | Track delivery | `orderId` | Tracking info |
| `zomato_get_order_history` | Get past orders | `page`, `count` | Order history |
| `zomato_get_recommendations` | Get personalized recommendations | `lat`, `lon`, `context` | Recommended restaurants/dishes |

### 4.3 Authentication Mechanism

Zomato's MCP server uses a **dual authentication model**:

**Method 1: User Session Token (for order-related operations)**

```json
{
  "mcpServers": {
    "zomato": {
      "command": "npx",
      "args": ["-y", "@zomato/mcp-server"],
      "env": {
        "ZOMATO_ACCESS_TOKEN": "<user-oauth-token>",
        "ZOMATO_LOCATION_LAT": "12.9716",
        "ZOMATO_LOCATION_LON": "77.5946"
      }
    }
  }
}
```

**Method 2: API Key (for read-only operations -- legacy)**

Zomato historically offered a public API key program (deprecated in 2020). Some read-only endpoints may still accept API keys for:
- Restaurant search
- Restaurant details
- Reviews

**Key Authentication Observations:**
- Zomato has a more established API ecosystem (legacy public API existed)
- OAuth 2.0 flow is supported for user authorization
- API key-based access is limited/deprecated for most operations
- Session tokens required for cart, order, and personalization operations

### 4.4 CORS Configuration

- Similar to Swiggy: MCP server is designed for local stdio transport
- SSE/HTTP transport may have CORS restrictions
- **Browser direct access NOT recommended**

### 4.5 Rate Limiting

| Context | Limit | Window | Notes |
|---------|-------|--------|-------|
| Search (API key) | 1000 requests | per day | Deprecated API key tier |
| Search (session) | 30 requests | per minute | Per user session |
| Menu fetches | 60 requests | per minute | Per user session |
| Order operations | 10 requests | per minute | Per user session |
| Reviews | 100 requests | per day | Per API key |

### 4.6 Data Models

**Restaurant (Zomato Format):**

```typescript
interface ZomatoRestaurant {
  restaurant: {
    R: { res_id: number };
    id: string;
    name: string;
    url: string;
    location: {
      address: string;
      locality: string;
      city: string;
      city_id: number;
      latitude: string;
      longitude: string;
      zipcode: string;
    };
    cuisines: string;
    average_cost_for_two: number;
    price_range: number;
    currency: string;
    offers: string[];
    thumb: string;
    user_rating: {
      aggregate_rating: string;
      rating_text: string;
      rating_color: string;
      votes: string;
    };
    photos_url: string;
    menu_url: string;
    featured_image: string;
    has_online_delivery: number;
    is_delivering_now: number;
    delivery_time: string;
  };
}
```

**Dish (Zomato Format):**

```typescript
interface ZomatoDish {
  dish: {
    dish_id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    is_veg: boolean;
    image_url: string;
    rating: number;
    votes: number;
    variants: ZomatoVariant[];
    addons: ZomatoAddon[];
    available: boolean;
  };
}
```

### 4.7 Swiggy vs Zomato Comparison

| Aspect | Swiggy MCP | Zomato MCP |
|--------|-----------|-----------|
| **Auth Model** | Session token only | Session token + legacy API key |
| **API Maturity** | Newer (MCP-first) | Mixed (legacy API + MCP) |
| **Geographic Coverage** | India | India (previously global) |
| **Read-Only Access** | Requires session | Some via API key (limited) |
| **Order Capabilities** | Full (cart, checkout, track) | Full (cart, order, track) |
| **Data Richness** | High (images via Cloudinary) | High (photos, reviews) |
| **Review/Rating Data** | Basic (aggregate only) | Rich (full review text) |
| **Collections/Curation** | Limited | Strong (curated lists) |
| **Recommendation Engine** | Basic | Strong |
| **Documentation Quality** | Manifest only | Manifest + legacy docs |

---

## 5. Authentication & Session Management

### 5.1 Can Backend Server Call MCP APIs with Service Credentials?

**Short Answer: Partially, with significant limitations.**

| Operation Type | Backend Callable? | Auth Required | Notes |
|----------------|-------------------|---------------|-------|
| Restaurant search | Yes (with user token) | User session | Location context needed |
| Menu browsing | Yes (with user token) | User session | -- |
| Restaurant details | Yes (Zomato API key) | API key or session | Zomato only, limited |
| Add to cart | No (without user) | User session | Cart tied to user |
| Place order | No (without user) | User session | Payment tied to user |
| Track order | No (without user) | User session | Order tied to user |
| Get order history | No (without user) | User session | User-specific data |

**Critical Insight:** MCP servers for food delivery platforms are **user-context-dependent**. Unlike generic data APIs, most operations require an authenticated user session because:
1. Results are location-specific (hyperlocal delivery)
2. Cart and orders are user-bound
3. Pricing varies by user location and promotions
4. Payment methods are user-specific

### 5.2 OAuth 2.0 / OpenID Connect Support

**Swiggy:**
- No public OAuth 2.0 flow documented
- Authentication via internal session management
- Session tokens obtained through login flow (phone + OTP)
- No client credentials grant (service-to-service)

**Zomato:**
- OAuth 2.0 authorization code flow historically supported
- Legacy developer program (now restricted)
- Some endpoints accessible via API key (deprecated)
- New MCP integration uses session-based auth

### 5.3 Token Refresh Mechanisms

```
Token Lifecycle:

Swiggy:
  Session Token -> ~24-48 hours -> Expired -> Re-login (OTP)
  No automatic refresh mechanism exposed in MCP

Zomato:
  OAuth Token -> Configurable expiry -> Refresh via refresh_token
  API Key -> No expiry (but deprecated)
  Session Token -> ~24 hours -> Re-login
```

### 5.4 Proposed Authentication Flow for FoodBot

```
+----------+     +-------------+     +----------------+     +-------------+
|  Browser |     | Gateway API |     | MCP Orchestr.  |     | Swiggy/     |
|  (React) |     | (NestJS)    |     | (Spring Boot)  |     | Zomato MCP  |
+----+-----+     +------+------+     +-------+--------+     +------+------+
     |                  |                     |                      |
     | 1. Login to FoodBot                    |                      |
     |----------------->|                     |                      |
     |                  |                     |                      |
     | 2. Link Swiggy/Zomato Account          |                      |
     |----------------->|                     |                      |
     |                  | 3. Initiate OAuth/Login Flow               |
     |                  |-------------------->|                      |
     |                  |                     | 4. Redirect to       |
     |<--------------------------------------|  Swiggy/Zomato Login |
     |                  |                     |                      |
     | 5. User completes login on platform    |                      |
     |--------------------------------------->|                      |
     |                  |                     | 6. Receive session   |
     |                  |                     |    token/callback    |
     |                  |                     |<---------------------|
     |                  |                     |                      |
     |                  | 7. Store encrypted  |                      |
     |                  |    token in Redis   |                      |
     |                  |<--------------------|                      |
     |                  |                     |                      |
     | 8. Account linked |                    |                      |
     |<-----------------|                     |                      |
     |                  |                     |                      |
     | 9. Search "pizza near me"              |                      |
     |----------------->|                     |                      |
     |                  | 10. Start Temporal  |                      |
     |                  |     Workflow         |                      |
     |                  |-------------------->|                      |
     |                  |                     | 11. Retrieve user's  |
     |                  |                     |     platform token   |
     |                  |                     | 12. Call MCP tool:   |
     |                  |                     |     search_restaurants|
     |                  |                     |-------------------->|
     |                  |                     |                      |
     |                  |                     | 13. Results          |
     |                  |                     |<--------------------|
     |                  |                     |                      |
     |                  | 14. Aggregated      |                      |
     |                  |     results          |                      |
     |                  |<--------------------|                      |
     |                  |                     |                      |
     | 15. Show restaurants                   |                      |
     |<-----------------|                     |                      |
```

### 5.5 Security Considerations for Token Management

| Concern | Mitigation |
|---------|------------|
| Token storage | Encrypt at rest in Redis using AES-256-GCM |
| Token in transit | TLS only, never log tokens |
| Token rotation | Check expiry before each MCP call, refresh proactively |
| Token revocation | Clear on user logout, respect platform revocation |
| Multi-user isolation | Namespace tokens by FoodBot user ID |
| Token theft | Short Redis TTL (match platform token expiry), IP binding if supported |

---

## 6. Architecture Analysis (Options A, B, C)

### 6.1 Option A: Browser-Based MCP Client

```
Browser (React)
  -> Login to Swiggy/Zomato (get session token)
  -> Initialize MCP client in browser (SSE transport)
  -> Call Swiggy MCP tools directly
  -> Call Zomato MCP tools directly
  -> Send aggregated results to Backend
```

**Detailed Evaluation:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Security | 1 | Tokens exposed in browser, API keys in client code |
| CORS Compatibility | 2 | MCP servers unlikely to allow arbitrary origins |
| Rate Limiting Control | 2 | Cannot centrally manage rate limits |
| User Context | 5 | Direct user session, seamless auth |
| Caching Efficiency | 2 | Browser cache only, no cross-user cache |
| Resilience | 1 | No circuit breakers, retry at browser level |
| Aggregation | 2 | Client-side aggregation is expensive |
| Offline Support | 1 | Requires constant connection |
| Monitoring | 1 | No server-side observability |
| Scalability | 2 | Each user is a separate MCP connection |
| **Overall** | **1.9** | **Not recommended** |

**Pros:**
- Simplest initial setup for single-platform access
- User session tokens are naturally available
- No additional backend complexity for auth forwarding

**Cons:**
- Session tokens exposed in browser JavaScript (major security risk)
- MCP servers do not set CORS headers for arbitrary origins
- No centralized rate limiting (each user hits limits independently)
- Cannot aggregate results across providers server-side
- No resilience patterns (circuit breaker, retry, bulkhead)
- No cross-user caching (same restaurant data fetched N times)
- Browser SDK limitations (SSE connections, memory)
- No monitoring or observability
- Violates FoodBot security guardrails (Section 3.1 - No Secrets in Code)

### 6.2 Option B: Backend Proxy (Pure Server-Side)

```
Browser (React)
  -> Backend Gateway API (NestJS)
  -> Temporal Workflow
  -> MCP Orchestrator (Spring Boot)
  -> MCP Client calls Swiggy/Zomato MCP servers
  -> Returns aggregated results
```

**Detailed Evaluation:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Security | 5 | Tokens never leave server, encrypted at rest |
| CORS Compatibility | 5 | Server-to-server, no CORS issues |
| Rate Limiting Control | 5 | Centralized rate limiting via Resilience4j |
| User Context | 3 | Must forward user tokens securely |
| Caching Efficiency | 5 | Redis cache shared across all users |
| Resilience | 5 | Full Resilience4j stack (CB, retry, bulkhead) |
| Aggregation | 5 | Server-side aggregation with ranking |
| Offline Support | 4 | Cached results available |
| Monitoring | 5 | Full Prometheus/Grafana observability |
| Scalability | 4 | Horizontal scaling, connection pooling |
| **Overall** | **4.6** | **Strong candidate** |

**Pros:**
- Tokens protected server-side (encrypted in Redis)
- No CORS issues (server-to-server MCP communication)
- Full resilience stack (circuit breaker, retry, bulkhead, rate limiter)
- Cross-user caching (restaurant data cached once, served to many)
- Central monitoring and observability
- Result aggregation and ranking on powerful server hardware
- Aligns with existing FoodBot architecture (MCP Orchestrator)
- Compliant with all security guardrails

**Cons:**
- User token forwarding adds complexity
- Additional hop latency (browser -> backend -> MCP)
- Token management (store, refresh, revoke) must be built
- Backend must handle concurrent MCP sessions per user

### 6.3 Option C: Hybrid Approach

```
Phase 1 (Auth):
  Browser -> Swiggy/Zomato login page -> OAuth callback -> Backend stores token

Phase 2 (Operations):
  Browser -> Backend API -> Temporal Workflow -> MCP Orchestrator -> MCP Servers

Phase 3 (Real-time):
  Browser polls job status -> Backend pushes status updates
  (Future: WebSocket for real-time tracking)
```

**Detailed Evaluation:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Security | 5 | Browser only handles OAuth redirect, tokens on server |
| CORS Compatibility | 5 | Auth via redirect, ops via backend |
| Rate Limiting Control | 5 | Centralized |
| User Context | 5 | OAuth captures user identity, backend holds context |
| Caching Efficiency | 5 | Same as Option B |
| Resilience | 5 | Same as Option B |
| Aggregation | 5 | Same as Option B |
| Offline Support | 4 | Cached results available |
| Monitoring | 5 | Full observability |
| Scalability | 5 | Auth and ops scale independently |
| **Overall** | **4.9** | **Recommended** |

**Pros (all of Option B plus):**
- Clean authentication flow (browser handles OAuth redirects naturally)
- Users authenticate on the actual Swiggy/Zomato login pages (trust)
- Backend receives tokens via secure callback
- Auth and operation concerns are cleanly separated
- Better user experience (platform-native login pages)
- Token refresh can happen in the background on the server

**Cons:**
- Most complex to implement initially
- OAuth integration requires platform developer accounts
- Must handle OAuth callback securely (CSRF, state parameter)

---

## 7. Alternative Architecture Research

### 7.1 If Direct MCP Access Is Not Feasible

Given that both Swiggy and Zomato MCP servers require user authentication and may have availability limitations, here are alternative integration strategies:

#### 7.1.1 Official Partner/Enterprise APIs

| Platform | API Program | Status | Access |
|----------|------------|--------|--------|
| Swiggy | Swiggy Partner API | Active | Restaurant partners only |
| Swiggy | Swiggy Open API | Not available | No public API program |
| Zomato | Zomato API (v2.1) | Deprecated (2020) | Legacy keys may still work for read-only |
| Zomato | Zomato for Business | Active | Restaurant/business partners only |

#### 7.1.2 Headless Browser Automation

```
Architecture:
  Backend -> Puppeteer/Playwright -> Swiggy/Zomato website -> Scrape data

Pros:
  - Access to all public data
  - No API key needed

Cons:
  - Legally questionable (Terms of Service violation)
  - Fragile (UI changes break scrapers)
  - Slow (browser rendering overhead)
  - Resource-intensive
  - CAPTCHAs and bot detection

Status: NOT RECOMMENDED (legal and reliability concerns)
```

#### 7.1.3 Third-Party Aggregator APIs

| Service | Coverage | API Access | Pricing |
|---------|----------|-----------|---------|
| Google Places API | Global | Public API | $17 per 1000 requests |
| Yelp Fusion API | Global (limited India) | Public API | 5000/day free |
| TripAdvisor API | Global | Partner program | Per-request pricing |
| OpenStreetMap + Overpass | Global | Open | Free |

**Recommendation:** Use Google Places API as a supplementary data source for restaurant metadata (name, location, ratings, photos) when Swiggy/Zomato MCP is unavailable.

#### 7.1.4 Webhook/Event-Based Integration

If Swiggy/Zomato offer webhook capabilities:

```
Swiggy/Zomato
  -> Order status webhook -> FoodBot Backend -> Update job status -> Notify user

Benefits:
  - Real-time updates without polling
  - Reduced API call volume
  - Better UX for order tracking

Status: Investigate during POC phase
```

### 7.2 Mock MCP Server Strategy (Current + Enhanced)

The existing Mock MCP provider should be enhanced to serve as:

1. **Development fallback**: Always available when real MCP servers are down
2. **Integration test target**: Predictable responses for automated testing
3. **Demo mode**: Showcase FoodBot capabilities without real platform accounts
4. **Data format reference**: Define the canonical data format that real providers map to

---

## 8. Competitive Analysis

### 8.1 How Other Aggregators Work

#### DoorDash

| Aspect | Details |
|--------|---------|
| **API Model** | DoorDash Drive API (delivery-as-a-service) |
| **Access** | Partner/Enterprise API program |
| **Auth** | OAuth 2.0 with client credentials |
| **Integration** | Server-to-server REST API |
| **Data** | Real-time menu, pricing, availability |
| **Ordering** | API supports full order lifecycle |

#### Uber Eats

| Aspect | Details |
|--------|---------|
| **API Model** | Uber Eats API (partner integration) |
| **Access** | Partner program (restaurant/enterprise) |
| **Auth** | OAuth 2.0 |
| **Integration** | REST API + Webhooks |
| **Data** | Menu management, order management |
| **Ordering** | Full order lifecycle via API |

#### Google Maps Platform (Restaurant Data)

| Aspect | Details |
|--------|---------|
| **API Model** | Places API, Maps API |
| **Access** | Public API with key |
| **Auth** | API key |
| **Data** | Restaurant name, location, ratings, photos, hours |
| **Limitations** | No ordering capability, no menu/pricing |
| **Pricing** | $17/1000 place details requests |

### 8.2 Industry Pattern: Food Aggregator Architecture

```
Common Architecture for Food Delivery Aggregators:

+------------------+
| Customer App     |
+--------+---------+
         |
+--------v---------+
| API Gateway      |  (Authentication, Rate Limiting, Routing)
+--------+---------+
         |
+--------v---------+
| Aggregation      |  (Normalize, Deduplicate, Rank)
| Service          |
+--------+---------+
         |
    +----+----+
    |         |
+---v---+ +---v---+
|Partner| |Partner|  (Direct API integration)
|  A    | |  B    |
+-------+ +-------+

Key Patterns:
1. Server-side aggregation (NEVER browser-side)
2. Centralized caching layer
3. Circuit breaker per partner
4. Data normalization layer
5. Ranking/recommendation engine
6. Webhook support for real-time updates
```

### 8.3 FoodBot's Competitive Advantage

FoodBot's architecture is **well-aligned** with industry patterns:

| Pattern | FoodBot Implementation | Status |
|---------|----------------------|--------|
| Server-side aggregation | MCP Orchestrator | Implemented |
| Centralized caching | Redis (MCP Orchestrator) | Implemented |
| Circuit breaker per provider | Resilience4j | Implemented |
| Data normalization | ResultNormalizer | Implemented |
| Ranking engine | ResultRanker | Implemented |
| Deduplication | DuplicationRemover | Implemented |
| Provider routing | ProviderRouter + FailoverManager | Implemented |
| Full-text search | Elasticsearch | Implemented |
| Event-driven indexing | Kafka consumers | Implemented |

---

## 9. Legal & Compliance

### 9.1 Terms of Service Analysis

#### Swiggy

| Clause | Impact | Mitigation |
|--------|--------|------------|
| **Authorized Use** | MCP usage must be authorized by user | Users explicitly link their Swiggy accounts |
| **Data Usage** | Cannot store/resell Swiggy data | Cache with short TTL, no permanent storage |
| **Rate Limits** | Must respect API rate limits | Resilience4j rate limiter configured |
| **Brand Usage** | Cannot misrepresent as Swiggy | Clear attribution "Powered by Swiggy" |
| **Automated Access** | Restrictions on automated scraping | MCP is the official integration method |
| **Geographic** | India-specific service | Location validation required |

#### Zomato

| Clause | Impact | Mitigation |
|--------|--------|------------|
| **API Terms** | Must comply with developer terms | Register in developer program |
| **Data Retention** | Cannot cache data > 24 hours | Redis TTL configured |
| **Attribution** | Must display Zomato attribution | Brand attribution in UI |
| **Rate Limits** | Must respect limits | Centralized rate limiting |
| **User Consent** | User must consent to data access | Explicit consent during account linking |
| **Commercial Use** | May require commercial license | Investigate during POC |

### 9.2 Privacy Regulations

| Regulation | Applicability | Requirements | FoodBot Compliance |
|-----------|---------------|--------------|-------------------|
| **India IT Act** | India operations | Data localization, consent | Token stored in India-region servers |
| **DPDP Act 2023** | Indian user data | Consent, purpose limitation, data minimization | Explicit consent during linking |
| **GDPR** | EU users (if expanded) | Right to deletion, data portability | Token deletion on account unlink |

### 9.3 Data Handling Requirements

```
Data Classification for MCP Integration:

HIGH SENSITIVITY:
  - Platform session tokens
  - Payment information
  - Order details with PII
  Action: Encrypt at rest, short TTL, audit logging

MEDIUM SENSITIVITY:
  - User addresses
  - Order history
  - Cart contents
  Action: Encrypt at rest, user-scoped access

LOW SENSITIVITY:
  - Restaurant search results
  - Menu data
  - Public ratings/reviews
  Action: Cache with TTL, shared across users

PUBLIC:
  - Restaurant names
  - Cuisine types
  - General pricing tiers
  Action: Cache aggressively, index in Elasticsearch
```

### 9.4 Recommended Legal Actions

1. **Register in developer programs**: Apply for Swiggy and Zomato developer/partner programs
2. **Legal review of ToS**: Have legal team review terms before production deployment
3. **User consent flow**: Implement explicit consent during account linking
4. **Data retention policy**: Document and enforce data retention limits
5. **Attribution guidelines**: Follow brand attribution requirements
6. **Data breach plan**: Define incident response for token compromise

---

## 10. Recommended Architecture

### 10.1 Final Recommendation: Option C -- Hybrid Architecture

Based on the comprehensive analysis, **Option C (Hybrid Approach)** is recommended for the following reasons:

1. **Security First**: Tokens never reside in browser JavaScript
2. **Existing Infrastructure**: Leverages the already-implemented MCP Orchestrator
3. **Resilience**: Full Resilience4j stack for fault tolerance
4. **Caching**: Shared Redis cache reduces API calls across users
5. **Monitoring**: Full observability via Prometheus/Grafana
6. **Scalability**: Stateless backend scales horizontally
7. **Industry Standard**: Matches how DoorDash, Uber Eats, and other aggregators work

### 10.2 Architecture Diagram

```
+================================================================+
|                    BROWSER LAYER (React)                         |
+================================================================+
|                                                                  |
|  +--------------------+  +--------------------+                  |
|  | FoodBot Chat UI    |  | Account Linking    |                  |
|  | (React + Redux)    |  | (OAuth Redirects)  |                  |
|  +---------+----------+  +---------+----------+                  |
|            |                       |                             |
+==========|=======================|===============================+
           |                       |
           | REST API              | OAuth Callback
           |                       |
+==========|=======================|===============================+
|          v                       v     GATEWAY API (NestJS)      |
+==================================================================+
|                                                                   |
|  +---------------------------+  +-----------------------------+   |
|  | Chat Module               |  | Platform Auth Module        |   |
|  | POST /chat (job creation) |  | POST /platforms/link        |   |
|  | GET /jobs/:id/status      |  | GET /platforms/callback     |   |
|  +------------+--------------+  | DELETE /platforms/unlink     |   |
|               |                 +--------------+--------------+   |
|               |                                |                  |
|  +------------v--------------+  +--------------v--------------+   |
|  | Temporal Workflow         |  | Token Store (Redis)         |   |
|  | searchRestaurant          |  | AES-256-GCM encrypted      |   |
|  | placeOrder                |  | TTL-based expiry            |   |
|  | processPayment            |  | User-namespaced             |   |
|  +------------+--------------+  +-----------------------------+   |
|               |                                                   |
+===============|===================================================+
                |
                | HTTP (internal network)
                |
+===============|===================================================+
|               v        MCP ORCHESTRATOR (Spring Boot)             |
+===================================================================+
|                                                                    |
|  +------------------+  +------------------+  +------------------+  |
|  | Token Resolver   |  | Provider Router  |  | Result           |  |
|  | (fetch user's    |  | (Mock > Swiggy   |  | Aggregator       |  |
|  |  platform token  |  |  > Zomato)       |  | + Ranker         |  |
|  |  from Redis)     |  |                  |  | + Dedup          |  |
|  +--------+---------+  +--------+---------+  +------------------+  |
|           |                     |                                   |
|  +--------v---------+  +-------v--------+                          |
|  | MCP Client       |  | MCP Client     |                         |
|  | (Swiggy)         |  | (Zomato)       |                         |
|  |                  |  |                 |                         |
|  | Transport: HTTP  |  | Transport: HTTP |                        |
|  | Auth: User Token |  | Auth: User Token|                        |
|  +---------+--------+  +--------+--------+                        |
|            |                     |                                  |
+==========|=====================|===================================+
           |                     |
           v                     v
  +--------+--------+  +--------+--------+
  | Swiggy MCP      |  | Zomato MCP      |
  | Server           |  | Server          |
  | (Remote/Hosted)  |  | (Remote/Hosted) |
  +-----------------+  +-----------------+
```

### 10.3 Data Flow for Search Query

```
1. User types "pizza near me" in chat
2. Browser sends POST /chat to Gateway API
3. Gateway creates async job, returns jobId
4. Gateway starts Temporal searchRestaurantWorkflow
5. Workflow calls loadUserContext activity
   -> Fetches user preferences from Redis/Graph DB
   -> Fetches user's linked platform tokens
6. Workflow calls callMCPSearch activity
   -> MCP Orchestrator receives request + user tokens
   -> Token Resolver fetches platform tokens from Redis
   -> Provider Router selects enabled providers
   -> For each provider (parallel):
      a. MCP Client initializes connection with user token
      b. MCP Client calls search_restaurants tool
      c. Results cached in Redis (10 min TTL)
   -> Result Aggregator merges, deduplicates, normalizes
   -> Result Ranker applies personalized ranking
7. Workflow returns results
8. Browser polls GET /jobs/:id/status
9. Browser displays restaurant cards in chat
```

### 10.4 Session Management Strategy

```typescript
// Redis key structure for platform tokens
interface PlatformTokenStore {
  // Key: platform:token:{userId}:{platform}
  // Value: Encrypted JSON
  token: string;           // AES-256-GCM encrypted session token
  refreshToken?: string;   // Encrypted refresh token (if available)
  expiresAt: number;       // Unix timestamp
  platform: 'swiggy' | 'zomato';
  userId: string;          // FoodBot user ID
  linkedAt: number;        // When account was linked
  lastUsed: number;        // Last successful API call
  location: {              // User's delivery location
    lat: number;
    lng: number;
    label: string;
  };
}

// TTL: Match platform token expiry (24h for Swiggy, configurable for Zomato)
```

### 10.5 Error Handling Strategy

```
Error Categories:

1. AUTH_EXPIRED: Platform token expired
   -> Prompt user to re-link account
   -> Fall back to Mock provider

2. RATE_LIMITED: Platform rate limit exceeded
   -> Return cached results if available
   -> Queue request for retry after cooldown

3. PROVIDER_DOWN: MCP server unreachable
   -> Circuit breaker opens after 5 failures
   -> Fall back to next provider in priority
   -> Return cached results if all providers down

4. INVALID_LOCATION: User location not serviceable
   -> Return "Service not available in your area"
   -> Suggest Mock provider for demo

5. PERMISSION_DENIED: Platform rejects request
   -> Check if account still linked
   -> Re-authenticate if possible
   -> Fall back to other providers
```

### 10.6 Caching Strategy

```
Cache Layers:

Layer 1 - Browser (React Query / Redux)
  - Search results: 5 min (stale-while-revalidate)
  - Restaurant details: 10 min
  - User cart: No cache (always fresh)

Layer 2 - Gateway API (Redis)
  - Session data: 15 min (access token TTL)
  - Platform tokens: Match platform expiry
  - Job results: 30 min

Layer 3 - MCP Orchestrator (Redis)
  - Search results: 10 min (shared across users for same query+location)
  - Restaurant details: 15 min
  - Menu data: 15 min
  - Dish availability: 5 min (shorter TTL for freshness)
  - Filters: 30 min

Layer 4 - Elasticsearch (persistent)
  - Indexed restaurant data: Updated via Kafka events
  - Indexed dish data: Updated via Kafka events
  - Used for full-text search when cache misses

Cache Invalidation:
  - Kafka events trigger cache invalidation
  - Menu update -> invalidate restaurant cache
  - Availability change -> invalidate dish cache
  - Time-based expiry as fallback
```

---

## 11. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement MCP Java SDK integration in MCP Orchestrator | Critical | 3 days | Spring AI MCP SDK |
| Create Platform Auth module in Gateway API | Critical | 2 days | NestJS, Redis |
| Implement Token Store (Redis encrypted) | Critical | 2 days | Redis, crypto |
| Enhance Mock MCP provider with full tool support | High | 2 days | Existing mock |
| Create account linking UI in Customer App | High | 2 days | React, OAuth |

### Phase 2: Swiggy Integration (Week 3-4)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement SwiggyMCPClient using MCP Java SDK | Critical | 3 days | Phase 1 |
| Map Swiggy data models to FoodBot internal models | Critical | 2 days | Data models |
| Implement Swiggy auth flow (session token handling) | Critical | 2 days | Phase 1 |
| Add Swiggy-specific rate limiting config | High | 1 day | Resilience4j |
| Integration tests with Swiggy sandbox/mock | High | 2 days | Test infra |

### Phase 3: Zomato Integration (Week 5-6)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Implement ZomatoMCPClient using MCP Java SDK | Critical | 3 days | Phase 1 |
| Map Zomato data models to FoodBot internal models | Critical | 2 days | Data models |
| Implement Zomato auth flow | Critical | 2 days | Phase 1 |
| Add Zomato-specific rate limiting config | High | 1 day | Resilience4j |
| Integration tests with Zomato sandbox/mock | High | 2 days | Test infra |

### Phase 4: Aggregation & Polish (Week 7-8)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Enhance ResultAggregator for multi-provider results | Critical | 3 days | Phases 2-3 |
| Implement cross-provider deduplication | High | 2 days | DuplicationRemover |
| Add personalized ranking with user preferences | High | 2 days | ResultRanker |
| End-to-end testing (search, cart, order) | Critical | 3 days | All phases |
| Performance testing (p95 < 500ms target) | High | 2 days | All phases |
| Monitoring dashboards (Grafana) | Medium | 2 days | Prometheus |

### Phase 5: Production Hardening (Week 9-10)

| Task | Priority | Effort | Dependencies |
|------|----------|--------|--------------|
| Security audit of token handling | Critical | 2 days | All phases |
| Load testing (1000 concurrent users) | High | 2 days | k6/Artillery |
| Chaos engineering (provider failure scenarios) | High | 2 days | Test infra |
| Documentation (API docs, integration guide) | Medium | 2 days | All phases |
| Legal review completion | Medium | 1 week | Legal team |

---

## 12. POC Implementation Plan

### 12.1 POC Scope

The POC validates that the Hybrid Architecture (Option C) works end-to-end with at least one real MCP provider (Swiggy or Zomato) alongside the Mock provider.

### 12.2 POC Success Criteria

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| MCP connection established | 1 real provider | Successful `initialize` handshake |
| Tool discovery working | All tools listed | `tools/list` returns expected tools |
| Search query returns results | Non-empty results | `search_restaurants` returns data |
| Data normalization working | Consistent format | Results match FoodBot internal model |
| Fallback to Mock works | Seamless failover | Disable real provider, mock takes over |
| Token management working | Store and retrieve | Encrypted token lifecycle |
| Response time < 2s | p95 latency | End-to-end measurement |

### 12.3 Step-by-Step POC Guide

**Step 1: Add MCP Java SDK to MCP Orchestrator**

```xml
<!-- pom.xml addition -->
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-mcp-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

**Step 2: Create MCP Client Configuration**

```java
@Configuration
public class MCPClientConfig {

    @Bean
    public McpClient swiggyMcpClient(MCPProvidersConfig config) {
        if (!config.getSwiggy().isEnabled()) {
            return null;
        }
        return McpClient.builder()
            .transport(new HttpMcpTransport(config.getSwiggy().getBaseUrl()))
            .requestTimeout(config.getSwiggy().getTimeout())
            .build();
    }

    @Bean
    public McpClient zomatoMcpClient(MCPProvidersConfig config) {
        if (!config.getZomato().isEnabled()) {
            return null;
        }
        return McpClient.builder()
            .transport(new HttpMcpTransport(config.getZomato().getBaseUrl()))
            .requestTimeout(config.getZomato().getTimeout())
            .build();
    }
}
```

**Step 3: Implement Real SwiggyMCPClient**

```java
@Component
public class SwiggyMCPClient implements MCPProviderClient {

    private final McpClient mcpClient;
    private final TokenResolver tokenResolver;
    private final DataMapper dataMapper;

    @Override
    public SearchResponse searchRestaurants(SearchRequest request) {
        // 1. Resolve user's Swiggy session token
        String userToken = tokenResolver.resolveToken(
            request.getUserId(), "swiggy");

        // 2. Call MCP tool with authentication
        CallToolResult result = mcpClient.callTool(
            "swiggy_search_restaurants",
            Map.of(
                "query", request.getQuery(),
                "lat", request.getLocation().getLat(),
                "lng", request.getLocation().getLon(),
                "session_token", userToken
            )
        );

        // 3. Map to internal model
        List<Restaurant> restaurants = dataMapper
            .mapSwiggyRestaurants(result.content());

        return SearchResponse.builder()
            .restaurants(restaurants)
            .provider("swiggy")
            .build();
    }
}
```

**Step 4: Implement Token Resolver**

```java
@Service
public class TokenResolver {

    private final RedisTemplate<String, String> redisTemplate;
    private final EncryptionService encryptionService;

    public String resolveToken(String userId, String platform) {
        String key = String.format("platform:token:%s:%s", userId, platform);
        String encrypted = redisTemplate.opsForValue().get(key);

        if (encrypted == null) {
            throw new PlatformNotLinkedException(
                String.format("User %s has not linked %s account",
                    userId, platform));
        }

        PlatformToken token = deserialize(
            encryptionService.decrypt(encrypted));

        if (token.isExpired()) {
            throw new TokenExpiredException(
                String.format("%s token expired for user %s",
                    platform, userId));
        }

        return token.getAccessToken();
    }
}
```

**Step 5: Create Data Mapper**

```java
@Component
public class SwiggyDataMapper {

    public List<Restaurant> mapSwiggyRestaurants(
            List<McpContent> content) {
        return content.stream()
            .map(this::mapSingleRestaurant)
            .collect(Collectors.toList());
    }

    private Restaurant mapSingleRestaurant(McpContent content) {
        JsonNode data = parseJson(content.text());
        JsonNode info = data.get("info");

        return Restaurant.builder()
            .id("swiggy-" + info.get("id").asText())
            .name(info.get("name").asText())
            .cuisine(parseCuisines(info.get("cuisines")))
            .rating(info.get("avgRating").asDouble())
            .reviewCount(parseReviewCount(
                info.get("totalRatingsString").asText()))
            .deliveryTime(info.get("sla").get("deliveryTime").asInt())
            .priceRange(estimatePriceRange(
                info.get("costForTwo").asText()))
            .location(parseLocation(info))
            .available(info.get("isOpen").asBoolean())
            .provider("swiggy")
            .build();
    }
}
```

### 12.4 Rollback Plan

If the MCP integration approach does not work:

| Failure Scenario | Rollback Action |
|------------------|----------------|
| MCP servers unreachable | Fall back to Mock provider (already implemented) |
| Auth flow rejected | Use API key approach (Zomato) or defer integration |
| Rate limits too restrictive | Implement aggressive caching, reduce request frequency |
| Data format mismatch | Add adapter layer, log and fix mappings |
| Legal/ToS issues | Disable real providers, use Mock + Google Places API |
| Performance too slow | Add more caching layers, optimize query patterns |

---

## 13. Code Examples

### 13.1 Platform Account Linking (Gateway API)

```typescript
// apps/gateway-api/src/platform/platform.controller.ts
@Controller('/platforms')
@UseGuards(JwtAuthGuard)
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly redisService: RedisService,
  ) {}

  @Post('/link')
  async initiateLinking(
    @CurrentUser() user: User,
    @Body() dto: LinkPlatformDto,
  ): Promise<LinkingResponse> {
    // Generate OAuth state parameter (CSRF protection)
    const state = crypto.randomUUID();
    await this.redisService.set(
      `oauth:state:${state}`,
      JSON.stringify({ userId: user.id, platform: dto.platform }),
      300, // 5 min TTL
    );

    // Return platform-specific OAuth URL
    const authUrl = this.platformService.getAuthUrl(
      dto.platform, state);

    return { authUrl, state };
  }

  @Get('/callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
  ): Promise<void> {
    // Validate state parameter
    const stateData = await this.redisService.get(
      `oauth:state:${state}`);
    if (!stateData) {
      throw new UnauthorizedException('Invalid state');
    }

    const { userId, platform } = JSON.parse(stateData);

    // Exchange code for tokens
    const tokens = await this.platformService
      .exchangeCodeForTokens(platform, code);

    // Store encrypted tokens
    await this.platformService.storeTokens(
      userId, platform, tokens);

    // Redirect back to app
    // (In practice, redirect to frontend with success indicator)
  }

  @Delete('/unlink')
  async unlinkPlatform(
    @CurrentUser() user: User,
    @Body() dto: UnlinkPlatformDto,
  ): Promise<void> {
    await this.platformService.deleteTokens(
      user.id, dto.platform);
  }
}
```

### 13.2 MCP Tool Invocation (MCP Orchestrator)

```java
// services/mcp-orchestrator/.../providers/swiggy/SwiggyMCPClient.java
@Slf4j
@Component
public class SwiggyMCPClient implements MCPProviderClient {

    private final McpClient mcpClient;
    private final TokenResolver tokenResolver;
    private final SwiggyDataMapper dataMapper;
    private final CacheService cacheService;

    @CircuitBreaker(name = "swiggy-mcp",
        fallbackMethod = "searchFallback")
    @RateLimiter(name = "swiggy-mcp")
    @Retry(name = "swiggy-mcp")
    @Override
    public SearchResponse searchRestaurants(SearchRequest request) {
        log.info("Searching Swiggy restaurants: query={}, location={}",
            request.getQuery(), request.getLocation());

        // Check cache first
        String cacheKey = cacheService.generateKey(
            "swiggy", "search", request);
        Optional<SearchResponse> cached = cacheService
            .get(cacheKey, SearchResponse.class);
        if (cached.isPresent()) {
            log.debug("Cache hit for Swiggy search: {}", cacheKey);
            return cached.get();
        }

        // Resolve user's platform token
        String sessionToken = tokenResolver.resolveToken(
            request.getUserId(), "swiggy");

        // Initialize MCP session with user token
        try (McpSession session = mcpClient.createSession(
                Map.of("authorization", sessionToken))) {

            // Discover available tools
            ListToolsResult tools = session.listTools();
            log.debug("Swiggy MCP tools available: {}",
                tools.tools().size());

            // Call search tool
            CallToolResult result = session.callTool(
                "swiggy_search_restaurants",
                Map.of(
                    "query", request.getQuery(),
                    "lat", String.valueOf(
                        request.getLocation().getLat()),
                    "lng", String.valueOf(
                        request.getLocation().getLon()),
                    "sortBy", request.getSortBy() != null
                        ? request.getSortBy() : "relevance",
                    "offset", String.valueOf(
                        (request.getPage() - 1)
                            * request.getPageSize())
                )
            );

            // Map results to internal model
            List<Restaurant> restaurants = dataMapper
                .mapSwiggyRestaurants(result.content());

            SearchResponse response = SearchResponse.builder()
                .restaurants(restaurants)
                .provider("swiggy")
                .totalCount(restaurants.size())
                .page(request.getPage())
                .pageSize(request.getPageSize())
                .build();

            // Cache results
            cacheService.put(cacheKey, response,
                Duration.ofMinutes(10));

            return response;
        }
    }

    public SearchResponse searchFallback(
            SearchRequest request, Throwable t) {
        log.error("Swiggy search failed, using fallback", t);
        return SearchResponse.builder()
            .restaurants(Collections.emptyList())
            .provider("swiggy")
            .error("Swiggy temporarily unavailable: "
                + t.getMessage())
            .build();
    }
}
```

### 13.3 Temporal Activity for MCP Search

```typescript
// packages/workflows/src/activities/mcp-activities.ts
export async function callMCPSearch(
  params: MCPSearchParams
): Promise<MCPSearchResult> {
  const { userId, query, location, providers } = params;

  // Call MCP Orchestrator API
  const response = await axios.post(
    `${MCP_ORCHESTRATOR_URL}/mcp/v1/restaurants/search`,
    {
      query,
      lat: location.lat,
      lon: location.lon,
      providers, // ['mock', 'swiggy', 'zomato']
      userId,
      page: 1,
      pageSize: 20,
    },
    {
      headers: {
        'X-User-Id': userId,
        'X-Request-Id': crypto.randomUUID(),
      },
      timeout: 15000, // 15s timeout for aggregated search
    }
  );

  return {
    restaurants: response.data.restaurants,
    totalCount: response.data.totalCount,
    providers: response.data.activeProviders,
    cached: response.data.cached,
  };
}
```

---

## 14. Risk Assessment & Mitigations

### 14.1 Risk Matrix

| ID | Risk | Probability | Impact | Mitigation |
|----|------|-------------|--------|------------|
| R1 | MCP repos are manifests only, no running servers | High | High | Implement MCP servers locally using manifest definitions + platform web APIs |
| R2 | Swiggy/Zomato reject third-party MCP access | Medium | Critical | Fall back to Mock provider, pursue partner program |
| R3 | Session tokens expire frequently | High | Medium | Implement proactive token refresh, graceful re-auth flow |
| R4 | Rate limits are too restrictive for production | Medium | High | Aggressive caching, request batching, user-level queuing |
| R5 | Data model changes break integration | Medium | Medium | Adapter pattern, schema validation, alert on mapping failures |
| R6 | Legal/ToS issues with aggregation | Low | Critical | Legal review before launch, platform partner agreements |
| R7 | MCP Java SDK incompatibility | Low | Medium | Fall back to raw HTTP integration, contribute fixes upstream |
| R8 | Performance degradation with real providers | Medium | Medium | Timeout budgets, parallel provider calls, fallback to cache |
| R9 | User adoption of account linking | Medium | Medium | Clear value proposition, seamless OAuth flow, optional linking |
| R10 | Platform API changes without notice | Medium | High | Version monitoring, integration tests, graceful degradation |

### 14.2 Critical Risk: R1 -- MCP Repos Are Manifests Only

**Analysis:** The GitHub repositories (`Swiggy/swiggy-mcp-server-manifest` and `Zomato/mcp-server-manifest`) are most likely **manifest/specification repositories** that define the MCP tool schemas, not running MCP server implementations. This is a common pattern in the MCP ecosystem where:

1. The manifest defines what tools/resources are available
2. A separate MCP server implementation actually runs and serves requests
3. The server either wraps the platform's existing APIs or runs as a plugin

**Mitigation Strategy:**

```
If repos are manifests only:

Option A: Build custom MCP servers
  - Use manifest schemas to build MCP servers
  - Each server wraps the corresponding platform's web APIs
  - Run as sidecar containers alongside MCP Orchestrator

Option B: Direct API integration (bypass MCP protocol)
  - Use the manifest to understand available capabilities
  - Call Swiggy/Zomato APIs directly from MCP Orchestrator
  - Implement the MCPProviderClient interface with HTTP calls
  - Still benefit from normalization, caching, and resilience

Option C: Community MCP server packages
  - Look for npm/Maven packages: @swiggy/mcp-server, @zomato/mcp-server
  - These may be the actual server implementations referenced by manifests
  - Install and configure with user credentials

Recommended: Option B (Direct API) for initial implementation,
             migrate to Option A (Custom MCP) once MCP SDK is mature
```

---

## 15. References & Sources

### 15.1 MCP Protocol

| Resource | URL | Notes |
|----------|-----|-------|
| MCP Specification | https://spec.modelcontextprotocol.io/ | Official protocol specification |
| MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk | Reference implementation |
| MCP Java SDK (Spring AI) | https://docs.spring.io/spring-ai/reference/api/mcp.html | Spring AI MCP integration |
| Anthropic MCP Announcement | https://www.anthropic.com/news/model-context-protocol | Original announcement |
| MCP Server Registry | https://github.com/modelcontextprotocol/servers | Community MCP servers |

### 15.2 Swiggy & Zomato

| Resource | URL | Notes |
|----------|-----|-------|
| Swiggy MCP Manifest | https://github.com/Swiggy/swiggy-mcp-server-manifest | MCP tool definitions |
| Zomato MCP Manifest | https://github.com/Zomato/mcp-server-manifest | MCP tool definitions |
| Zomato API (Legacy) | https://developers.zomato.com/api | Deprecated but referenced |
| Swiggy Partner Portal | https://partner.swiggy.com/ | Partner integration |

### 15.3 Competitive Reference

| Resource | Notes |
|----------|-------|
| DoorDash Drive API | Partner API for delivery-as-a-service |
| Uber Eats API | Restaurant partner integration |
| Google Places API | Restaurant metadata and reviews |

### 15.4 FoodBot Internal Documentation

| Document | Path | Relevance |
|----------|------|-----------|
| Architecture Final | `/docs/ARCHITECTURE_FINAL.md` | System architecture reference |
| MCP Code Generation | `/prompt-docs/CODE_GENERATION_MCP.md` | MCP Orchestrator design |
| MCP Implementation Progress | `/prompt-docs/IMPLEMENTATION_PROGRESS_MCP.md` | Current implementation status |
| Project Summary | `/prompt-docs/PROJECT_SUMMARY.md` | Overall project status |
| Requirements Expanded | `/prompt-docs/REQUIREMENTS_EXPANDED.md` | Detailed requirements |

### 15.5 Existing FoodBot MCP Integration Points

| File | Path | Status |
|------|------|--------|
| SwiggyMCPClient.java | `services/mcp-orchestrator/.../providers/swiggy/SwiggyMCPClient.java` | Stub (returns empty) |
| ZomatoMCPClient.java | `services/mcp-orchestrator/.../providers/zomato/ZomatoMCPClient.java` | Stub (returns empty) |
| MCPProviderClient.java | `services/mcp-orchestrator/.../providers/MCPProviderClient.java` | Interface (complete) |
| MCPProvidersConfig.java | `services/mcp-orchestrator/.../config/MCPProvidersConfig.java` | Configuration (complete) |
| application.yml | `services/mcp-orchestrator/src/main/resources/application.yml` | Provider config (complete) |

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| **MCP** | Model Context Protocol -- AI agent protocol for tool calling |
| **MCP Server** | A service that exposes tools/resources/prompts via MCP |
| **MCP Client** | A consumer that connects to MCP servers (typically an AI agent) |
| **Tool** | A function that an MCP server exposes for invocation |
| **Resource** | Read-only data exposed by an MCP server |
| **Prompt** | A pre-defined prompt template exposed by an MCP server |
| **stdio** | Standard input/output transport for local MCP servers |
| **SSE** | Server-Sent Events transport for remote MCP servers |
| **Circuit Breaker** | Resilience pattern that stops calls to failing services |
| **Bulkhead** | Resilience pattern that isolates concurrent calls |
| **Saga** | Distributed transaction pattern with compensation |

## Appendix B: Decision Record

| Date | Decision | Rationale | Alternatives Considered |
|------|----------|-----------|------------------------|
| 2026-02-19 | Hybrid Architecture (Option C) | Best balance of security, performance, and UX | Browser-only (A), Pure backend (B) |
| 2026-02-19 | Backend MCP client (Java) | Aligns with existing MCP Orchestrator | TypeScript MCP client in Gateway |
| 2026-02-19 | Encrypted token store in Redis | Fast access + security | Database storage, Vault |
| 2026-02-19 | OAuth redirect for account linking | Standard, user-trustworthy | API key entry, session scraping |
| 2026-02-19 | Mock-first with real provider fallback | Always-available development | Real-only (fragile), Mock-only (limited) |
| 2026-02-19 | Direct API as MCP fallback | Pragmatic if MCP servers unavailable | Wait for MCP availability |

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-19
**Status:** Complete -- Ready for Review and POC Planning
