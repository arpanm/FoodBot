# FIX REPORT: PostgreSQL Database Setup with TypeORM

**Date**: 2026-02-18
**Scope**: Gateway API - Persistent Database Integration
**Status**: COMPLETED

---

## Summary

Replaced in-memory storage foundation with PostgreSQL database integration using TypeORM ORM for the FoodBot gateway-api. This sets the stage for migrating individual services from in-memory arrays/maps to database-backed repositories.

---

## Dependencies Installed

| Package | Version | Purpose |
|---------|---------|---------|
| `@nestjs/typeorm` | ^11.0.0 | NestJS integration module for TypeORM |
| `typeorm` | ^0.3.28 | TypeORM ORM framework |
| `pg` | ^8.18.0 | PostgreSQL driver for Node.js |

All dependencies added to workspace root `package.json`.

---

## Entities Created

### 11 TypeORM Entity Files

| # | Entity | File | Table | Description |
|---|--------|------|-------|-------------|
| 1 | `User` | `entities/user.entity.ts` | `users` | User accounts with roles (customer, restaurant_owner, admin) |
| 2 | `Address` | `entities/address.entity.ts` | `addresses` | User delivery addresses |
| 3 | `Restaurant` | `entities/restaurant.entity.ts` | `restaurants` | Restaurant profiles with operating details |
| 4 | `Dish` | `entities/dish.entity.ts` | `dishes` | Menu items with dietary info and pricing |
| 5 | `Order` | `entities/order.entity.ts` | `orders` | Customer orders with status tracking |
| 6 | `OrderItem` | `entities/order-item.entity.ts` | `order_items` | Order line items |
| 7 | `Cart` | `entities/cart.entity.ts` | `carts` | Shopping carts (one per user) |
| 8 | `CartItem` | `entities/cart-item.entity.ts` | `cart_items` | Cart line items |
| 9 | `Payment` | `entities/payment.entity.ts` | `payments` | Payment records with transaction details |
| 10 | `Feedback` | `entities/feedback.entity.ts` | `feedbacks` | Restaurant/order reviews |
| 11 | `Workflow` | `entities/workflow.entity.ts` | `workflows` | Job/workflow tracking for chat AI |

### Entity Relationships

```
User (1) ----< (N) Address
User (1) ----< (N) Restaurant
User (1) ----< (N) Order
User (1) ----< (N) Cart
User (1) ----< (N) Payment
User (1) ----< (N) Feedback

Restaurant (1) ----< (N) Dish
Restaurant (1) ----< (N) Order
Restaurant (1) ----< (N) Feedback

Order (1) ----< (N) OrderItem
Order (1) ---- (1) Payment
Order (1) ----< (N) Feedback

Cart (1) ----< (N) CartItem
```

### Key Design Decisions

- **UUID primary keys** on all entities for distributed compatibility
- **Enum types** for status fields (OrderStatus, PaymentStatus, UserRole, WorkflowStatus)
- **JSONB columns** for flexible/schemaless data (addresses, operating hours, tracking updates, preferences)
- **simple-array columns** for string arrays (cuisine types, allergens, tags, images)
- **Snake_case column naming** with camelCase entity properties
- **Cascade deletes** on parent-child relationships
- **Eager loading** on Order->OrderItem and Cart->CartItem for common access patterns
- **Indexed foreign keys** for query performance
- **timestamptz** for all date columns (timezone-aware)

---

## Configuration Details

### Database Config
- **File**: `apps/gateway-api/src/config/database.config.ts`
- **Environment-driven**: All connection parameters from env vars with sensible defaults
- **Connection pooling**: Configurable pool size, connection timeout, idle timeout
- **SSL**: Enabled in production, disabled in development
- **Auto-sync**: Enabled in development only (schema auto-creation)
- **Logging**: SQL logging enabled in development mode

### App Module Integration
- **File**: `apps/gateway-api/src/app.module.ts`
- Added `TypeOrmModule.forRoot(getDatabaseConfig())` to imports
- Added `HealthModule` for database connectivity checks

---

## Docker Setup

### Application Database Service
Added `foodbot-db` service to `docker-compose.yml`:

- **Image**: `postgres:16-alpine`
- **Port**: `5433:5432` (mapped to 5433 to avoid conflict with Temporal's PostgreSQL on 5432)
- **Database**: `foodbot`
- **Credentials**: `postgres/postgres`
- **Volume**: `foodbot-db-data` for persistence
- **Health check**: `pg_isready` probe

### Quick Start

```bash
# Start only the FoodBot application database
docker-compose up -d foodbot-db

# Start all infrastructure
docker-compose up -d

# Development mode (with SQL logging)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d foodbot-db

# Verify database is running
docker-compose ps foodbot-db

# Connect to database
psql -h localhost -p 5433 -U postgres -d foodbot
```

---

## Health Check Endpoints

### `GET /api/v1/health`
Returns overall health status including database connectivity:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-18T10:00:00.000Z",
  "database": {
    "connected": true,
    "type": "postgres",
    "database": "foodbot",
    "responseTimeMs": 3
  }
}
```

### `GET /api/v1/health/db`
Returns detailed database info including PostgreSQL version and table list:
```json
{
  "connected": true,
  "version": "PostgreSQL 16.x ...",
  "tables": ["addresses", "cart_items", "carts", "dishes", "feedbacks", "order_items", "orders", "payments", "restaurants", "users", "workflows"]
}
```

---

## Environment Variables

Added to `.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5433` | PostgreSQL port (5433 to avoid Temporal conflict) |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `foodbot` | Database name |
| `DB_POOL_SIZE` | `10` | Connection pool size |
| `DB_CONNECTION_TIMEOUT` | `5000` | Connection timeout (ms) |
| `DB_IDLE_TIMEOUT` | `30000` | Idle connection timeout (ms) |

---

## Seed Script

**File**: `apps/gateway-api/src/database/seeds/initial-seed.ts`

Seeds the database with test data:
- 3 users (customer, restaurant_owner, admin)
- 1 restaurant with full profile
- 4 dishes with dietary information

```bash
# Run seed (after database is running)
npx ts-node apps/gateway-api/src/database/seeds/initial-seed.ts
```

---

## Connection Test Results

The database infrastructure is configured and ready. To verify:

```bash
# 1. Start the database
docker-compose up -d foodbot-db

