# Restaurant Management Requirements - Gateway API

**Component:** `apps/gateway-api`
**Category:** Core Business Logic
**Status:** Implemented
**Priority:** High

---

## Overview

The Gateway API provides comprehensive restaurant management capabilities including CRUD operations, search, menu management, and owner-specific operations.

---

## Functional Requirements

### FR-REST-001: Create Restaurant
**Status:** ✅ Implemented
**Location:** `src/modules/restaurant/restaurant.controller.ts:68-74`

**Description:** Restaurant owners can create new restaurant profiles.

**Implementation Details:**
- Endpoint: `POST /api/v1/restaurants`
- Requires JWT authentication
- Requires role: `restaurant_owner` or `admin`
- Auto-assigns `ownerId` from JWT if not provided
- Publishes `RESTAURANT_CREATED` event to Kafka

**Request Schema:**
```typescript
{
  name: string (required, min 2 chars)
  description?: string
  cuisineTypes: string[] (required)
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country?: string
  }
  phoneNumber: string (required)
  email: string (email format, required)
  latitude: number (required, -90 to 90)
  longitude: number (required, -180 to 180)
  operatingHours?: {
    [day: string]: { open: string, close: string }
  }
  priceRange?: string (default: 'moderate')
  deliveryRadius?: number (default: 10 km)
  minimumOrder?: number (default: 0)
  deliveryFee?: number (default: 0)
  preparationTime?: number (default: 30 minutes)
  images?: string[]
}
```

**Response:**
```typescript
{
  id: string
  name: string
  ownerId: string
  description: string
  cuisineTypes: string[]
  address: object
  phoneNumber: string
  email: string
  rating: number
  reviewCount: number
  priceRange: string
  isActive: boolean
  isApproved: boolean  // false by default, requires admin approval
  operatingHours: object
  latitude: number
  longitude: number
  images: string[]
  deliveryRadius: number
  minimumOrder: number
  deliveryFee: number
  preparationTime: number
  createdAt: Date
  updatedAt: Date
}
```

**Business Rules:**
- New restaurants are `isActive: false` and `isApproved: false`
- Admin approval required before restaurant appears in search
- Owner can only create restaurants for themselves (unless admin)

---

### FR-REST-002: Update Restaurant
**Status:** ✅ Implemented
**Location:** `src/modules/restaurant/restaurant.controller.ts:78-85`

**Description:** Restaurant owners can update their restaurant details.

**Implementation Details:**
- Endpoint: `PUT /api/v1/restaurants/:id`
- Requires JWT authentication
- Requires role: `restaurant_owner` or `admin`
- Owners can only update their own restaurants
- Admins can update any restaurant
- Publishes `RESTAURANT_UPDATED` event to Kafka

**Authorization Logic:**
- Validates `ownerId` matches JWT `userId` (for owners)
- Admins bypass ownership check

**Partial Update:** All fields optional except `id`

---

### FR-REST-003: Delete Restaurant
**Status:** ✅ Implemented
**Location:** `src/modules/restaurant/restaurant.controller.ts:89-93`

**Description:** Admins can delete restaurants from the system.

**Implementation Details:**
- Endpoint: `DELETE /api/v1/restaurants/:id`
- Requires JWT authentication
- Requires role: `admin` only
- Cascade deletes: All associated dishes, orders, feedbacks
- Publishes `RESTAURANT_DELETED` event to Kafka

**Response:**
```typescript
{
  message: 'Restaurant deleted successfully'
}
```

---

### FR-REST-004: Get Restaurant by ID
**Status:** ✅ Implemented
**Location:** `src/modules/restaurant/restaurant.controller.ts:58-64`

**Description:** Users can retrieve detailed restaurant information by ID.

**Implementation Details:**
- Endpoint: `GET /api/v1/restaurants/:id`
- Public access (no authentication required)
- Returns active and approved restaurants only
- Admins can see inactive/unapproved restaurants
- Includes: basic info, ratings, operating hours, delivery details

**Admin Access:**
- Uses `findByIdWithAuth()` to bypass approval check

---

### FR-REST-005: Search Restaurants
**Status:** ✅ Implemented
**Location:** `src/modules/restaurant/restaurant.controller.ts:33-46`

**Description:** Users can search restaurants with filters and geo-spatial queries.

**Implementation Details:**
- Endpoint: `GET /api/v1/restaurants/search`
- Public access
- Supports full-text search, filters, pagination, and geo-search

**Query Parameters:**
```typescript
{
  query?: string           // Full-text search on name, description, cuisineTypes
  latitude?: number        // Geo-search center latitude
  longitude?: number       // Geo-search center longitude
  radius?: number          // Search radius in km (default: 5)
  cuisineTypes?: string[]  // Filter by cuisine (e.g., 'Italian', 'Chinese')
  priceRange?: string[]    // Filter by price range (e.g., ['$', '$$'])
  minRating?: number       // Minimum rating (0-5)
  page?: number            // Page number (default: 1)
  limit?: number           // Results per page (default: 20, max: 100)
}
```

