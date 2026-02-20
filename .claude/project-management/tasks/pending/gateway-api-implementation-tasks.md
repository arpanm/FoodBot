# Gateway API Implementation Tasks

**Status:** 🔴 PENDING - CRITICAL (BLOCKING MVP)
**Generated:** 2026-02-20
**Last Updated:** 2026-02-20
**Component:** Gateway API (NestJS)
**Priority:** P0 - Critical (Blocking MVP)
**Assignee:** Backend Team
**Estimated Effort:** 3-4 weeks (25.5 days)
**Target Start:** 2026-02-21
**Target Completion:** 2026-03-20

---

## Task Hierarchy

```
Gateway API Implementation
├── Phase 1: Infrastructure (5 days)
│   ├── Database Setup
│   ├── Authentication System
│   └── Base Classes
├── Phase 2: Core Modules (10 days)
│   ├── Restaurant Module
│   ├── Dish Module
│   ├── Cart Module
│   ├── Order Module
│   └── Payment Module
├── Phase 3: Supporting Modules (5 days)
│   ├── User Module
│   ├── Feedback Module
│   ├── Admin Module
│   └── Chat Module
└── Phase 4: Integration & Testing (5 days)
    ├── Temporal Integration
    ├── Kafka Integration
    ├── E2E Tests
    └── Documentation
```

---

## Phase 1: Infrastructure Tasks

### TASK-GW-001: Database Configuration and Entities
**Priority:** Critical
**Estimated Time:** 2 days
**Dependencies:** None

**Requirements:**
1. Configure TypeORM with PostgreSQL
2. Create database entities:
   - User
   - Restaurant
   - Dish
   - Order
   - OrderItem
   - Payment
   - Address
   - Feedback
   - ChatMessage
   - Job
3. Define entity relationships
4. Generate initial migrations
5. Create seed data scripts

**Acceptance Criteria:**
- [ ] TypeORM successfully connects to PostgreSQL
- [ ] All entities defined with proper decorators
- [ ] Migrations run successfully
- [ ] Seed script creates test data
- [ ] Entity relationships work correctly

**Files to Create:**
- `apps/gateway-api/src/entities/*.entity.ts`
- `apps/gateway-api/src/database/migrations/*.ts`
- `apps/gateway-api/src/database/seeds/*.ts`
- `apps/gateway-api/src/database/database.module.ts`

---

### TASK-GW-002: Redis Configuration
**Priority:** High
**Estimated Time:** 0.5 days
**Dependencies:** None

**Requirements:**
1. Install and configure `@nestjs-modules/ioredis`
2. Create RedisService
3. Implement token blacklist methods
4. Implement rate limiting methods
5. Implement caching methods

**Acceptance Criteria:**
- [ ] Redis client connects successfully
- [ ] Token blacklist works
- [ ] Rate limiting functional
- [ ] Cache set/get/delete operations work

**Files to Create:**
- `apps/gateway-api/src/redis/redis.module.ts`
- `apps/gateway-api/src/redis/redis.service.ts`

---

### TASK-GW-003: Authentication Module Implementation
**Priority:** Critical
**Estimated Time:** 2 days
**Dependencies:** TASK-GW-001, TASK-GW-002

**Requirements:**
1. Implement JwtStrategy (Passport)
2. Create JwtAuthGuard
3. Create RolesGuard
4. Create Public decorator
5. Implement AuthController
6. Implement AuthService
7. Add bcrypt password hashing
8. Add email verification flow
9. Add password reset flow
10. Add rate limiting for auth endpoints

**Acceptance Criteria:**
- [ ] User registration works
- [ ] User login returns JWT tokens
- [ ] Access token validation works
- [ ] Refresh token flow works
- [ ] Token blacklisting works on logout
- [ ] Email verification sends email
- [ ] Password reset works
- [ ] Rate limiting prevents brute force
- [ ] 80%+ test coverage

**Files to Create:**
- `apps/gateway-api/src/auth/auth.module.ts`
- `apps/gateway-api/src/auth/auth.controller.ts`
- `apps/gateway-api/src/auth/auth.service.ts`
- `apps/gateway-api/src/auth/strategies/jwt.strategy.ts`
- `apps/gateway-api/src/auth/guards/jwt-auth.guard.ts`
- `apps/gateway-api/src/auth/guards/roles.guard.ts`
- `apps/gateway-api/src/auth/decorators/public.decorator.ts`
- `apps/gateway-api/src/auth/decorators/roles.decorator.ts`
- `apps/gateway-api/src/auth/dto/*.dto.ts`
- `apps/gateway-api/src/auth/__tests__/*.spec.ts`

---

### TASK-GW-004: Base Classes and Global Filters
**Priority:** High
**Estimated Time:** 0.5 days
**Dependencies:** TASK-GW-001

