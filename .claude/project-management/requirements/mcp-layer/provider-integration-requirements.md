# MCP Provider Integration Requirements

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** In Implementation

---

## Overview

This document defines requirements for integrating external food delivery providers (Swiggy, Zomato) and internal restaurant data sources with the FoodBot MCP layer.

## Provider Requirements

### REQ-PROVIDER-001: Internal Provider
**Priority:** P0 (Critical)
**Status:** ✅ Implemented

**Description:** Direct PostgreSQL access for FoodBot's internal restaurant database.

**Features:**
- Full CRUD operations on restaurants, dishes, menus
- Real-time data (no caching required)
- Geospatial search using PostGIS
- Full-text search on restaurant names and cuisines
- Complete control over data structure

**Performance Requirements:**
- Search query: < 50ms (p95)
- Menu retrieval: < 30ms (p95)
- Restaurant details: < 20ms (p95)

**Database Schema:**
```sql
-- Restaurants table
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cuisine_types TEXT[] NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address JSONB NOT NULL,
  rating DECIMAL(2,1) CHECK (rating >= 0 AND rating <= 5),
  price_range INTEGER CHECK (price_range >= 1 AND price_range <= 4),
  is_active BOOLEAN DEFAULT true,
  avg_delivery_time INTEGER,  -- minutes
  image_url TEXT,
  is_veg BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurants_cuisine ON restaurants USING GIN(cuisine_types);
CREATE INDEX idx_restaurants_rating ON restaurants(rating DESC);
CREATE INDEX idx_restaurants_active ON restaurants(is_active) WHERE is_active = true;
```

**Implementation Location:**
- `services/mcp-adapter/src/providers/internal/InternalProvider.ts`

**Status:** Production-ready

---

### REQ-PROVIDER-002: Swiggy Provider
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial Implementation

**Description:** OAuth-based integration with Swiggy's API for restaurant search, menu retrieval, and order placement.

**Integration Strategy:**
- **Method:** OAuth 2.0 + REST API
- **Authentication:** User-specific access tokens
- **Rate Limit:** 100 requests/minute per user
- **Timeout:** 5 seconds per request

**Supported Operations:**

| Operation | Endpoint | Status |
|-----------|----------|--------|
| Search Restaurants | `/dapi/restaurants/list` | ✅ Implemented |
| Restaurant Details | `/dapi/menu/pl` | ✅ Implemented |
| Get Menu | `/dapi/menu/pl` | ✅ Implemented |
| Check Availability | `/dapi/restaurants/v4` | ⚠️ Partial |
| Place Order | `/mapi/order/place` | ❌ Pending |

**Swiggy API Response Mapping:**
```typescript
// Swiggy Response → Internal Format
interface SwiggyRestaurantResponse {
  restaurant: {
    id: string;
    name: string;
    cuisines: string[];
    avgRating: string;
    costForTwo: number;
    cloudinaryImageId: string;
    sla: {
      deliveryTime: number;
      lastMileTravel: number;
    };
    veg: boolean;
    // ... more fields
  };
}

// Map to internal format
function mapSwiggyRestaurant(data: SwiggyRestaurantResponse): Restaurant {
  return {
    id: `swiggy-${data.restaurant.id}`,
    externalId: data.restaurant.id,
    provider: 'swiggy',
    name: data.restaurant.name,
    cuisineTypes: data.restaurant.cuisines,
    rating: parseFloat(data.restaurant.avgRating),
    priceRange: estimatePriceRange(data.restaurant.costForTwo),
    deliveryTime: data.restaurant.sla.deliveryTime,
    isVeg: data.restaurant.veg,
    imageUrl: buildImageUrl(data.restaurant.cloudinaryImageId),
    // ... more fields
  };
}
```

