# TASK-DB-001: Complete Database Schema & Migrations

**Created:** 2026-02-23
**Status:** Pending
**Priority:** P0 (Critical)
**Estimated Effort:** 12 days
**Component:** Gateway API / Data Layer
**Blocks:** All CRUD operations, Order placement, Payment processing
**Related Requirements:** All FR-* requirements needing persistence

---

## Overview

Implement complete PostgreSQL database schema with all migrations, entities, relationships, indexes, constraints, triggers, and seed data for the entire FoodBot platform. This includes all tables for users, restaurants, dishes, orders, payments, carts, addresses, feedback, analytics, promotions, scheduling, diet plans, party plans, and audit trails.

---

## Requirements

### Functional Requirements

1. **User Management Tables**
   - users (id, email, phone, name, password_hash, role, status, preferences_json, created_at, updated_at)
   - user_addresses (id, user_id, label, address_line1, address_line2, city, state, pincode, lat, lng, is_default, created_at)
   - user_sessions (id, user_id, token_hash, device_info, ip_address, expires_at, created_at)
   - user_preferences (id, user_id, preference_key, preference_value, category, updated_at)
   - account_links (id, user_id, provider, provider_user_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, status)

2. **Restaurant Management Tables**
   - restaurants (id, owner_id, name, slug, description, cuisine_types, address, lat, lng, rating, total_ratings, is_active, opening_hours_json, delivery_radius_km, min_order_amount, avg_delivery_time_mins, logo_url, banner_url, created_at, updated_at)
   - restaurant_staff (id, restaurant_id, user_id, role, permissions_json, created_at)
   - restaurant_analytics_daily (id, restaurant_id, date, total_orders, total_revenue, avg_order_value, cancelled_orders, avg_rating, new_customers, returning_customers)

3. **Menu & Dish Tables**
   - menu_categories (id, restaurant_id, name, description, sort_order, is_active)
   - dishes (id, restaurant_id, category_id, name, description, price, discounted_price, image_url, is_veg, is_available, prep_time_mins, calories, allergens_json, tags_json, rating, total_ratings, created_at, updated_at)
   - dish_customizations (id, dish_id, name, type, options_json, is_required, max_selections)
   - dish_availability_schedule (id, dish_id, day_of_week, start_time, end_time)

4. **Cart & Order Tables**
   - carts (id, user_id, restaurant_id, status, created_at, updated_at, expires_at)
   - cart_items (id, cart_id, dish_id, quantity, customizations_json, unit_price, total_price)
   - orders (id, user_id, restaurant_id, address_id, status, order_type, items_json, subtotal, tax, delivery_fee, discount, total, payment_method, payment_status, special_instructions, estimated_delivery_at, actual_delivery_at, created_at, updated_at)
   - order_status_history (id, order_id, status, changed_by, reason, created_at)
   - order_items (id, order_id, dish_id, dish_name, quantity, unit_price, total_price, customizations_json)

5. **Payment Tables**
   - payments (id, order_id, user_id, amount, currency, method, provider, provider_transaction_id, status, metadata_json, created_at, updated_at)
   - payment_refunds (id, payment_id, amount, reason, status, provider_refund_id, created_at)

6. **Feedback & Reviews**
   - reviews (id, user_id, order_id, restaurant_id, dish_id, rating, comment, images_json, is_anonymous, status, created_at, updated_at)
   - review_responses (id, review_id, responder_id, response, created_at)

7. **Scheduling & Planning Tables**
   - scheduled_orders (id, user_id, plan_id, restaurant_id, scheduled_date, scheduled_time, address_id, items_json, status, order_id, created_at)
   - diet_plans (id, user_id, name, start_date, end_date, health_goal, calorie_target, preferences_json, status, created_at, updated_at)
   - diet_plan_meals (id, plan_id, day_of_week, meal_type, restaurant_id, dishes_json, address_id, calories, status)
   - party_plans (id, user_id, event_name, event_date, budget, guest_count, veg_count, non_veg_count, preferences_json, status, created_at, updated_at)
   - party_plan_orders (id, plan_id, restaurant_id, items_json, estimated_cost, status, order_id)

