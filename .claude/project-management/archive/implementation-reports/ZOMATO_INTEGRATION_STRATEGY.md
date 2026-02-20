# Zomato Integration Strategy

**Version:** 1.0.0
**Date:** 2026-02-19
**Status:** Active
**Platform:** Zomato (zomato.com)

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

**Answer: No -- the Zomato MCP server manifest (`github.com/Zomato/mcp-server-manifest`) is also a specification repository, not a deployable MCP server.**

**Evidence:**

| Check | Result | Details |
|-------|--------|---------|
| GitHub repository content | Manifest only | Tool definitions and resource schemas |
| npm package `@zomato/mcp-server` | Not published | No official npm package |
| npm package `@modelcontextprotocol/server-zomato` | Not published | No MCP registry package |
| Community MCP server | None found | No third-party implementations |
| Zomato Public API (v2.1) | **Deprecated (2020)** | Legacy API keys may partially work for read-only |
| Zomato OAuth 2.0 | Historically supported | Developer program now restricted |

### 1.2 Why Direct MCP Is Not Feasible

1. **Manifest-only repository**: Like Swiggy, the Zomato GitHub repo contains MCP tool schema definitions but no runnable server code.

2. **Deprecated public API**: Zomato had a public API (v2.1) that was deprecated in 2020. Some read-only endpoints (restaurant search, details, reviews) may still accept legacy API keys, but this is unreliable and unsupported.

3. **OAuth flow restricted**: Zomato's developer program is no longer accepting new registrations for most use cases. OAuth client_id/client_secret pairs are difficult to obtain.

4. **No npm package**: No official or community npm package exists for a Zomato MCP server.

### 1.3 Key Advantage Over Swiggy: Legacy API

Zomato's deprecated public API (v2.1) provides a significant advantage:

- **Read-only access** to restaurant metadata, search, and reviews via API key
- **No user session required** for basic restaurant data
- **Documented endpoints** with known response schemas
- **Rate limits**: 1000 requests/day on legacy API key tier

This means Zomato integration has TWO viable strategies (API key for read-only + session for ordering), whereas Swiggy has only one (session-based).

### 1.4 Integration Options Evaluated

| Option | Feasibility | Legal | Reliability | Cost | Selected |
|--------|------------|-------|-------------|------|----------|
| Direct MCP server call | Not possible | N/A | N/A | N/A | No |
| Legacy REST API (v2.1) | Partially available | Medium (deprecated) | Low-Medium | Free | **Yes (Read-only)** |
| Session-proxied API calls | Possible | Medium risk | Medium | Low | **Yes (Full access)** |
| Web scraping | Technically possible | High risk | Fragile | High | No |
| Mock provider | Always available | No risk | Deterministic | Free | **Yes (Fallback)** |
| Google Places enrichment | Available | Low risk | High | $17/1000 | **Yes (Enrichment)** |

---

## 2. Chosen Approach

### Dual-Strategy Architecture

Zomato integration uses a **dual-strategy approach** that combines two methods:

**Strategy A: Legacy API (Read-Only Operations)**
- Uses Zomato API v2.1 with API key authentication
- Covers: restaurant search, details, reviews, collections
- No user session required
- Limited to 1000 requests/day
- Best for browsing and discovery

**Strategy B: Session-Proxied API (Full Operations)**
- Uses the user's Zomato session token (OAuth or cookie-based)
- Covers: cart, ordering, payment, order tracking, personalization
- Requires user to link their Zomato account
- Rate limited per session
- Best for transactional operations

**Strategy C: Mock Provider (Fallback)**
- Always available for development and demo
- Generates realistic Zomato-format data

### Why Dual Strategy?

```
Use Case Matrix:

                    | API Key (Strategy A) | Session (Strategy B) | Mock (Strategy C) |
--------------------|---------------------|---------------------|-------------------|
Restaurant search   | YES (primary)       | YES (backup)        | YES (fallback)    |
Restaurant details  | YES (primary)       | YES (backup)        | YES (fallback)    |
Reviews             | YES (primary)       | YES (backup)        | YES (fallback)    |
Collections         | YES (primary)       | NO                  | YES (fallback)    |
Menu browsing       | NO                  | YES (primary)       | YES (fallback)    |
Add to cart         | NO                  | YES (primary)       | YES (fallback)    |
Place order         | NO                  | YES (primary)       | NO                |
Track order         | NO                  | YES (primary)       | YES (fallback)    |
Recommendations     | NO                  | YES (primary)       | YES (fallback)    |
```

---