**Requirements:**
1. Create BaseController with common methods
2. Create BaseService with common methods
3. Create GlobalExceptionFilter
4. Create ValidationPipe configuration
5. Create logging interceptor

**Acceptance Criteria:**
- [ ] Base classes provide reusable functionality
- [ ] Exception filter returns consistent error format
- [ ] Validation pipe validates all DTOs
- [ ] Logging interceptor logs all requests

**Files to Create:**
- `apps/gateway-api/src/common/base.controller.ts`
- `apps/gateway-api/src/common/base.service.ts`
- `apps/gateway-api/src/common/filters/global-exception.filter.ts`
- `apps/gateway-api/src/common/interceptors/logging.interceptor.ts`

---

## Phase 2: Core Business Modules

### TASK-GW-005: Restaurant Module
**Priority:** Critical
**Estimated Time:** 2 days
**Dependencies:** TASK-GW-001, TASK-GW-003

**Requirements:**
1. Create RestaurantController with all endpoints
2. Implement RestaurantService
3. Implement RestaurantRepository
4. Add DTOs with validation
5. Add search proxy to MCP Orchestrator
6. Add restaurant approval workflow (admin)
7. Implement Kafka event publishing

**Acceptance Criteria:**
- [ ] CRUD operations work
- [ ] Search proxy works
- [ ] Restaurant owner can manage own restaurants
- [ ] Admin can approve/reject restaurants
- [ ] Events published to Kafka on changes
- [ ] 80%+ test coverage

**Endpoints:**
- `GET /restaurants`
- `GET /restaurants/:id`
- `GET /restaurants/:id/menu`
- `POST /restaurants`
- `PUT /restaurants/:id`
- `DELETE /restaurants/:id`
- `GET /restaurants/search`

**Files to Create:**
- `apps/gateway-api/src/restaurant/restaurant.module.ts`
- `apps/gateway-api/src/restaurant/restaurant.controller.ts`
- `apps/gateway-api/src/restaurant/restaurant.service.ts`
- `apps/gateway-api/src/restaurant/restaurant.repository.ts`
- `apps/gateway-api/src/restaurant/dto/*.dto.ts`
- `apps/gateway-api/src/restaurant/__tests__/*.spec.ts`

---

### TASK-GW-006: Dish Module
**Priority:** High
**Estimated Time:** 1.5 days
**Dependencies:** TASK-GW-005

**Requirements:**
1. Create DishController
2. Implement DishService
3. Implement DishRepository
4. Add DTOs with validation
5. Add availability toggle
6. Implement Kafka event publishing

**Acceptance Criteria:**
- [ ] CRUD operations work
- [ ] Restaurant owners can manage dishes
- [ ] Availability toggle works
- [ ] Events published on changes
- [ ] 80%+ test coverage

**Endpoints:**
- `GET /dishes`
- `GET /dishes/:id`
- `POST /dishes`
- `PUT /dishes/:id`
- `DELETE /dishes/:id`
- `PATCH /dishes/:id/availability`

**Files to Create:**
- `apps/gateway-api/src/dish/dish.module.ts`
- `apps/gateway-api/src/dish/dish.controller.ts`
- `apps/gateway-api/src/dish/dish.service.ts`
- `apps/gateway-api/src/dish/dish.repository.ts`
- `apps/gateway-api/src/dish/dto/*.dto.ts`
- `apps/gateway-api/src/dish/__tests__/*.spec.ts`

---

### TASK-GW-007: Cart Module
**Priority:** High
**Estimated Time:** 1.5 days
**Dependencies:** TASK-GW-006

**Requirements:**
1. Create CartController
2. Implement CartService
3. Use Redis for cart storage
4. Add cart expiration (30 min)
5. Calculate totals (items, tax, delivery fee)
6. Add DTOs with validation

**Acceptance Criteria:**
- [ ] Add/remove/update items works
- [ ] Cart persists in Redis
- [ ] Cart expires after 30 minutes
- [ ] Total calculation correct
- [ ] 80%+ test coverage

**Endpoints:**
- `GET /cart`
- `POST /cart/items`
- `PUT /cart/items/:itemId`
- `DELETE /cart/items/:itemId`
- `DELETE /cart`
- `GET /cart/summary`

**Files to Create:**
- `apps/gateway-api/src/cart/cart.module.ts`
- `apps/gateway-api/src/cart/cart.controller.ts`
- `apps/gateway-api/src/cart/cart.service.ts`
- `apps/gateway-api/src/cart/dto/*.dto.ts`
- `apps/gateway-api/src/cart/__tests__/*.spec.ts`

---

### TASK-GW-008: Order Module
**Priority:** Critical
**Estimated Time:** 2 days
**Dependencies:** TASK-GW-007, TASK-GW-014 (Temporal integration)