**Configuration:**
```bash
SWIGGY_ENABLED=true
SWIGGY_BASE_URL=https://www.swiggy.com
SWIGGY_TIMEOUT=5000
SWIGGY_RETRY_ATTEMPTS=3
SWIGGY_CB_THRESHOLD=5
SWIGGY_CACHE_SEARCH=300000        # 5 min
SWIGGY_CACHE_MENU=1800000         # 30 min
SWIGGY_CACHE_RESTAURANT=3600000   # 1 hour
SWIGGY_CACHE_AVAIL=120000         # 2 min
```

**Implementation Location:**
- `services/mcp-adapter/src/providers/swiggy/SwiggyAPIProvider.ts`
- `services/mcp-adapter/src/providers/swiggy/swiggyClient.ts`
- `services/mcp-adapter/src/providers/swiggy/swiggyMapper.ts`
- `services/mcp-adapter/src/providers/swiggy/swiggyAuth.ts`

**Known Issues:**
- Order placement requires payment integration
- Real-time availability may be inconsistent
- Image URLs may expire

**Status:** Functional for search and menu retrieval; order placement pending

---

### REQ-PROVIDER-003: Zomato Provider
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial Implementation

**Description:** OAuth-based integration with Zomato's API for restaurant search and menu retrieval.

**Integration Strategy:**
- **Method:** OAuth 2.0 + REST API
- **Authentication:** User-specific access tokens
- **Rate Limit:** 100 requests/minute per user
- **Timeout:** 5 seconds per request

**Supported Operations:**

| Operation | Endpoint | Status |
|-----------|----------|--------|
| Search Restaurants | `/api/v2.1/search` | ✅ Implemented |
| Restaurant Details | `/api/v2.1/restaurant` | ✅ Implemented |
| Get Menu | `/api/v2.1/menu` | ⚠️ Partial |
| Check Availability | `/api/v2.1/serviceability` | ❌ Pending |
| Place Order | `/api/v2.1/order` | ❌ Pending |

**Zomato API Response Mapping:**
```typescript
interface ZomatoRestaurantResponse {
  restaurant: {
    id: string;
    name: string;
    cuisines: string;  // Comma-separated
    user_rating: {
      aggregate_rating: string;
      rating_text: string;
      votes: string;
    };
    average_cost_for_two: number;
    location: {
      address: string;
      latitude: string;
      longitude: string;
      city: string;
    };
    featured_image: string;
    highlights: string[];  // Includes "Pure Veg"
  };
}

function mapZomatoRestaurant(data: ZomatoRestaurantResponse): Restaurant {
  return {
    id: `zomato-${data.restaurant.id}`,
    externalId: data.restaurant.id,
    provider: 'zomato',
    name: data.restaurant.name,
    cuisineTypes: data.restaurant.cuisines.split(', '),
    rating: parseFloat(data.restaurant.user_rating.aggregate_rating),
    priceRange: estimatePriceRange(data.restaurant.average_cost_for_two),
    imageUrl: data.restaurant.featured_image,
    isVeg: data.restaurant.highlights.includes('Pure Veg'),
    location: {
      address: data.restaurant.location.address,
      latitude: parseFloat(data.restaurant.location.latitude),
      longitude: parseFloat(data.restaurant.location.longitude),
      city: data.restaurant.location.city,
    },
    // ... more fields
  };
}
```

**Configuration:**
```bash
ZOMATO_ENABLED=true
ZOMATO_BASE_URL=https://api.zomato.com
ZOMATO_TIMEOUT=5000
ZOMATO_RETRY_ATTEMPTS=3
ZOMATO_CB_THRESHOLD=5
ZOMATO_CACHE_SEARCH=300000
ZOMATO_CACHE_MENU=1800000
ZOMATO_CACHE_RESTAURANT=3600000
ZOMATO_CACHE_AVAIL=120000
```

**Implementation Location:**
- `services/mcp-adapter/src/providers/zomato/ZomatoAPIProvider.ts`
- `services/mcp-adapter/src/providers/zomato/zomatoClient.ts`
- `services/mcp-adapter/src/providers/zomato/zomatoMapper.ts`
- `services/mcp-adapter/src/providers/zomato/zomatoAuth.ts`