## 3. Architecture Diagram

```
+==================================================================+
|                    FoodBot MCP Adapter - Zomato                    |
+==================================================================+
|                                                                    |
|  +---------------------+    +---------------------+               |
|  | ZomatoAPIProvider   |    | ZomatoSessionProv.  |               |
|  | (Strategy A)        |    | (Strategy B)        |               |
|  | Read-only via key   |    | Full via session    |               |
|  +----------+----------+    +----------+----------+               |
|             |                          |                          |
|  +----------v----------+    +----------v----------+               |
|  | zomatoClient.ts     |    | zomatoClient.ts     |               |
|  | (API key auth)      |    | (Session auth)      |               |
|  +----------+----------+    +----------+----------+               |
|             |                          |                          |
|             |               +----------v----------+               |
|             |               | zomatoAuth.ts       |               |
|             |               | (Token manager)     |               |
|             |               +----------+----------+               |
|             |                          |                          |
|  +----------v--------------------------v----------+               |
|  |              Redis Cache/Token Store            |               |
|  |              (AES-256-GCM encrypted)            |               |
|  +-------------------------------------------------+               |
|                                                                    |
+====================================================================+
             |                          |
             | HTTPS (API key)          | HTTPS (session cookie)
             |                          |
+------------v-----------+  +-----------v-----------+
| Zomato API v2.1        |  | Zomato Internal APIs  |
| developers.zomato.com  |  | www.zomato.com/webroutes/* |
| (Legacy, read-only)    |  | (Full access)         |
+------------------------+  +-----------------------+

Routing Logic:
  IF operation is read-only (search, details, reviews):
    TRY Strategy A (API key) FIRST
    IF API key exhausted (1000/day limit) OR failed:
      FALL BACK to Strategy B (session) IF user linked
      ELSE FALL BACK to Mock
  IF operation requires user context (cart, order):
    USE Strategy B (session) ONLY
    IF session expired:
      NOTIFY user to re-link
      FALL BACK to Mock for display purposes
```

---

## 4. Authentication Flow

### 4.1 Strategy A: API Key Authentication

```
Setup (one-time, admin):
  1. Register on Zomato developer portal (legacy)
  2. Obtain API key (user-key header)
  3. Store API key in environment variable: ZOMATO_API_KEY
  4. Configure in adapter.config.ts

Usage (per request):
  1. Set header: user-key: {ZOMATO_API_KEY}
  2. Make GET request to Zomato API v2.1
  3. Track daily usage (1000/day limit)
  4. If limit reached, switch to Strategy B or Mock
```

### 4.2 Strategy B: Session/OAuth Authentication

```
Account Linking (one-time per user):
  Step 1: User clicks "Link Zomato Account" in FoodBot
  Step 2: FoodBot redirects to Zomato OAuth page
  Step 3: User logs in to Zomato (Google/Facebook/phone)
  Step 4: Zomato redirects back with authorization code
  Step 5: MCP Adapter exchanges code for access_token + refresh_token
  Step 6: Tokens encrypted with AES-256-GCM and stored in Redis
  Step 7: Key: platform:token:{userId}:zomato, TTL: 24 hours

Token Refresh:
  Step 1: Before API call, check token expiry
  Step 2: If expiring within 5 minutes, proactively refresh
  Step 3: POST to Zomato token endpoint with refresh_token
  Step 4: Store new access_token, update TTL
  Step 5: If refresh fails, notify user to re-link
```

### 4.3 OAuth 2.0 Configuration

```typescript
interface ZomatoOAuthConfig {
  clientId: string;           // From Zomato developer portal
  clientSecret: string;       // From Zomato developer portal
  redirectUri: string;        // FoodBot callback URL
  authorizationUrl: string;   // https://www.zomato.com/oauth/authorize
  tokenUrl: string;           // https://www.zomato.com/oauth/token
  scopes: string[];           // ['read', 'write', 'order']
}
```

---

## 5. API Endpoints

### 5.1 Strategy A: Legacy API (v2.1) Endpoints

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Search restaurants | GET | `https://developers.zomato.com/api/v2.1/search` | API key |
| Restaurant details | GET | `https://developers.zomato.com/api/v2.1/restaurant` | API key |
| Reviews | GET | `https://developers.zomato.com/api/v2.1/reviews` | API key |
| Collections | GET | `https://developers.zomato.com/api/v2.1/collections` | API key |
| Cuisines | GET | `https://developers.zomato.com/api/v2.1/cuisines` | API key |
| Categories | GET | `https://developers.zomato.com/api/v2.1/categories` | API key |
| Cities | GET | `https://developers.zomato.com/api/v2.1/cities` | API key |
| Location details | GET | `https://developers.zomato.com/api/v2.1/location_details` | API key |