**Response:**
```typescript
{
  restaurants: Restaurant[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

**Search Features:**
- Full-text search across name, description, cuisine
- Geo-spatial search using Haversine formula
- Multi-filter support (AND logic)
- Sorting by relevance, rating, distance, delivery time
- Pagination with configurable page size

**Only Returns:**
- `isActive: true`
- `isApproved: true`
- Within delivery radius (if geo-search enabled)

---

### FR-REST-006: Get Restaurant Menu
**Status:** ✅ Implemented
**Location:** `src/modules/restaurant/restaurant.controller.ts:49-55`

**Description:** Users can retrieve a restaurant's menu with optional filters.

**Implementation Details:**
- Endpoint: `GET /api/v1/restaurants/:id/menu`
- Public access
- Returns all dishes for the restaurant

**Query Parameters:**
```typescript
{
  category?: string        // Filter by category (e.g., 'Appetizer', 'Main Course')
  isVegetarian?: boolean   // Filter vegetarian dishes only
}
```

**Response:**
```typescript
{
  restaurantId: string
  restaurantName: string
  dishes: Dish[]
  categories: string[]
}
```

**Dish Object:**
```typescript
{
  id: string
  restaurantId: string
  name: string
  description: string
  category: string
  price: number
  discountedPrice?: number
  images: string[]
  isVegetarian: boolean
  isVegan: boolean
  isGlutenFree: boolean
  allergens: string[]
  spiceLevel: string
  calories?: number
  preparationTime: number
  isAvailable: boolean
  tags: string[]
  rating: number
  totalReviews: number
  ingredients?: string[]
  portionSize?: string
  dietaryTags?: string[]
  createdAt: Date
  updatedAt: Date
}
```

---

## Database Schema

### Restaurants Table
**Entity:** `src/entities/restaurant.entity.ts`

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT '',
  cuisine_types TEXT[] DEFAULT '{}',
  address JSONB NOT NULL,
  phone_number VARCHAR(20) DEFAULT '',
  email VARCHAR(255) DEFAULT '',
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  price_range VARCHAR(20) DEFAULT 'moderate',
  is_active BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  operating_hours JSONB,
  latitude DECIMAL(10,7) DEFAULT 0,
  longitude DECIMAL(10,7) DEFAULT 0,
  images TEXT[] DEFAULT '{}',
  delivery_radius DECIMAL(5,2) DEFAULT 10,
  minimum_order DECIMAL(8,2) DEFAULT 0,
  delivery_fee DECIMAL(8,2) DEFAULT 0,
  preparation_time INTEGER DEFAULT 30,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX idx_restaurants_location ON restaurants(latitude, longitude);
CREATE INDEX idx_restaurants_active_approved ON restaurants(is_active, is_approved);
```

### Relationships:
- **Owner:** Many-to-One with `users` (CASCADE DELETE)
- **Dishes:** One-to-Many with `dishes` (CASCADE DELETE)
- **Orders:** One-to-Many with `orders` (CASCADE DELETE)
- **Feedbacks:** One-to-Many with `feedbacks` (CASCADE DELETE)

---

## API Endpoints Summary

| Endpoint | Method | Auth | Role | Description |
|----------|--------|------|------|-------------|
| `POST /restaurants` | POST | JWT | Owner, Admin | Create restaurant |
| `GET /restaurants/search` | GET | Public | - | Search restaurants |
| `GET /restaurants/:id` | GET | Public | - | Get restaurant by ID |
| `GET /restaurants/:id/menu` | GET | Public | - | Get restaurant menu |
| `PUT /restaurants/:id` | PUT | JWT | Owner, Admin | Update restaurant |
| `DELETE /restaurants/:id` | DELETE | JWT | Admin | Delete restaurant |

---

## Event-Driven Architecture

### Kafka Events Published

**Topic:** `restaurant-events`

#### RESTAURANT_CREATED
```typescript
{
  eventType: 'RESTAURANT_CREATED'
  timestamp: Date
  data: {
    restaurantId: string
    ownerId: string
    name: string
    cuisineTypes: string[]
    latitude: number
    longitude: number
    // ... full restaurant object
  }
}
```

**Consumers:**
- MCP Orchestrator: Indexes restaurant in Elasticsearch
- Notification Service: Sends approval request to admin

#### RESTAURANT_UPDATED
```typescript
{
  eventType: 'RESTAURANT_UPDATED'
  timestamp: Date
  data: {
    restaurantId: string
    changes: object  // Fields that changed
    // ... updated restaurant object
  }
}
```

**Consumers:**
- MCP Orchestrator: Updates Elasticsearch index
- Search Orchestrator: Invalidates cache

#### RESTAURANT_DELETED
```typescript
{
  eventType: 'RESTAURANT_DELETED'
  timestamp: Date
  data: {
    restaurantId: string
    ownerId: string
  }
}
```

