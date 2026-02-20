# Gateway API Component

**Location:** `apps/gateway-api/`
**Technology:** NestJS 11 + TypeScript 5.7
**Port:** 3000
**Status:** ⚠️ Scaffolded (15% complete)

---

## Table of Contents

- [Overview](#overview)
- [Component Architecture](#component-architecture)
- [Module Descriptions](#module-descriptions)
- [Authentication & Authorization](#authentication--authorization)
- [API Endpoints](#api-endpoints)
- [Dependencies](#dependencies)
- [Implementation Status](#implementation-status)
- [Next Steps](#next-steps)

---

## Overview

The Gateway API is the **primary backend service** and **single entry point** for all client requests in the FoodBot platform. It implements the API Gateway Pattern, providing centralized:

- Authentication and authorization
- Rate limiting and throttling
- Request validation
- Response transformation
- Business logic coordination
- Integration with Temporal workflows and Kafka events

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (NestJS)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Middleware Layer                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Auth       │  │  Rate       │  │  Request        │ │  │
│  │  │  Middleware │  │  Limiter    │  │  Validator      │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  CORS       │  │  Logging    │  │  Error Handler  │ │  │
│  │  │  Middleware │  │  Middleware │  │  Middleware     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Controller Layer                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Chat       │  │  Restaurant │  │  Order          │ │  │
│  │  │  Controller │  │  Controller │  │  Controller     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Cart       │  │  Payment    │  │  Menu           │ │  │
│  │  │  Controller │  │  Controller │  │  Controller     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Service Layer                           │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  LLM        │  │  Workflow   │  │  Restaurant     │ │  │
│  │  │  Service    │  │  Service    │  │  Service        │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  Order      │  │  Payment    │  │  User Service   │ │  │
│  │  │  Service    │  │  Service    │  │                 │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Repository Layer                        │  │
│  │                                                          │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │  │
│  │  │  User       │  │  Restaurant │  │  Order          │ │  │
│  │  │  Repository │  │  Repository │  │  Repository     │ │  │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                ┌────────────┴───────────┐
                │                        │
                ▼                        ▼
          PostgreSQL               External Services
          Redis                    (LLM, Temporal, MCP)
          Neo4j
```

---

## Module Descriptions

### AppModule (Root)
**Responsibility:** Application bootstrap and global configuration

**Imports:**
- ConfigModule (global)
- All feature modules

**Configuration:**
- Environment variables
- Database connections
- Middleware setup

---

### AuthModule
**Responsibility:** Authentication, authorization, and session management

**Components:**
- `AuthController` - Login, register, logout, refresh token, password reset
- `AuthService` - Business logic for authentication
- `JwtStrategy` - Passport JWT strategy
- `JwtAuthGuard` - Protect routes requiring authentication
- `RolesGuard` - Role-based access control (customer, restaurant_owner, admin)

**Features:**
- ✅ JWT access tokens (15 min expiry)
- ✅ Refresh tokens (7 days expiry)
- ✅ Token blacklisting (Redis)
- ✅ Password hashing (bcrypt, 10 rounds)
- ✅ Rate limiting (5 attempts/15 min for login)
- ✅ Email verification
- ✅ Password reset flow

**API Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - Logout (blacklist token)
- `POST /auth/refresh` - Refresh access token
- `POST /auth/forgot-password` - Send reset email
- `POST /auth/reset-password` - Reset password with token
- `POST /auth/verify-email` - Verify email with token
- `GET /auth/me` - Get current user

**Status:** ❌ Not implemented (0%)

---

### ChatModule
**Responsibility:** Conversational interface and job-based async processing

**Components:**
- `ChatController` - Handle chat messages and job polling
- `ChatService` - Message processing, job creation, LLM integration

**Features:**
- Asynchronous job creation
- Job status polling
- LLM intent detection
- Workflow generation
- Chat history storage

**API Endpoints:**
- `POST /chat` - Send message, returns jobId
- `GET /chat/jobs/:jobId/status` - Poll job status
- `GET /chat/conversation/:conversationId` - Get conversation history

**Status:** ❌ Not implemented (0%)

---

### RestaurantModule
**Responsibility:** Restaurant CRUD and search

**Components:**
- `RestaurantController`
- `RestaurantService`
- `RestaurantRepository`

**Features:**
- CRUD operations for restaurants
- Search proxy to MCP Orchestrator
- Restaurant approval workflow (admin)
- Menu retrieval

**API Endpoints:**
- `GET /restaurants` - List all restaurants
- `GET /restaurants/:id` - Get restaurant details
- `GET /restaurants/:id/menu` - Get restaurant menu
- `POST /restaurants` - Create restaurant (restaurant_owner)
- `PUT /restaurants/:id` - Update restaurant (restaurant_owner)
- `DELETE /restaurants/:id` - Delete restaurant (admin)
- `GET /restaurants/search` - Search restaurants (proxies to MCP)

**Status:** ❌ Not implemented (0%)

---

### DishModule
**Responsibility:** Dish/menu item management

**Components:**
- `DishController`
- `DishService`
- `DishRepository`

**Features:**
- CRUD operations for dishes
- Availability toggling
- Category management
- Dietary tag support

**API Endpoints:**
- `GET /dishes` - List dishes (by restaurant)
- `GET /dishes/:id` - Get dish details
- `POST /dishes` - Create dish (restaurant_owner)
- `PUT /dishes/:id` - Update dish (restaurant_owner)
- `DELETE /dishes/:id` - Delete dish (restaurant_owner)
- `PATCH /dishes/:id/availability` - Toggle availability

**Status:** ❌ Not implemented (0%)

---

### CartModule
**Responsibility:** Shopping cart management

**Components:**
- `CartController`
- `CartService`

**Features:**
- Add/remove/update cart items
- Calculate total (with tax, delivery fee)
- Cart persistence (Redis)
- Cart expiration (30 min)

**API Endpoints:**
- `GET /cart` - Get user's cart
- `POST /cart/items` - Add item to cart
- `PUT /cart/items/:itemId` - Update item quantity
- `DELETE /cart/items/:itemId` - Remove item
- `DELETE /cart` - Clear cart
- `GET /cart/summary` - Get cart summary (total, tax, delivery)

**Status:** ❌ Not implemented (0%)

---

### OrderModule
**Responsibility:** Order placement, tracking, and management

**Components:**
- `OrderController`
- `OrderService`
- `OrderRepository`

**Features:**
- Order placement (triggers Temporal workflow)
- Order status tracking
- Order cancellation (with refund)
- Order history

**API Endpoints:**
- `POST /orders` - Place order (starts placeOrderWorkflow)
- `GET /orders` - List user's orders
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id/status` - Update order status (restaurant_owner)
- `POST /orders/:id/cancel` - Cancel order (customer)
- `GET /orders/:id/track` - Track order status

**Status:** ❌ Not implemented (0%)

---

### PaymentModule
**Responsibility:** Payment processing and webhook handling

**Components:**
- `PaymentController`
- `PaymentService`

**Features:**
- Payment initiation
- 3D Secure support
- Webhook handling (Stripe/Razorpay)
- Payment status tracking

**API Endpoints:**
- `POST /payments/initiate` - Initiate payment (starts processPaymentWorkflow)
- `GET /payments/:id` - Get payment details
- `POST /payments/webhook` - Webhook handler (Stripe/Razorpay)

**Status:** ❌ Not implemented (0%)

---

### FeedbackModule
**Responsibility:** Ratings and reviews

**Components:**
- `FeedbackController`
- `FeedbackService`
- `FeedbackRepository`

**Features:**
- Submit feedback/rating
- List feedback by restaurant
- Moderation (admin)

**API Endpoints:**
- `POST /feedback` - Submit feedback
- `GET /feedback/restaurant/:restaurantId` - Get restaurant feedback
- `GET /feedback/order/:orderId` - Get order feedback
- `DELETE /feedback/:id` - Delete feedback (admin)

**Status:** ❌ Not implemented (0%)

---

### UserModule
**Responsibility:** User profile and address management

**Components:**
- `UserController`
- `UserService`
- `UserRepository`

**Features:**
- Profile management
- Address CRUD
- Account linking (Google, Facebook)

**API Endpoints:**
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update profile
- `GET /users/addresses` - List addresses
- `POST /users/addresses` - Add address
- `PUT /users/addresses/:id` - Update address
- `DELETE /users/addresses/:id` - Delete address
- `POST /users/link-account` - Link OAuth account

**Status:** ❌ Not implemented (0%)

---

### AdminModule
**Responsibility:** Admin dashboard and management

**Components:**
- `AdminController`
- `AdminService`

**Features:**
- User management
- Restaurant approval
- Dashboard statistics
- System monitoring

**API Endpoints:**
- `GET /admin/users` - List all users
- `PATCH /admin/users/:id/role` - Change user role
- `GET /admin/restaurants/pending` - List pending restaurant approvals
- `PATCH /admin/restaurants/:id/approve` - Approve restaurant
- `GET /admin/dashboard/stats` - Get dashboard statistics

**Status:** ❌ Not implemented (0%)

---

### HealthModule
**Responsibility:** Health checks for orchestration and monitoring

**Components:**
- `HealthController`

**API Endpoints:**
- `GET /health` - Liveness probe
- `GET /health/readiness` - Readiness probe

**Status:** ❌ Not implemented (0%)

---

## Authentication & Authorization

### JWT Structure

**Access Token:**
```typescript
{
  sub: string;        // User ID
  email: string;
  role: 'customer' | 'restaurant_owner' | 'admin';
  iat: number;        // Issued at
  exp: number;        // Expiry (15 min)
}
```

**Refresh Token:**
```typescript
{
  sub: string;        // User ID
  type: 'refresh';
  iat: number;
  exp: number;        // Expiry (7 days)
}
```

### Guards

**JwtAuthGuard:**
- Applied to all routes by default
- Validates JWT signature
- Checks token blacklist (Redis)
- Attaches user object to request

**RolesGuard:**
- Applied using `@Roles()` decorator
- Checks user role against required roles
- Denies access if role doesn't match

**Public Routes:**
- Marked with `@Public()` decorator
- Bypasses authentication

---

## API Endpoints

### Complete Endpoint List

| Module | Endpoint | Method | Auth Required | Roles |
|--------|----------|--------|---------------|-------|
| Auth | `/auth/register` | POST | No | - |
| Auth | `/auth/login` | POST | No | - |
| Auth | `/auth/logout` | POST | Yes | all |
| Auth | `/auth/refresh` | POST | No | - |
| Auth | `/auth/forgot-password` | POST | No | - |
| Auth | `/auth/reset-password` | POST | No | - |
| Auth | `/auth/verify-email` | POST | No | - |
| Auth | `/auth/me` | GET | Yes | all |
| Chat | `/chat` | POST | Yes | customer |
| Chat | `/chat/jobs/:jobId/status` | GET | Yes | customer |
| Chat | `/chat/conversation/:id` | GET | Yes | customer |
| Restaurant | `/restaurants` | GET | No | - |
| Restaurant | `/restaurants/:id` | GET | No | - |
| Restaurant | `/restaurants/:id/menu` | GET | No | - |
| Restaurant | `/restaurants` | POST | Yes | restaurant_owner |
| Restaurant | `/restaurants/:id` | PUT | Yes | restaurant_owner |
| Restaurant | `/restaurants/:id` | DELETE | Yes | admin |
| Restaurant | `/restaurants/search` | GET | No | - |
| Dish | `/dishes` | GET | No | - |
| Dish | `/dishes/:id` | GET | No | - |
| Dish | `/dishes` | POST | Yes | restaurant_owner |
| Dish | `/dishes/:id` | PUT | Yes | restaurant_owner |
| Dish | `/dishes/:id` | DELETE | Yes | restaurant_owner |
| Dish | `/dishes/:id/availability` | PATCH | Yes | restaurant_owner |
| Cart | `/cart` | GET | Yes | customer |
| Cart | `/cart/items` | POST | Yes | customer |
| Cart | `/cart/items/:itemId` | PUT | Yes | customer |
| Cart | `/cart/items/:itemId` | DELETE | Yes | customer |
| Cart | `/cart` | DELETE | Yes | customer |
| Cart | `/cart/summary` | GET | Yes | customer |
| Order | `/orders` | POST | Yes | customer |
| Order | `/orders` | GET | Yes | customer, restaurant_owner |
| Order | `/orders/:id` | GET | Yes | customer, restaurant_owner |
| Order | `/orders/:id/status` | PATCH | Yes | restaurant_owner |
| Order | `/orders/:id/cancel` | POST | Yes | customer |
| Order | `/orders/:id/track` | GET | Yes | customer |
| Payment | `/payments/initiate` | POST | Yes | customer |
| Payment | `/payments/:id` | GET | Yes | customer |
| Payment | `/payments/webhook` | POST | No | - |
| Feedback | `/feedback` | POST | Yes | customer |
| Feedback | `/feedback/restaurant/:id` | GET | No | - |
| Feedback | `/feedback/order/:id` | GET | Yes | customer |
| Feedback | `/feedback/:id` | DELETE | Yes | admin |
| User | `/users/profile` | GET | Yes | all |
| User | `/users/profile` | PUT | Yes | all |
| User | `/users/addresses` | GET | Yes | customer |
| User | `/users/addresses` | POST | Yes | customer |
| User | `/users/addresses/:id` | PUT | Yes | customer |
| User | `/users/addresses/:id` | DELETE | Yes | customer |
| User | `/users/link-account` | POST | Yes | all |
| Admin | `/admin/users` | GET | Yes | admin |
| Admin | `/admin/users/:id/role` | PATCH | Yes | admin |
| Admin | `/admin/restaurants/pending` | GET | Yes | admin |
| Admin | `/admin/restaurants/:id/approve` | PATCH | Yes | admin |
| Admin | `/admin/dashboard/stats` | GET | Yes | admin |
| Health | `/health` | GET | No | - |
| Health | `/health/readiness` | GET | No | - |

---

## Dependencies

### External Services
- **Temporal Client** - Start workflows, query status, send signals
- **Kafka Producer** - Publish domain events
- **Redis** - Token blacklist, rate limiting, caching
- **PostgreSQL** - Primary data storage
- **MCP Orchestrator** - Restaurant/dish search proxy

### Internal Packages
- `@foodbot/events` - Kafka event schemas
- `@foodbot/workflows` - Temporal workflow types
- `@foodbot/llm-router` - LLM routing logic (optional)

---

## Implementation Status

### Current State
- ✅ Package configuration (package.json)
- ✅ Directory structure created
- ❌ Module implementations (0%)
- ❌ Controllers (0%)
- ❌ Services (0%)
- ❌ Repositories (0%)
- ❌ Guards and middlewares (0%)
- ❌ Tests (0%)

**Overall: 15% complete** (scaffolding only)

### Missing Components
1. All 10 modules (Auth, Chat, Restaurant, Dish, Cart, Order, Payment, Feedback, User, Admin)
2. Authentication system (JWT, guards, strategies)
3. Database entities and repositories (TypeORM)
4. Temporal client integration
5. Kafka producer integration
6. Redis client integration
7. Swagger/OpenAPI documentation
8. Global exception filters
9. Validation pipes
10. Logging and monitoring

---

## Next Steps

### Phase 1: Core Infrastructure (Week 1)
1. **Database Setup**
   - Configure TypeORM
   - Create entities (User, Restaurant, Dish, Order, Payment, Address, Feedback)
   - Generate migrations
   - Seed initial data

2. **Authentication Module**
   - Implement JWT strategy
   - Create auth guards and decorators
   - Implement token blacklisting (Redis)
   - Add rate limiting
   - Write unit tests

3. **Base Controllers and Services**
   - Create base controller class
   - Create base service class
   - Add global exception filter
   - Add validation pipes

### Phase 2: Business Logic Modules (Week 2-3)
1. **Restaurant Module** (Days 1-3)
2. **Dish Module** (Days 1-2)
3. **Cart Module** (Days 1-2)
4. **Order Module** (Days 3-4)
5. **Payment Module** (Days 2-3)
6. **User Module** (Days 1-2)
7. **Feedback Module** (Day 1)
8. **Admin Module** (Days 2-3)
9. **Chat Module** (Days 2-3)

### Phase 3: Integration and Testing (Week 3-4)
1. Temporal client integration
2. Kafka producer integration
3. E2E tests
4. API documentation (Swagger)
5. Performance testing

---

## Related Documentation

- [System Architecture](../system-architecture.md)
- [Implementation Status](../implementation-status.md)
- [Workflow Service](./workflow-service.md)
- [Authentication Architecture](../security/authentication.md)
- [API Integration Patterns](../integration/api-integration.md)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-20
**Status:** Design Complete, Implementation Needed