**Known Issues:**
- Menu API may not be available for all restaurants
- Zomato's API documentation is limited
- Order placement not supported in all regions

**Status:** Functional for search; menu retrieval partial

---

### REQ-PROVIDER-004: ONDC Provider
**Priority:** P2 (Medium)
**Status:** ❌ Not Started

**Description:** Integration with ONDC (Open Network for Digital Commerce) for standardized restaurant discovery.

**Why ONDC?**
- Open protocol for interoperability
- Standardized API across multiple platforms
- Supports multiple sellers/restaurants
- Government-backed initiative in India

**Implementation Strategy:**
- **Protocol:** ONDC Buyer App API
- **Authentication:** ONDC network credentials
- **Discovery:** Unified search across ONDC network

**Planned Operations:**
- Search restaurants
- Get catalog
- Place order
- Track order

**Implementation Location:** `services/mcp-adapter/src/providers/ondc/`

**Status:** Future enhancement

---

## Data Normalization

### REQ-PROVIDER-005: Unified Data Model
**Priority:** P0 (Critical)
**Status:** ✅ Implemented

All providers MUST map their responses to a unified data model:

**Restaurant Model:**
```typescript
interface Restaurant {
  id: string;                    // Format: {provider}-{externalId}
  externalId: string;            // Provider's restaurant ID
  provider: ProviderName;        // swiggy | zomato | internal
  name: string;
  description?: string;
  cuisineTypes: string[];
  rating: number;                // 0-5
  priceRange: number;            // 1-4 (₹-₹₹₹₹)
  imageUrl?: string;
  isVeg: boolean;
  deliveryTime: number;          // minutes
  distance?: number;             // km
  location: {
    address: string;
    city: string;
    latitude: number;
    longitude: number;
  };
  metadata?: {
    totalOrders?: number;
    isNew?: boolean;
    offers?: string[];
  };
}
```

**Dish Model:**
```typescript
interface Dish {
  id: string;                    // Format: {provider}-{externalId}
  externalId: string;
  provider: ProviderName;
  restaurantId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isVeg: boolean;
  isAvailable: boolean;
  category: string;
  customizations?: Customization[];
  tags?: string[];
}
```

**Menu Model:**
```typescript
interface Menu {
  restaurantId: string;
  provider: ProviderName;
  categories: MenuCategory[];
  lastUpdated: string;
}

interface MenuCategory {
  name: string;
  dishes: Dish[];
}
```

**Implementation Location:** `services/mcp-adapter/src/types/common.types.ts`

---

### REQ-PROVIDER-006: Price Normalization
**Priority:** P1 (High)
**Status:** ✅ Implemented

Provider price formats MUST be normalized:

**Price Range Mapping:**
- **₹ (1):** < ₹300 for two
- **₹₹ (2):** ₹300-₹600 for two
- **₹₹₹ (3):** ₹600-₹1200 for two
- **₹₹₹₹ (4):** > ₹1200 for two

**Currency Handling:**
- All prices stored in paise (smallest unit)
- Display formatting in rupees
- Support for international currencies (future)

**Example:**
```typescript
function estimatePriceRange(costForTwo: number): number {
  if (costForTwo < 300) return 1;
  if (costForTwo < 600) return 2;
  if (costForTwo < 1200) return 3;
  return 4;
}
```

---

### REQ-PROVIDER-007: Image URL Handling
**Priority:** P1 (High)
**Status:** ✅ Implemented

Provider image URLs MUST be processed:

**Image Processing:**
- Validate image URL format
- Generate CDN URLs for external images
- Fallback to placeholder if image unavailable
- Cache image metadata

**Swiggy Images:**
```typescript
function buildSwiggyImageUrl(imageId: string): string {
  return `https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_660/${imageId}`;
}
```

**Zomato Images:**
```typescript
// Zomato provides full URLs
function buildZomatoImageUrl(url: string): string {
  return url || 'https://cdn.foodbot.com/placeholder-restaurant.jpg';
}
```

