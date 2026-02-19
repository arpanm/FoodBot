# Swiggy Integration Strategy

**Version:** 1.0.0
**Date:** 2026-02-19
**Status:** Active
**Platform:** Swiggy (swiggy.com)

---

## Table of Contents

- [1. Feasibility Analysis](#1-feasibility-analysis)
- [2. Chosen Approach](#2-chosen-approach)
- [3. Architecture Diagram](#3-architecture-diagram)
- [4. Authentication Flow](#4-authentication-flow)
- [5. API Endpoints](#5-api-endpoints)
- [6. Data Mapping](#6-data-mapping)
- [7. Rate Limiting](#7-rate-limiting)
- [8. Error Handling](#8-error-handling)
- [9. Caching Strategy](#9-caching-strategy)
- [10. Cost Analysis](#10-cost-analysis)
- [11. Legal Considerations](#11-legal-considerations)
- [12. Fallback Strategy](#12-fallback-strategy)

---

## 1. Feasibility Analysis

### 1.1 Can We Use Direct MCP?

**Answer: No -- not directly. The Swiggy MCP server manifest (`github.com/Swiggy/swiggy-mcp-server-manifest`) is a specification repository, not a deployable server.**

**Evidence:**

| Check | Result | Details |
|-------|--------|---------|
| GitHub repository content | Manifest only | Tool definitions, resource schemas, prompt templates |
| npm package `@swiggy/mcp-server` | Not published | No official npm package found |
| npm package `@modelcontextprotocol/server-swiggy` | Not published | No MCP registry package |
| Community MCP server | None found | No third-party implementations |
| Swiggy public API program | Not available | No developer portal or API key program |
| Swiggy Partner API | Restaurant partners only | Not available for aggregator use cases |

### 1.2 Why Direct MCP Is Not Feasible

1. **Manifest-only repository**: The GitHub repo contains MCP tool schemas (JSON Schema definitions for `swiggy_search_restaurants`, `swiggy_get_restaurant_menu`, etc.) but no actual server implementation that can be deployed or connected to.

2. **No public API program**: Unlike platforms such as Google Maps or Yelp, Swiggy does not offer a public developer API. There is no API key registration, no developer portal, and no documented REST endpoints for third-party consumption.

3. **Session-based authentication only**: All Swiggy data access requires a user session token obtained through their phone+OTP login flow. There are no service-to-service credentials (client_id/client_secret).

4. **No npm package**: Searching npm for `@swiggy/mcp-server`, `swiggy-mcp`, or `@modelcontextprotocol/server-swiggy` yields no results. The manifest references `npx -y @swiggy/mcp-server` as a hypothetical command, but the package does not exist.

### 1.3 Integration Options Evaluated

| Option | Feasibility | Legal | Reliability | Cost | Selected |
|--------|------------|-------|-------------|------|----------|
| Direct MCP server call | Not possible | N/A | N/A | N/A | No |
| Public REST API | Not available | N/A | N/A | N/A | No |
| Web scraping (Puppeteer) | Technically possible | High risk (ToS violation) | Fragile | High (compute) | No |
| Session-proxied API calls | Possible (user token required) | Medium risk | Medium | Low | **Yes (Primary)** |
| Mock provider (development) | Always available | No risk | Deterministic | Free | **Yes (Fallback)** |
| Google Places API supplement | Available | Low risk | High | $17/1000 req | **Yes (Enrichment)** |

---

## 2. Chosen Approach

### Primary Strategy: Session-Proxied API Integration

**Architecture Pattern:** The MCP Adapter acts as a backend proxy that uses the user's Swiggy session token to make API calls to Swiggy's internal endpoints on behalf of the authenticated user.

**How it works:**

1. User links their Swiggy account in FoodBot by logging into Swiggy (phone+OTP)
2. Session token is captured and stored encrypted in Redis
3. When FoodBot needs Swiggy data, the adapter uses the stored session token
4. API calls are made to Swiggy's internal API endpoints (reverse-engineered from their web/mobile apps)
5. Responses are normalized to FoodBot's internal data model

**Why this approach:**

- It is the only technically feasible method given Swiggy's closed ecosystem
- It respects user authorization (user explicitly links their account)
- It leverages the same APIs that Swiggy's own web application uses
- Combined with aggressive caching, rate limiting, and a mock fallback, it provides a robust integration

### Secondary Strategy: Mock Provider

For development, testing, and demo purposes, a Mock provider generates realistic Swiggy-format data that matches the exact schema of real responses.

### Tertiary Strategy: Google Places API Enrichment

When Swiggy session is unavailable or expired, basic restaurant metadata (name, location, ratings, photos) is supplemented via Google Places API.

---

## 3. Architecture Diagram

```
+==================================================================+
|                    FoodBot MCP Adapter                             |
+==================================================================+
|                                                                    |
|  +------------------+     +------------------+                     |
|  | SwiggyAPIProvider|     | SwiggyMockProv.  |                     |
|  | (Primary)        |     | (Fallback)       |                     |
|  +--------+---------+     +--------+---------+                     |
|           |                        |                               |
|  +--------v---------+     +--------v---------+                     |
|  | swiggyClient.ts  |     | Mock data gen    |                     |
|  | (HTTP client)    |     | (deterministic)  |                     |
|  +--------+---------+     +------------------+                     |
|           |                                                        |
|  +--------v---------+                                              |
|  | swiggyAuth.ts    |                                              |
|  | (Token manager)  |                                              |
|  +--------+---------+                                              |
|           |                                                        |
|  +--------v---------+                                              |
|  | Redis Token Store|                                              |
|  | (AES-256-GCM)   |                                              |
|  +--------+---------+                                              |
|           |                                                        |
+===========|========================================================+
            |
            | HTTPS (user session token in headers)
            |
+-----------v-----------+
| Swiggy Internal APIs  |
| www.swiggy.com/dapi/* |
+-----------------------+

Data Flow:
  1. User -> FoodBot UI -> "Search pizza near me"
  2. FoodBot API -> MCP Adapter -> SwiggyAPIProvider
  3. SwiggyAPIProvider -> Redis (get encrypted session token)
  4. SwiggyAPIProvider -> swiggyClient -> Swiggy DAPI
  5. Swiggy DAPI -> raw JSON response
  6. swiggyMapper -> normalized Restaurant/Dish objects
  7. MCP Adapter -> cache result in Redis (10min TTL)
  8. MCP Adapter -> FoodBot API -> User
```

---

## 4. Authentication Flow

### 4.1 Account Linking (One-time Setup)

```
Step 1: User clicks "Link Swiggy Account" in FoodBot
Step 2: FoodBot opens Swiggy login page (in iframe/popup)
Step 3: User enters phone number on Swiggy
Step 4: User receives OTP from Swiggy
Step 5: User enters OTP on Swiggy login page
Step 6: Swiggy sets session cookies (_session_tid, _guest_tid, _device_id)
Step 7: FoodBot captures session cookies via callback/redirect
Step 8: MCP Adapter encrypts tokens with AES-256-GCM
Step 9: Encrypted tokens stored in Redis with key: platform:token:{userId}:swiggy
Step 10: TTL set to 24 hours (matching Swiggy session expiry)
Step 11: User sees "Swiggy account linked successfully"
```

### 4.2 Token Usage (Per Request)

```
Step 1: MCP Adapter receives search request with userId
Step 2: Fetch encrypted token from Redis: platform:token:{userId}:swiggy
Step 3: Decrypt token using server-side encryption key
Step 4: Check token expiry (if expired, return AUTH_EXPIRED error)
Step 5: Set session cookies on HTTP client
Step 6: Make API call to Swiggy with session cookies
Step 7: If 401 response, mark token as expired, notify user
Step 8: Return results or error
```

### 4.3 Token Refresh

Swiggy sessions do not support automatic refresh. When a session expires:

1. Circuit breaker detects repeated 401 errors
2. User is notified: "Your Swiggy session has expired. Please re-link your account."
3. Fallback to Mock provider or cached data until re-linked
4. Re-linking follows the same flow as initial linking

---

## 5. API Endpoints

### 5.1 Swiggy Internal API Endpoints (Reverse-Engineered)

These endpoints are used by Swiggy's own web application:

| Operation | Method | Endpoint | Auth Required |
|-----------|--------|----------|---------------|
| Search restaurants | GET | `https://www.swiggy.com/dapi/restaurants/list/v5` | Session cookie |
| Get restaurant menu | GET | `https://www.swiggy.com/dapi/menu/pl` | Session cookie |
| Search dishes | GET | `https://www.swiggy.com/dapi/restaurants/search/v3` | Session cookie |
| Get restaurant details | GET | `https://www.swiggy.com/dapi/restaurants/list/v5` | Session cookie |
| Get offers | GET | `https://www.swiggy.com/dapi/offers/restaurant` | Session cookie |
| Check availability | GET | `https://www.swiggy.com/dapi/restaurants/list/v5` | Session cookie |

### 5.2 Query Parameters

**Restaurant Search:**
```
lat={latitude}&lng={longitude}&page_type=DESKTOP_WEB_LISTING
&offset={offset}&sortBy={sortBy}&filters={filters}
```

**Menu Fetch:**
```
page-type=REGULAR_MENU&complete-menu=true
&lat={latitude}&lng={longitude}&restaurantId={id}
```

**Dish Search:**
```
lat={latitude}&lng={longitude}&str={query}
&trackingId={uuid}&submitAction=ENTER
```

---

## 6. Data Mapping

### 6.1 Swiggy Restaurant -> FoodBot Restaurant

```typescript
// Swiggy response format
interface SwiggyRestaurantInfo {
  id: string;
  name: string;
  cloudinaryImageId: string;
  locality: string;
  areaName: string;
  costForTwo: string;          // "Rs. 400 for two"
  cuisines: string[];
  avgRating: number;
  totalRatingsString: string;  // "1K+ ratings"
  sla: {
    deliveryTime: number;      // minutes
    lastMileTravel: number;    // km
    serviceability: string;
  };
  isOpen: boolean;
  availability: {
    nextCloseTime: string;
    opened: boolean;
  };
  aggregatedDiscountInfoV3: {
    header: string;            // "60% OFF"
    subHeader: string;         // "UPTO Rs. 120"
  };
}

// FoodBot internal format
interface Restaurant {
  id: string;                  // "swiggy-{swiggy_id}"
  externalId: string;          // original swiggy id
  provider: 'swiggy';
  name: string;
  imageUrl: string;            // cloudinary URL
  address: string;             // locality + areaName
  cuisines: string[];
  rating: number;
  reviewCount: number;         // parsed from totalRatingsString
  deliveryTimeMinutes: number;
  distanceKm: number;
  priceRange: PriceRange;      // parsed from costForTwo
  isOpen: boolean;
  isAvailable: boolean;
  offers: OfferInfo[];
  operatingHours: OperatingHours;
  location: GeoLocation;
}
```

### 6.2 Swiggy Dish -> FoodBot Dish

```typescript
// Swiggy format
interface SwiggyDishInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  imageId: string;
  price: number;              // in paisa (e.g., 25000 = Rs. 250)
  defaultPrice: number;
  ratings: {
    aggregatedRating: {
      rating: string;
      ratingCount: string;
    };
  };
  isVeg: number;              // 1 = veg, 0 = non-veg
  addons: SwiggyAddon[];
}

// FoodBot format
interface Dish {
  id: string;                 // "swiggy-dish-{swiggy_id}"
  externalId: string;
  provider: 'swiggy';
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  price: number;              // converted to rupees
  originalPrice: number;
  currency: 'INR';
  rating: number;
  reviewCount: number;
  isVegetarian: boolean;
  isAvailable: boolean;
  customizations: Customization[];
  nutritionalInfo: NutritionalInfo | null;
}
```

---

## 7. Rate Limiting

### 7.1 Swiggy Rate Limits (Observed)

| Context | Limit | Window | Strategy |
|---------|-------|--------|----------|
| Search queries | 30 req | per minute | Token bucket with 30 tokens/min |
| Menu fetches | 60 req | per minute | Token bucket with 60 tokens/min |
| Overall per session | 120 req | per minute | Global rate limiter |

### 7.2 FoodBot Rate Limiting Strategy

```
Per-user rate limiting:
  - Max 10 search requests per minute per user
  - Max 20 menu fetches per minute per user
  - Max 50 total requests per minute per user

Global rate limiting:
  - Max 100 search requests per minute (all users)
  - Max 200 menu fetches per minute (all users)
  - Max 500 total requests per minute (all users)

Burst handling:
  - Allow 3x burst for 5-second window
  - Queue excess requests with 2-second delay
  - Reject after queue reaches 50 requests
```

---

## 8. Error Handling

### 8.1 Error Categories and Responses

| Error Code | HTTP Status | Description | Action |
|------------|-------------|-------------|--------|
| `SWIGGY_AUTH_EXPIRED` | 401 | Session token expired | Notify user to re-link, fall back to cache/mock |
| `SWIGGY_RATE_LIMITED` | 429 | Rate limit exceeded | Queue request, return cached data |
| `SWIGGY_UNAVAILABLE` | 503 | Swiggy API unreachable | Open circuit breaker, use mock |
| `SWIGGY_TIMEOUT` | 504 | Request timeout (>5s) | Retry once, then return cached data |
| `SWIGGY_PARSE_ERROR` | 500 | Response format changed | Log alert, return partial data |
| `SWIGGY_NOT_LINKED` | 403 | User hasn't linked Swiggy | Prompt to link, use mock data |
| `SWIGGY_LOCATION_INVALID` | 400 | Location not serviceable | Return "Not available in your area" |

### 8.2 Retry Strategy

```
Retry Policy:
  - Max retries: 3
  - Initial delay: 500ms
  - Backoff multiplier: 2.0
  - Max delay: 5000ms
  - Retry on: 500, 502, 503 (NOT 401, 429)

Circuit Breaker:
  - Failure threshold: 5 failures in 60 seconds
  - Open duration: 30 seconds
  - Half-open: Allow 1 test request
  - Success threshold: 3 successes to close
```

---

## 9. Caching Strategy

| Data Type | Cache Key Pattern | TTL | Shared |
|-----------|------------------|-----|--------|
| Restaurant search | `swiggy:search:{location_hash}:{query_hash}` | 5 min | Yes (location-based) |
| Restaurant details | `swiggy:restaurant:{id}` | 15 min | Yes |
| Menu data | `swiggy:menu:{restaurant_id}` | 10 min | Yes |
| Dish availability | `swiggy:avail:{restaurant_id}` | 1 min | Yes |
| User session token | `platform:token:{user_id}:swiggy` | 24 hours | No (user-specific) |

### Cache Invalidation

- TTL-based expiry (primary mechanism)
- Manual invalidation on user request (force refresh)
- Cascade invalidation: menu change invalidates restaurant details

---

## 10. Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| Swiggy API calls | $0 | Using user session (no API fees) |
| Redis cache (AWS ElastiCache) | ~$15/month | t3.micro instance |
| Encryption key management | ~$1/month | AWS KMS |
| Google Places API (supplementary) | ~$17/1000 req | Only for fallback enrichment |
| Server compute | ~$20/month | Shared with other services |
| **Total estimated** | **~$36/month** | For moderate usage |

---

## 11. Legal Considerations

### 11.1 Terms of Service Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Automated access to Swiggy | **High** | User explicitly authorizes access via their own session |
| Data storage/caching | **Medium** | Short TTLs (max 24h), no permanent storage of Swiggy data |
| Brand usage | **Low** | Clear attribution "Data from Swiggy", no trademark misuse |
| Reselling data | **High** | Never resell; data used only to serve the authenticated user |
| Commercial aggregation | **High** | Legal review required before production deployment |

### 11.2 Recommended Legal Actions

1. Consult legal team about Swiggy ToS compliance
2. Implement explicit user consent during account linking
3. Add "Data sourced from Swiggy" attribution in UI
4. Consider applying for Swiggy's partner program
5. Maintain audit logs of all data access

---

## 12. Fallback Strategy

```
Priority Chain:
  1. SwiggyAPIProvider (user session, real data)
     |-- If AUTH_EXPIRED -> Notify user, continue to #2
     |-- If RATE_LIMITED -> Return cached, continue to #2
     |-- If UNAVAILABLE -> Circuit breaker opens, continue to #2
     |
  2. Redis Cache (recent results)
     |-- If cache hit -> Return stale data with "stale" flag
     |-- If cache miss -> Continue to #3
     |
  3. MockProvider (development/demo data)
     |-- Always available
     |-- Returns realistic but synthetic data
     |-- Marked as "demo data" in response

Response includes metadata:
  {
    "source": "swiggy" | "cache" | "mock",
    "freshness": "live" | "stale" | "synthetic",
    "cachedAt": "2026-02-19T10:30:00Z" | null,
    "nextRefreshAt": "2026-02-19T10:40:00Z" | null
  }
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-19
**Next Review:** 2026-03-19
