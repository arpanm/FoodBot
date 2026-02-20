# Database Schema

**Version:** 1.0.0
**Last Updated:** 2026-02-20
**Database:** PostgreSQL 15+

## Overview

FoodBot uses a polyglot persistence strategy:
- **PostgreSQL:** Primary relational data
- **Redis:** Caching and session storage
- **Neo4j:** User preference graph
- **Qdrant:** Vector database for semantic caching
- **Elasticsearch:** Full-text search

## PostgreSQL Schema

### Core Tables

#### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  name VARCHAR(255) NOT NULL,
  profile_image TEXT,
  role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'restaurant_owner', 'admin')),
  password_hash VARCHAR(255) NOT NULL,
  is_email_verified BOOLEAN DEFAULT false,
  is_phone_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
```

#### restaurants

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id VARCHAR(255),
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('internal', 'swiggy', 'zomato')),
  owner_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo TEXT,
  images TEXT[],
  cuisine_types TEXT[] NOT NULL,
  address JSONB NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  price_range INTEGER CHECK (price_range BETWEEN 1 AND 4),
  operating_hours JSONB NOT NULL,
  delivery_time INTEGER, -- minutes
  minimum_order DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed', 'pending')),
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider, external_id)
);

CREATE INDEX idx_restaurants_location ON restaurants USING GIST(location);
CREATE INDEX idx_restaurants_provider_external_id ON restaurants(provider, external_id);
CREATE INDEX idx_restaurants_owner_id ON restaurants(owner_id);
CREATE INDEX idx_restaurants_status ON restaurants(status);
CREATE INDEX idx_restaurants_rating ON restaurants(rating DESC);
CREATE INDEX idx_restaurants_cuisine_types ON restaurants USING GIN(cuisine_types);
```

#### dishes

```sql
CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  external_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  subcategory VARCHAR(100),
  price DECIMAL(10,2) NOT NULL,
  portion_size VARCHAR(50),
  images TEXT[],
  ingredients TEXT[],
  nutritional_info JSONB,
  dietary_tags TEXT[], -- ['veg', 'vegan', 'gluten-free', 'halal']
  customizations JSONB,
  preparation_time INTEGER, -- minutes
  is_available BOOLEAN DEFAULT true,
  stock_level INTEGER,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dishes_restaurant_id ON dishes(restaurant_id);
CREATE INDEX idx_dishes_name ON dishes(name);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_dishes_is_available ON dishes(is_available);
CREATE INDEX idx_dishes_dietary_tags ON dishes USING GIN(dietary_tags);
CREATE INDEX idx_dishes_price ON dishes(price);
```

#### orders

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  provider VARCHAR(50) NOT NULL,
  external_order_id VARCHAR(255),
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  delivery_address JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'placed' CHECK (
    status IN ('placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled')
  ),
  payment_method VARCHAR(50) NOT NULL,
  payment_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')
  ),
  payment_transaction_id VARCHAR(255),
  special_instructions TEXT,
  estimated_delivery_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  tracking_updates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### addresses

```sql
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(50), -- 'Home', 'Work', 'Other'
  address_line1 VARCHAR(255) NOT NULL,
  address_line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(100) NOT NULL DEFAULT 'India',
  location GEOGRAPHY(POINT, 4326),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);
```

#### oauth_tokens

```sql
CREATE TABLE oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('swiggy', 'zomato', 'google', 'facebook')),
  encrypted_access_token TEXT NOT NULL,
  encrypted_refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  scope TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, provider)
);

CREATE INDEX idx_oauth_tokens_user_provider ON oauth_tokens(user_id, provider);
CREATE INDEX idx_oauth_tokens_expires_at ON oauth_tokens(expires_at);
```

#### feedback

```sql
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  user_id UUID REFERENCES users(id),
  restaurant_id UUID REFERENCES restaurants(id),
  order_rating INTEGER CHECK (order_rating BETWEEN 1 AND 5),
  restaurant_rating INTEGER CHECK (restaurant_rating BETWEEN 1 AND 5),
  dish_ratings JSONB, -- { dish_id: rating }
  comment TEXT,
  images TEXT[],
  issues TEXT[], -- ['missing_items', 'quality', 'delivery_time', 'other']
  is_resolved BOOLEAN DEFAULT false,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_order_id ON feedback(order_id);
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_restaurant_id ON feedback(restaurant_id);
```