**Requirements:**
1. Create OrderController
2. Implement OrderService
3. Implement OrderRepository
4. Integrate with Temporal (placeOrderWorkflow)
5. Add order tracking
6. Add order cancellation with refund
7. Implement Kafka event publishing
8. Add DTOs with validation

**Acceptance Criteria:**
- [ ] Order placement starts Temporal workflow
- [ ] Order status tracking works
- [ ] Cancellation with refund works
- [ ] Events published on status changes
- [ ] 80%+ test coverage

**Endpoints:**
- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status`
- `POST /orders/:id/cancel`
- `GET /orders/:id/track`

**Files to Create:**
- `apps/gateway-api/src/order/order.module.ts`
- `apps/gateway-api/src/order/order.controller.ts`
- `apps/gateway-api/src/order/order.service.ts`
- `apps/gateway-api/src/order/order.repository.ts`
- `apps/gateway-api/src/order/dto/*.dto.ts`
- `apps/gateway-api/src/order/__tests__/*.spec.ts`

---

### TASK-GW-009: Payment Module
**Priority:** Critical
**Estimated Time:** 2 days
**Dependencies:** TASK-GW-008, TASK-GW-014

**Requirements:**
1. Create PaymentController
2. Implement PaymentService
3. Implement PaymentRepository
4. Integrate with Temporal (processPaymentWorkflow)
5. Add webhook handler (Stripe/Razorpay)
6. Add 3D Secure support
7. Implement Kafka event publishing
8. Add DTOs with validation

**Acceptance Criteria:**
- [ ] Payment initiation starts Temporal workflow
- [ ] Webhook handler processes callbacks
- [ ] 3D Secure flow works
- [ ] Events published on payment status changes
- [ ] Idempotency implemented
- [ ] 80%+ test coverage

**Endpoints:**
- `POST /payments/initiate`
- `GET /payments/:id`
- `POST /payments/webhook`

**Files to Create:**
- `apps/gateway-api/src/payment/payment.module.ts`
- `apps/gateway-api/src/payment/payment.controller.ts`
- `apps/gateway-api/src/payment/payment.service.ts`
- `apps/gateway-api/src/payment/payment.repository.ts`
- `apps/gateway-api/src/payment/dto/*.dto.ts`
- `apps/gateway-api/src/payment/__tests__/*.spec.ts`

---

## Phase 3: Supporting Modules

### TASK-GW-010: User Module
**Priority:** High
**Estimated Time:** 1 day
**Dependencies:** TASK-GW-003

**Requirements:**
1. Create UserController
2. Implement UserService
3. Implement UserRepository
4. Add profile management
5. Add address CRUD
6. Add account linking (OAuth)
7. Add DTOs with validation

**Acceptance Criteria:**
- [ ] Profile CRUD works
- [ ] Address CRUD works
- [ ] OAuth account linking works
- [ ] 80%+ test coverage

**Endpoints:**
- `GET /users/profile`
- `PUT /users/profile`
- `GET /users/addresses`
- `POST /users/addresses`
- `PUT /users/addresses/:id`
- `DELETE /users/addresses/:id`
- `POST /users/link-account`

**Files to Create:**
- `apps/gateway-api/src/user/user.module.ts`
- `apps/gateway-api/src/user/user.controller.ts`
- `apps/gateway-api/src/user/user.service.ts`
- `apps/gateway-api/src/user/user.repository.ts`
- `apps/gateway-api/src/user/dto/*.dto.ts`
- `apps/gateway-api/src/user/__tests__/*.spec.ts`

---

### TASK-GW-011: Feedback Module
**Priority:** Medium
**Estimated Time:** 1 day
**Dependencies:** TASK-GW-008

**Requirements:**
1. Create FeedbackController
2. Implement FeedbackService
3. Implement FeedbackRepository
4. Add rating and review submission
5. Add moderation (admin)
6. Add DTOs with validation

**Acceptance Criteria:**
- [ ] Customers can submit feedback
- [ ] Feedback lists work
- [ ] Admin moderation works
- [ ] 80%+ test coverage

**Files to Create:**
- `apps/gateway-api/src/feedback/feedback.module.ts`
- `apps/gateway-api/src/feedback/feedback.controller.ts`
- `apps/gateway-api/src/feedback/feedback.service.ts`
- `apps/gateway-api/src/feedback/feedback.repository.ts`
- `apps/gateway-api/src/feedback/dto/*.dto.ts`
- `apps/gateway-api/src/feedback/__tests__/*.spec.ts`

---

### TASK-GW-012: Admin Module
**Priority:** Medium
**Estimated Time:** 1.5 days
**Dependencies:** TASK-GW-003, TASK-GW-005

**Requirements:**
1. Create AdminController
2. Implement AdminService
3. Add user management
4. Add restaurant approval
5. Add dashboard statistics
6. Add DTOs with validation

**Acceptance Criteria:**
- [ ] User management works
- [ ] Restaurant approval works
- [ ] Dashboard stats calculated correctly
- [ ] 80%+ test coverage

**Files to Create:**
- `apps/gateway-api/src/admin/admin.module.ts`
- `apps/gateway-api/src/admin/admin.controller.ts`
- `apps/gateway-api/src/admin/admin.service.ts`
- `apps/gateway-api/src/admin/dto/*.dto.ts`
- `apps/gateway-api/src/admin/__tests__/*.spec.ts`

---

### TASK-GW-013: Chat Module
**Priority:** Medium
**Estimated Time:** 2 days
**Dependencies:** TASK-GW-003, TASK-GW-014

**Requirements:**
1. Create ChatController
2. Implement ChatService
3. Add job-based async processing
4. Add job status polling
5. Integrate with LLM Router
6. Integrate with Temporal for workflow generation
7. Add DTOs with validation

**Acceptance Criteria:**
- [ ] Message submission creates job
- [ ] Job status polling works
- [ ] LLM integration works
- [ ] Workflow generation and execution works
- [ ] 80%+ test coverage

**Files to Create:**
- `apps/gateway-api/src/chat/chat.module.ts`
- `apps/gateway-api/src/chat/chat.controller.ts`
- `apps/gateway-api/src/chat/chat.service.ts`
- `apps/gateway-api/src/chat/dto/*.dto.ts`
- `apps/gateway-api/src/chat/__tests__/*.spec.ts`

---

## Phase 4: Integration and Testing

### TASK-GW-014: Temporal Client Integration
**Priority:** Critical
**Estimated Time:** 1 day
**Dependencies:** TASK-GW-003

**Requirements:**
1. Install Temporal TypeScript SDK
2. Create TemporalService
3. Implement workflow start methods
4. Implement workflow query methods
5. Implement signal sending
6. Add connection management

**Acceptance Criteria:**
- [ ] Temporal client connects successfully
- [ ] Workflow start works
- [ ] Workflow query works
- [ ] Signal sending works
- [ ] Error handling works

**Files to Create:**
- `apps/gateway-api/src/temporal/temporal.module.ts`
- `apps/gateway-api/src/temporal/temporal.service.ts`

---

### TASK-GW-015: Kafka Producer Integration
**Priority:** Critical
**Estimated Time:** 1 day
**Dependencies:** TASK-GW-003

**Requirements:**
1. Install kafkajs
2. Create KafkaService
3. Implement event publishing methods
4. Add event schema validation
5. Add connection management

**Acceptance Criteria:**
- [ ] Kafka producer connects
- [ ] Events publish successfully
- [ ] Event schema validation works
- [ ] Error handling works

**Files to Create:**
- `apps/gateway-api/src/kafka/kafka.module.ts`
- `apps/gateway-api/src/kafka/kafka.service.ts`

---

### TASK-GW-016: E2E Tests
**Priority:** High
**Estimated Time:** 2 days
**Dependencies:** All module tasks

**Requirements:**
1. Create E2E test infrastructure
2. Write E2E tests for all modules
3. Add test database setup/teardown
4. Add test data fixtures

**Acceptance Criteria:**
- [ ] All E2E tests pass
- [ ] 80%+ API coverage
- [ ] Test database isolated

**Files to Create:**
- `apps/gateway-api/test/e2e/*.e2e-spec.ts`
- `apps/gateway-api/test/fixtures/*.ts`

---

### TASK-GW-017: API Documentation (Swagger)
**Priority:** Medium
**Estimated Time:** 1 day
**Dependencies:** All module tasks

**Requirements:**
1. Install @nestjs/swagger
2. Add Swagger decorators to all endpoints
3. Generate OpenAPI spec
4. Add API examples
5. Host Swagger UI

**Acceptance Criteria:**
- [ ] Swagger UI accessible at /api/docs
- [ ] All endpoints documented
- [ ] Request/response examples present
- [ ] Authentication documented

**Files to Update:**
- All controller files with Swagger decorators

---

## Task Summary

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| Phase 1: Infrastructure | 4 | 5 days | Critical |
| Phase 2: Core Modules | 5 | 10 days | Critical |
| Phase 3: Supporting Modules | 4 | 5.5 days | Medium |
| Phase 4: Integration & Testing | 4 | 5 days | High |
| **Total** | **17** | **25.5 days** | - |

---

## Definition of Done

- [ ] All acceptance criteria met
- [ ] Unit tests written with 80%+ coverage
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Code reviewed by team
- [ ] Documentation updated
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] API documentation (Swagger) complete

---

**Generated:** 2026-02-20
**Review Date:** Weekly during implementation