### 5.2 Strategy B: Internal API Endpoints

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Search (full) | GET | `https://www.zomato.com/webroutes/search/autoSuggest` | Session |
| Restaurant menu | GET | `https://www.zomato.com/webroutes/getPage` | Session |
| Add to cart | POST | `https://www.zomato.com/webroutes/order/cart/add` | Session |
| View cart | GET | `https://www.zomato.com/webroutes/order/cart` | Session |
| Place order | POST | `https://www.zomato.com/webroutes/order/place` | Session |
| Track order | GET | `https://www.zomato.com/webroutes/order/track` | Session |
| Order history | GET | `https://www.zomato.com/webroutes/user/orders` | Session |
| Recommendations | GET | `https://www.zomato.com/webroutes/recommend` | Session |

### 5.3 Query Parameters

**Legacy API Search:**
```
q={query}&lat={latitude}&lon={longitude}&radius={radius}
&cuisines={cuisine_ids}&sort={sort_field}&order={asc|desc}
&count={results_count}&start={offset}
```

**Legacy API Restaurant Details:**
```
res_id={restaurant_id}
```

---

## 6. Data Mapping

### 6.1 Zomato Restaurant -> FoodBot Restaurant

```typescript
// Zomato API v2.1 response
interface ZomatoRestaurantResponse {
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
    cuisines: string;               // "Italian, Pizza, Pasta"
    average_cost_for_two: number;
    price_range: number;            // 1-4
    currency: string;
    offers: string[];
    thumb: string;
    user_rating: {
      aggregate_rating: string;     // "4.2"
      rating_text: string;          // "Very Good"
      rating_color: string;         // "5BA829"
      votes: string;                // "1234"
    };
    photos_url: string;
    menu_url: string;
    featured_image: string;
    has_online_delivery: number;
    is_delivering_now: number;
    delivery_time: string;          // "45 minutes"
  };
}

// Mapping to FoodBot internal model
interface Restaurant {
  id: string;                       // "zomato-{res_id}"
  externalId: string;               // original zomato id
  provider: 'zomato';
  name: string;
  imageUrl: string;                 // featured_image or thumb
  address: string;                  // location.address
  cuisines: string[];               // split from comma-separated string
  rating: number;                   // parseFloat(aggregate_rating)
  reviewCount: number;              // parseInt(votes)
  deliveryTimeMinutes: number;      // parsed from delivery_time
  distanceKm: number;              // calculated from lat/lng
  priceRange: PriceRange;           // mapped from price_range (1-4)
  isOpen: boolean;                  // is_delivering_now === 1
  isAvailable: boolean;             // has_online_delivery === 1
  offers: OfferInfo[];              // mapped from offers array
  operatingHours: OperatingHours;
  location: GeoLocation;            // { lat, lng }
}
```

### 6.2 Zomato Dish -> FoodBot Dish

```typescript
// Zomato internal API format
interface ZomatoDishResponse {
  dish: {
    dish_id: string;
    name: string;
    description: string;
    price: number;              // in rupees
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

// Mapping to FoodBot internal model
interface Dish {
  id: string;                   // "zomato-dish-{dish_id}"
  externalId: string;
  provider: 'zomato';
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  price: number;
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

### 7.1 Zomato Rate Limits

| Strategy | Context | Limit | Window |
|----------|---------|-------|--------|
| API Key (A) | All requests | 1000 | per day |
| Session (B) | Search | 30 | per minute |
| Session (B) | Menu | 60 | per minute |
| Session (B) | Orders | 10 | per minute |

### 7.2 FoodBot Rate Limiting Strategy

```
Strategy A (API Key):
  - Daily budget: 1000 requests
  - Reserve 200 for critical operations
  - Distribute remaining 800 across hours
  - Max ~33 requests per hour for search/details
  - When budget exhausted, switch to Strategy B or cache

Strategy B (Session):
  - Per-user: Max 10 search, 20 menu, 5 order per minute
  - Global: Max 100 search, 200 menu, 50 order per minute
  - Burst: 3x for 5-second window

Combined:
  - Route read-only to Strategy A first (save session quota)
  - Route transactional to Strategy B only
  - Track daily API key usage in Redis counter