---

## Resilience and Caching

### REQ-PROVIDER-008: Provider-Specific Caching
**Priority:** P0 (Critical)
**Status:** ✅ Implemented

Each provider MUST have independent cache configuration:

**Cache Keys:**
```typescript
// Format: {provider}:{operation}:{hash(params)}
const cacheKey = `swiggy:search:${hash({ query: 'biryani', lat: 12.97, lng: 77.59 })}`;
```

**Cache TTL by Provider:**

| Provider | Search | Menu | Restaurant | Availability |
|----------|--------|------|------------|--------------|
| Internal | 0 (live) | 0 | 0 | 0 |
| Swiggy | 5 min | 30 min | 1 hour | 2 min |
| Zomato | 5 min | 30 min | 1 hour | 2 min |

**Cache Warming:**
- Popular searches pre-cached
- Menu data pre-cached for top restaurants
- Cache warming during off-peak hours

**Implementation Location:** `services/mcp-adapter/src/cache/CacheManager.ts`

---

### REQ-PROVIDER-009: Fallback Chain
**Priority:** P0 (Critical)
**Status:** ✅ Implemented

Provider failures MUST trigger fallback chain:

**Fallback Order:**
1. **Primary:** Configured provider (Swiggy/Zomato)
2. **Secondary:** Other external provider
3. **Tertiary:** Internal provider
4. **Final:** Stale cache (if available)

**Fallback Logic:**
```typescript
async function searchWithFallback(query: SearchQuery): Promise<SearchResult> {
  // Try primary providers in parallel
  const primaryResults = await Promise.allSettled([
    swiggyProvider.searchRestaurants(query),
    zomatoProvider.searchRestaurants(query),
  ]);

  // If any succeeded, return aggregated results
  const successful = primaryResults.filter(r => r.status === 'fulfilled');
  if (successful.length > 0) {
    return aggregateResults(successful);
  }

  // Fallback to internal provider
  return internalProvider.searchRestaurants(query);
}
```

**Implementation Location:** `services/mcp-adapter/src/aggregator/ProviderAggregator.ts`

---

## Testing Requirements

### REQ-PROVIDER-010: Provider Integration Tests
**Priority:** P0 (Critical)
**Status:** ⚠️ Partial

**Test Coverage:**

**Internal Provider Tests:**
- ✅ Search by name
- ✅ Search by cuisine
- ✅ Geospatial search
- ✅ Menu retrieval
- ✅ Restaurant details

**Swiggy Provider Tests:**
- ✅ Mock API responses
- ⚠️ OAuth flow (sandbox)
- ✅ Response mapping
- ⚠️ Error handling
- ❌ Order placement

**Zomato Provider Tests:**
- ✅ Mock API responses
- ⚠️ OAuth flow (sandbox)
- ✅ Response mapping
- ⚠️ Error handling
- ❌ Menu retrieval edge cases

**Test Location:** `services/mcp-adapter/tests/providers/`

---

## Provider Status Dashboard

| Provider | Search | Menu | Details | Availability | Orders | Status |
|----------|--------|------|---------|--------------|--------|--------|
| Internal | ✅ | ✅ | ✅ | ✅ | ✅ | Production |
| Swiggy | ✅ | ✅ | ✅ | ⚠️ | ❌ | Beta |
| Zomato | ✅ | ⚠️ | ✅ | ❌ | ❌ | Beta |
| ONDC | ❌ | ❌ | ❌ | ❌ | ❌ | Planned |

---

## References

- [MCP Core Requirements](./core-requirements.md)
- [OAuth Requirements](./oauth-requirements.md)
- [Swiggy API Documentation](#) (to be added)
- [Zomato API Documentation](#) (to be added)
- [ONDC Protocol Specification](https://ondc.org/protocol)

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-02-20 | System | Initial provider integration requirements extracted from archived documentation |