# 2. Wait for health check
docker-compose exec foodbot-db pg_isready -U postgres -d foodbot

# 3. Start the application
cd apps/gateway-api && npx ts-node src/main.ts

# 4. Check health endpoint
curl http://localhost:3000/api/v1/health
```

---

## Migration Strategy

### Phase 1: Foundation (COMPLETED)
- [x] Install TypeORM + PostgreSQL driver
- [x] Create database configuration
- [x] Define all entity schemas with relationships
- [x] Add TypeORM to app module
- [x] Docker infrastructure for PostgreSQL
- [x] Health check endpoints
- [x] Seed script for test data

### Phase 2: Repository Layer (NEXT)
- [ ] Create TypeORM repositories for each entity
- [ ] Create repository interfaces/abstractions
- [ ] Inject repositories into feature modules using `TypeOrmModule.forFeature()`

### Phase 3: Service Migration (INCREMENTAL)
Migrate each service from in-memory to database-backed, one at a time:
- [ ] `AuthService` - Replace `private users: StoredUser[]` with `UserRepository`
- [ ] `RestaurantService` - Replace `private restaurants: StoredRestaurant[]` with `RestaurantRepository`
- [ ] `DishService` - Replace `private dishes: StoredDish[]` with `DishRepository`
- [ ] `OrderService` - Replace `private orders: StoredOrder[]` with `OrderRepository`
- [ ] `CartService` - Replace `private carts = new Map<>()` with `CartRepository`
- [ ] `PaymentService` - Replace `private payments: StoredPayment[]` with `PaymentRepository`
- [ ] `FeedbackService` - Replace `private feedbacks: StoredFeedback[]` with `FeedbackRepository`
- [ ] `ChatService` - Replace `private jobs = new Map<>()` with `WorkflowRepository`

### Phase 4: Advanced Features
- [ ] Add TypeORM migrations (replace synchronize:true)
- [ ] Add database indexes for search queries
- [ ] Add full-text search for restaurant/dish search
- [ ] Add PostGIS extension for geospatial queries
- [ ] Add database transactions for order creation flow
- [ ] Add query optimization and caching

---

## Files Created/Modified

### New Files (16)
| File | Description |
|------|-------------|
| `apps/gateway-api/src/config/database.config.ts` | Database configuration |
| `apps/gateway-api/src/entities/user.entity.ts` | User entity |
| `apps/gateway-api/src/entities/address.entity.ts` | Address entity |
| `apps/gateway-api/src/entities/restaurant.entity.ts` | Restaurant entity |
| `apps/gateway-api/src/entities/dish.entity.ts` | Dish entity |
| `apps/gateway-api/src/entities/order.entity.ts` | Order entity |
| `apps/gateway-api/src/entities/order-item.entity.ts` | OrderItem entity |
| `apps/gateway-api/src/entities/cart.entity.ts` | Cart entity |
| `apps/gateway-api/src/entities/cart-item.entity.ts` | CartItem entity |
| `apps/gateway-api/src/entities/payment.entity.ts` | Payment entity |
| `apps/gateway-api/src/entities/feedback.entity.ts` | Feedback entity |
| `apps/gateway-api/src/entities/workflow.entity.ts` | Workflow entity |
| `apps/gateway-api/src/entities/index.ts` | Entity barrel export |
| `apps/gateway-api/src/modules/health/health.module.ts` | Health module |
| `apps/gateway-api/src/modules/health/health.controller.ts` | Health controller |
| `apps/gateway-api/src/database/seeds/initial-seed.ts` | Seed script |

### Modified Files (4)
| File | Change |
|------|--------|
| `package.json` | Added @nestjs/typeorm, typeorm, pg dependencies |
| `apps/gateway-api/src/app.module.ts` | Added TypeOrmModule.forRoot() and HealthModule |
| `docker-compose.yml` | Added foodbot-db service and volume |
| `docker-compose.dev.yml` | Added foodbot-db dev override with SQL logging |
| `.env.example` | Added DB_* environment variables |

---

## Next Steps

1. **Start the database**: `docker-compose up -d foodbot-db`
2. **Run seed script**: `npx ts-node apps/gateway-api/src/database/seeds/initial-seed.ts`
3. **Begin service migration**: Start with `AuthService` as it is the most critical and most referenced
4. **Add `TypeOrmModule.forFeature([Entity])` to each feature module** as services are migrated
5. **Update tests** to use database fixtures instead of in-memory seeded data
6. **Add TypeORM migrations** once schema is stable (replace `synchronize: true`)