**Consumers:**
- MCP Orchestrator: Removes from Elasticsearch
- Search Orchestrator: Invalidates cache

**Implementation:** `src/events/producers/restaurant-event.producer.ts`

---

## Business Logic

### Restaurant Approval Workflow
1. Owner creates restaurant → `isApproved: false`, `isActive: false`
2. Admin reviews restaurant via Admin Panel
3. Admin approves → `isApproved: true`
4. Owner activates restaurant → `isActive: true`
5. Restaurant appears in search results

**Admin Endpoint:** `PUT /api/v1/admin/restaurants/:id/approve`

---

### Geo-Spatial Search Algorithm

**Implementation:** `src/modules/restaurant/restaurant.service.ts`

```typescript
// Haversine formula to calculate distance between two lat/lon points
function calculateDistance(lat1, lon1, lat2, lon2): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Filter restaurants within delivery radius
restaurants = restaurants.filter(r =>
  calculateDistance(lat, lon, r.latitude, r.longitude) <= radius
);
```

---

## Validation Rules

### Create/Update Restaurant

**Name:**
- Required
- Min 2 characters
- Max 255 characters

**Cuisine Types:**
- Required
- Array of strings
- Example: `['Italian', 'Pizza', 'Pasta']`

**Address:**
- Required
- Must include: `street`, `city`, `state`, `zipCode`

**Location:**
- Latitude: -90 to 90
- Longitude: -180 to 180
- Required for geo-search

**Price Range:**
- Values: `'budget'`, `'moderate'`, `'premium'`, `'luxury'`
- Default: `'moderate'`

**Operating Hours:**
- JSON object with days as keys
- Format: `{ monday: { open: '09:00', close: '21:00' } }`

**Delivery Settings:**
- `deliveryRadius`: 0-50 km
- `minimumOrder`: >= 0
- `deliveryFee`: >= 0
- `preparationTime`: 10-120 minutes

---

## Integration Points

**External Services:**
- **Google Places API:** Validate address, fetch lat/lon (optional)
- **MCP Orchestrator:** Indexing for full-text search
- **Search Orchestrator:** Aggregated multi-source search
- **Kafka:** Event-driven updates to dependent services

**Internal Dependencies:**
- Dish Module: Menu management
- Order Module: Order placement
- Feedback Module: Reviews and ratings
- User Module: Owner authentication

---

## Test Coverage

**Test Files:**
- E2E Tests: `src/modules/restaurant/__tests__/restaurant.controller.e2e.spec.ts`
- Factory: `src/test/factories/restaurant.factory.ts`

**Test Scenarios:**
- ✅ Create restaurant with valid data
- ✅ Create restaurant without authentication (401)
- ✅ Create restaurant as customer (403)
- ✅ Update own restaurant as owner
- ✅ Update other's restaurant as owner (403)
- ✅ Update any restaurant as admin
- ✅ Delete restaurant as admin
- ✅ Delete restaurant as owner (403)
- ✅ Search restaurants with full-text query
- ✅ Search restaurants with geo-filter
- ✅ Search restaurants with cuisine filter
- ✅ Search restaurants with rating filter
- ✅ Get restaurant by ID (public)
- ✅ Get restaurant menu
- ✅ Filter menu by category
- ✅ Filter menu by dietary preference

---

## Performance Considerations

**Caching Strategy:**
- Restaurant details: Redis cache, 15-minute TTL
- Search results: Redis cache, 5-minute TTL
- Menu: Redis cache, 10-minute TTL

**Database Optimization:**
- Indexes on `owner_id`, `latitude`, `longitude`, `is_active`, `is_approved`
- Composite index on `(is_active, is_approved)` for search queries

**Pagination:**
- Default: 20 results per page
- Max: 100 results per page
- Offset-based pagination

---

## Security Considerations

**Authorization:**
- Only owners can modify their own restaurants
- Admins can modify/delete any restaurant
- Public can only view active and approved restaurants

**Input Validation:**
- All DTOs validated with `class-validator`
- Address validated against known formats
- Lat/lon coordinates validated against valid ranges

**Rate Limiting:**
- Search endpoint: 100 requests/min per IP
- Create endpoint: 10 requests/min per user
- Update endpoint: 20 requests/min per user

---

## Future Enhancements

- [ ] Implement restaurant photos with image upload
- [ ] Add multi-language support for restaurant details
- [ ] Integrate with payment gateway for commission tracking
- [ ] Add restaurant analytics dashboard (orders, revenue, ratings)
- [ ] Implement restaurant claims/ownership transfer
- [ ] Add restaurant badges (verified, top-rated, etc.)
- [ ] Implement dynamic delivery fee based on distance
- [ ] Add restaurant hours validation (auto-close during off-hours)

---

**Last Updated:** 2026-02-20
**Documented By:** Reverse Engineering Process
**Related Documents:**
- `001_authentication_authorization.md`
- `003_order_management.md`
- `004_dish_management.md`
- Database Schema: `.claude/project-management/architecture/data/database-schema.md`