8. **Promotions & Coupons**
   - promotions (id, restaurant_id, code, type, value, min_order_amount, max_discount, start_date, end_date, usage_limit, used_count, is_active)
   - user_promotions (id, user_id, promotion_id, used_at, order_id)

9. **Notifications**
   - notifications (id, user_id, type, title, body, data_json, is_read, created_at)

10. **Audit & Jobs**
    - audit_logs (id, user_id, action, entity_type, entity_id, old_value_json, new_value_json, ip_address, created_at)
    - async_jobs (id, user_id, type, status, input_json, result_json, error_json, progress, started_at, completed_at, created_at, updated_at)
    - job_status_updates (id, job_id, step_name, status, message, metadata_json, created_at)

### Non-Functional Requirements
- All tables must have proper indexes for query patterns
- Foreign key constraints with appropriate ON DELETE behavior
- Created_at/updated_at with auto-update triggers
- Soft delete support where needed (is_deleted + deleted_at)
- Partitioning for orders table by month
- Read replicas configuration support
- Connection pooling (max 100 connections per service)
- Query timeout: 10 seconds
- All PII fields encryption-ready
- UUID v4 for all primary keys
- JSONB for flexible data fields with GIN indexes

### Architecture

```
TypeORM Entity Layer
├── User entities (5 tables)
├── Restaurant entities (3 tables)
├── Menu entities (4 tables)
├── Cart entities (2 tables)
├── Order entities (3 tables)
├── Payment entities (2 tables)
├── Review entities (2 tables)
├── Planning entities (5 tables)
├── Promotion entities (2 tables)
├── Notification entity (1 table)
└── System entities (3 tables)

Migration Strategy:
├── Migration 001: Core users & auth
├── Migration 002: Restaurants & menu
├── Migration 003: Cart & orders
├── Migration 004: Payments
├── Migration 005: Reviews & feedback
├── Migration 006: Scheduling & planning
├── Migration 007: Promotions
├── Migration 008: Notifications & audit
├── Migration 009: Indexes & constraints
└── Migration 010: Seed data
```

### Acceptance Criteria
- [ ] All 32 tables created with proper schemas
- [ ] All foreign key relationships enforced
- [ ] Indexes created for all query patterns (minimum 40 indexes)
- [ ] TypeORM entities match database schema exactly
- [ ] 10 sequential migrations that can be run/rolled back independently
- [ ] Seed data for development (50 restaurants, 500 dishes, 10 users)
- [ ] Seed data for testing (minimal fixtures)
- [ ] Connection pooling configured (min 10, max 100)
- [ ] Query logging enabled in development
- [ ] Migration CLI commands documented
- [ ] All migrations pass on fresh database
- [ ] Rollback tested for each migration
- [ ] Performance: seed completes in < 30 seconds
- [ ] All JSONB fields have GIN indexes
- [ ] Audit triggers for sensitive tables
- [ ] 80%+ test coverage on entity validations

### SDLC Process
1. **Plan**: Entity relationship diagram, migration order, index strategy
2. **Code**: TypeORM entities, migrations, repositories, seed scripts
3. **Test**: Migration up/down, constraint validation, query performance
4. **Fix**: Address test failures
5. **Code Review**: Schema design review, index optimization
6. **Fix**: Address review findings
7. **Code Analysis**: Detect N+1 queries, missing indexes, type issues
8. **Fix**: Optimize queries and types
9. **Security Analysis**: PII encryption, SQL injection prevention, access control
10. **Fix**: Address security findings

### Files to Create/Modify
- `apps/gateway-api/src/entities/*.entity.ts` (32 files)
- `apps/gateway-api/src/migrations/*.ts` (10 files)
- `apps/gateway-api/src/database/seed.ts`
- `apps/gateway-api/src/database/database.module.ts`
- `apps/gateway-api/src/database/database.config.ts`
- `apps/gateway-api/ormconfig.ts`
- `apps/gateway-api/src/entities/__tests__/*.spec.ts`

### Dependencies
- PostgreSQL 15+ running
- TypeORM 0.3+
- @nestjs/typeorm