#### workflows

```sql
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_id VARCHAR(255) NOT NULL,
  intent VARCHAR(100) NOT NULL,
  prompt TEXT NOT NULL,
  workflow_json JSONB NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'QUEUED' CHECK (
    status IN ('QUEUED', 'PROCESSING', 'INTENT_DETECTED', 'WORKFLOW_GENERATED',
               'WORKFLOW_EXECUTING', 'COMPLETED', 'FAILED')
  ),
  steps JSONB DEFAULT '[]'::jsonb,
  result JSONB,
  error JSONB,
  metadata JSONB,
  execution_time_ms INTEGER,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id ON workflows(user_id);
CREATE INDEX idx_workflows_session_id ON workflows(session_id);
CREATE INDEX idx_workflows_status ON workflows(status);
CREATE INDEX idx_workflows_created_at ON workflows(created_at DESC);
```

## Redis Schema

### Key Patterns

```
# Sessions
session:{session_id} → Session data (TTL: 24h)

# Job Status
job:{job_id}:status → Workflow status (TTL: 24h)

# Cache
cache:restaurants:search:{hash} → Search results (TTL: 5m)
cache:restaurants:{id} → Restaurant details (TTL: 1h)
cache:menu:{restaurant_id} → Menu data (TTL: 30m)
cache:availability:{restaurant_id} → Availability (TTL: 2m)

# Rate Limiting
ratelimit:{user_id}:{endpoint} → Request count (TTL: 1m)

# Cart
cart:{user_id} → Cart items (TTL: 7d)
```

## Neo4j Schema (User Preference Graph)

```cypher
// User node
CREATE (u:User {
  id: 'uuid',
  email: 'user@example.com'
})

// Time nodes
CREATE (day:DayOfWeek {name: 'Monday'})
CREATE (hour:HourOfDay {hour: 18})

// Category nodes
CREATE (cat:Category {name: 'Italian'})
CREATE (subcat:Subcategory {name: 'Pizza'})

// Restaurant and Dish nodes
CREATE (rest:Restaurant {id: 'uuid', name: 'Pizza Place'})
CREATE (dish:Dish {id: 'uuid', name: 'Margherita'})

// Relationships with weights
CREATE (u)-[:PREFERS_DAY {weight: 0.8}]->(day)
CREATE (day)-[:AT_HOUR {weight: 0.9}]->(hour)
CREATE (hour)-[:PREFERS_CATEGORY {weight: 0.85}]->(cat)
CREATE (cat)-[:PREFERS_SUBCATEGORY {weight: 0.75}]->(subcat)
CREATE (subcat)-[:ORDERS_FROM {weight: 0.9}]->(rest)
CREATE (rest)-[:ORDERS_DISH {weight: 0.95}]->(dish)
```

## Qdrant Schema (Vector Database)

```typescript
// Collection: prompts
{
  collection_name: "prompts",
  vectors: {
    size: 1536, // OpenAI embedding dimension
    distance: "Cosine"
  },
  payload: {
    prompt: "string",
    intent: "string",
    workflow_json: "object",
    timestamp: "integer",
    user_id: "string"
  }
}
```

## Elasticsearch Schema

```json
// Index: restaurants
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "name": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text" },
      "cuisine_types": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "rating": { "type": "float" },
      "price_range": { "type": "integer" },
      "is_active": { "type": "boolean" }
    }
  }
}

// Index: dishes
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "restaurant_id": { "type": "keyword" },
      "name": { "type": "text", "analyzer": "standard" },
      "description": { "type": "text" },
      "category": { "type": "keyword" },
      "price": { "type": "float" },
      "dietary_tags": { "type": "keyword" },
      "is_available": { "type": "boolean" }
    }
  }
}
```

## Migrations

**Location:** `/infra/migrations/`

**Applied Migrations:**
- `001_create_users_table.sql`
- `002_create_restaurants_table.sql`
- `003_create_dishes_table.sql`
- `004_create_orders_table.sql`
- `005_create_addresses_table.sql`
- `006_create_oauth_tokens_table.sql`
- `007_create_feedback_table.sql`
- `008_create_workflows_table.sql`

**Status:** All migrations applied ✅