```

---

## 8. Error Handling

### 8.1 Error Categories

| Error Code | Source | Description | Action |
|------------|--------|-------------|--------|
| `ZOMATO_API_KEY_INVALID` | Strategy A | API key rejected | Check key, switch to Strategy B |
| `ZOMATO_API_LIMIT_REACHED` | Strategy A | Daily limit exhausted | Switch to Strategy B or cache |
| `ZOMATO_AUTH_EXPIRED` | Strategy B | Session/OAuth expired | Try refresh, notify user |
| `ZOMATO_RATE_LIMITED` | Both | Rate limit hit | Queue, return cached |
| `ZOMATO_UNAVAILABLE` | Both | API unreachable | Circuit breaker, use mock |
| `ZOMATO_TIMEOUT` | Both | Request timeout (>5s) | Retry once, return cached |
| `ZOMATO_PARSE_ERROR` | Both | Response format changed | Log alert, partial data |
| `ZOMATO_NOT_LINKED` | Strategy B | User hasn't linked | Use Strategy A or mock |

### 8.2 Retry Strategy

```
Strategy A (API Key) Retry:
  - Max retries: 2 (conserve daily budget)
  - Initial delay: 1000ms
  - Retry on: 500, 502, 503

Strategy B (Session) Retry:
  - Max retries: 3
  - Initial delay: 500ms
  - Backoff multiplier: 2.0
  - Max delay: 5000ms
  - Retry on: 500, 502, 503 (NOT 401, 429)

Circuit Breaker (per strategy):
  - Failure threshold: 5 in 60 seconds
  - Open duration: 30 seconds
  - Half-open: 1 test request
  - Success threshold: 3 to close
```

---

## 9. Caching Strategy

| Data Type | Cache Key Pattern | TTL | Strategy Source |
|-----------|------------------|-----|----------------|
| Restaurant search | `zomato:search:{location_hash}:{query_hash}` | 10 min | A or B |
| Restaurant details | `zomato:restaurant:{id}` | 15 min | A or B |
| Reviews | `zomato:reviews:{restaurant_id}` | 30 min | A |
| Collections | `zomato:collections:{city_id}` | 60 min | A |
| Menu data | `zomato:menu:{restaurant_id}` | 10 min | B only |
| Availability | `zomato:avail:{restaurant_id}` | 1 min | B only |
| API key usage | `zomato:apikey:usage:{date}` | 24 hours | Counter |
| User tokens | `platform:token:{userId}:zomato` | 24 hours | Encrypted |

---

## 10. Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| Zomato API Key (legacy) | $0 | Free tier (if key still works) |
| Session-proxied calls | $0 | Using user session |
| Redis cache | ~$15/month | Shared with Swiggy |
| Encryption management | ~$1/month | Shared with Swiggy |
| Google Places fallback | ~$10/month | Lower usage (Zomato API covers more) |
| Server compute | ~$15/month | Shared |
| **Total estimated** | **~$41/month** | For moderate usage |

---

## 11. Legal Considerations

### 11.1 Terms of Service Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Deprecated API usage | **Medium** | API key still accepted; monitor for shutdown |
| Session-proxied access | **High** | User explicitly authorizes via their account |
| Data caching | **Medium** | Short TTLs, Zomato ToS allows <24h caching |
| Brand attribution | **Low** | Display "Powered by Zomato" in UI |
| Commercial aggregation | **High** | Legal review needed before production |
| Review data usage | **Medium** | Attribution required per Zomato terms |

### 11.2 Advantage: Historical Public API

Zomato has a history of supporting third-party integrations through their public API. Even though it's deprecated, this creates a more favorable legal position compared to Swiggy.

---

## 12. Fallback Strategy

```
Priority Chain:
  1. ZomatoAPIProvider (Strategy A: API key, read-only)
     |-- If API key exhausted -> Continue to #2
     |-- If API endpoint removed -> Continue to #3
     |
  2. ZomatoSessionProvider (Strategy B: user session)
     |-- If user not linked -> Continue to #3
     |-- If session expired -> Try refresh, then #3
     |
  3. Redis Cache (recent results)
     |-- If cache hit -> Return stale data
     |-- If cache miss -> Continue to #4
     |
  4. MockProvider (development/demo)
     |-- Always available
     |-- Realistic synthetic data
     |-- Marked as "demo data"

Response metadata:
  {
    "source": "zomato-api" | "zomato-session" | "cache" | "mock",
    "strategy": "api-key" | "session" | "cached" | "synthetic",
    "freshness": "live" | "stale" | "synthetic",
    "apiKeyUsageRemaining": 750
  }
```

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-19
**Next Review:** 2026-03-19
