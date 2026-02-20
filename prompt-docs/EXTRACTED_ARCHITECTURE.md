# FoodBot - Extracted Architecture from Guide Documents

**Generated**: 2026-02-20
**Source**: All guide documents in `docs/guide/`
**Status**: Comprehensive architecture extraction

---

## Table of Contents

- [1. System Architecture Overview](#1-system-architecture-overview)
- [2. Backend Architecture](#2-backend-architecture)
- [3. Frontend Architecture](#3-frontend-architecture)
- [4. Workflow Architecture](#4-workflow-architecture)
- [5. MCP Orchestrator Architecture](#5-mcp-orchestrator-architecture)
- [6. Mobile Architecture](#6-mobile-architecture)
- [7. CI/CD Architecture](#7-cicd-architecture)
- [8. Infrastructure Architecture](#8-infrastructure-architecture)
- [9. Monitoring Architecture](#9-monitoring-architecture)

---

## 1. System Architecture Overview

### 1.1 Monorepo Structure

FoodBot uses **pnpm workspaces** to manage a monorepo:

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*          # Application packages
  - services/*      # Backend services
  - packages/*      # Shared libraries
```

### 1.2 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENTS                                 │
├─────────────────────────────────────────────────────────────────┤
│  Customer App (React)  │  Restaurant App (React)  │  Mobile App │
└────────────┬────────────┴──────────────┬───────────┴─────────────┘
             │                           │
             └───────────┬───────────────┘
                         │
                    HTTP/WebSocket
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      GATEWAY API (NestJS)                        │
│  ┌──────────┬───────────┬─────────┬─────────┬──────────────┐   │
│  │   Auth   │Restaurant │  Dish   │  Cart   │   Order      │   │
│  │   Module │  Module   │ Module  │ Module  │   Module     │   │
│  └──────────┴───────────┴─────────┴─────────┴──────────────┘   │
│  ┌──────────┬───────────┬─────────┬─────────┬──────────────┐   │
│  │ Payment  │ Feedback  │  User   │  Chat   │   Admin      │   │
│  │  Module  │  Module   │ Module  │ Module  │   Module     │   │
│  └──────────┴───────────┴─────────┴─────────┴──────────────┘   │
└────────────┬──────────────────────────────┬───────────────────┬─┘
             │                              │                   │
             ▼                              ▼                   ▼
┌──────────────────┐       ┌──────────────────────┐   ┌──────────────┐
│   PostgreSQL     │       │   Temporal Server    │   │ Redis Cache  │
│  (Application)   │       │   (Workflows)        │   │ & Sessions   │
└──────────────────┘       └─────────┬────────────┘   └──────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────┐
                    │   Temporal Workers             │
                    │   (Workflow Execution)         │
                    └────────┬───────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────────┐
        │        MCP ORCHESTRATOR (Spring Boot)          │
        │  ┌──────────┬──────────┬──────────────────┐   │
        │  │ Provider │  Search  │   Aggregator     │   │
        │  │ Router   │  Engine  │                  │   │
        │  └──────────┴──────────┴──────────────────┘   │
        └────────┬───────────────────────┬───────────────┘
                 │                       │
                 ▼                       ▼
    ┌──────────────────────┐   ┌──────────────────┐
    │   Elasticsearch      │   │     Kafka        │
    │   (Search Index)     │   │  (Event Stream)  │
    └──────────────────────┘   └──────────────────┘
```

### 1.3 Technology Stack

**Frontend**:
- React 18+ with TypeScript
- Redux Toolkit for state management
- Axios for HTTP client
- Vite for build tool
- React Testing Library for testing

**Backend**:
- NestJS (Node.js framework)
- TypeORM (database ORM)
- JWT for authentication
- Passport for auth strategies
- class-validator for validation

**Workflows**:
- Temporal (workflow orchestration)
- TypeScript Temporal SDK

**MCP Orchestrator**:
- Spring Boot (Java)
- Spring Data JPA
- Elasticsearch client
- Kafka client

**Mobile**:
- React Native
- Redux Toolkit
- React Navigation

**Infrastructure**:
- PostgreSQL (application + Temporal)
- Redis (caching + sessions)
- Kafka (event streaming)
- Elasticsearch (search)
- Temporal Server (workflows)

**Monitoring**:
- Prometheus (metrics)
- Grafana (visualization)
- Sentry (error tracking)
- Loki (logs)
- AlertManager (alerts)

---

## 2. Backend Architecture

### 2.1 NestJS Gateway API Structure

```
apps/gateway-api/src/
├── app.module.ts              # Root module - imports all feature modules
├── filters/
│   └── validation-exception.filter.ts  # Global error formatting
├── services/
│   ├── redis.service.ts       # Redis client wrapper
│   └── email.service.ts       # Email service
├── modules/
│   ├── auth/                  # Authentication module
│   │   ├── auth.module.ts     # Module definition
│   │   ├── auth.controller.ts # Routes: /auth/*
│   │   ├── auth.service.ts    # Business logic
│   │   ├── dto/               # Request validation DTOs
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── ...
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts  # JWT verification + blacklist check
│   │   │   └── roles.guard.ts     # Role-based authorization
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts    # Passport JWT strategy
│   │   └── decorators/
│   │       ├── public.decorator.ts    # @Public() - skip auth
│   │       ├── roles.decorator.ts     # @Roles('admin')
│   │       └── current-user.decorator.ts
│   ├── restaurant/            # Restaurant CRUD
│   ├── dish/                  # Dish CRUD
│   ├── cart/                  # Cart management
│   ├── order/                 # Order management
│   ├── payment/               # Payment processing
│   ├── feedback/              # Ratings and feedback
│   ├── user/                  # User profile and addresses
│   ├── chat/                  # AI chat interface
│   └── admin/                 # Admin operations
└── test/
    ├── utils/                 # Test helpers
    └── factories/             # Test data factories
```

### 2.2 Module Pattern

Every feature module follows this structure:

```typescript
// 1. Module definition (feature.module.ts)
@Module({
  imports: [...],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService],  // if shared
})
export class FeatureModule {}

// 2. Controller (feature.controller.ts)
@Controller('feature')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  findAll() { ... }

  @Post()
  create(@Body() dto: CreateFeatureDto) { ... }
}

// 3. Service (feature.service.ts)
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);
  // Business logic here
}

// 4. DTO (dto/create-feature.dto.ts)
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
```

### 2.3 Request Flow

```
HTTP Request
    │
    ▼
┌─────────────────────┐
│   Middleware        │  1. Parse request, add correlation ID
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Guards            │  2. JwtAuthGuard → Verify token, check blacklist
└──────────┬──────────┘     RolesGuard → Check user role
           │
           ▼
┌─────────────────────┐
│   Validation Pipe   │  3. Validate DTO with class-validator
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Controller        │  4. Route to controller method
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Service           │  5. Execute business logic
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Repository        │  6. Database operations (TypeORM)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Response          │  7. Transform response, return to client
└─────────────────────┘
```

### 2.4 Authentication Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                        │
└──────────────────────────────────────────────────────────────┘

1. Login Request
   POST /auth/login
   { email, password }
        │
        ▼
   AuthController.login()
        │
        ▼
   AuthService.validateUser()
        │
        ├─ Query database for user
        ├─ Compare password (bcrypt)
        └─ Return user or null
        │
        ▼
   AuthService.generateTokens()
        │
        ├─ Generate JWT access token (15min expiry)
        ├─ Generate JWT refresh token (7d expiry)
        └─ Store refresh token in Redis
        │
        ▼
   Return { accessToken, refreshToken, user }

2. Protected Request
   GET /orders
   Header: Authorization: Bearer <accessToken>
        │
        ▼
   JwtAuthGuard
        │
        ├─ Extract token from header
        ├─ Verify JWT signature
        ├─ Check token blacklist (Redis)
        ├─ Load user from database
        └─ Attach user to request
        │
        ▼
   RolesGuard (if @Roles decorator present)
        │
        ├─ Check user.role against required roles
        └─ Allow or deny
        │
        ▼
   Controller method executes

3. Token Refresh
   POST /auth/refresh
   { refreshToken }
        │
        ▼
   AuthService.refreshAccessToken()
        │
        ├─ Verify refresh token (JWT)
        ├─ Check if refresh token exists in Redis
        ├─ Generate new access token
        └─ Return new access token

4. Logout
   POST /auth/logout
   Header: Authorization: Bearer <accessToken>
        │
        ▼
   AuthService.logout()
        │
        ├─ Add access token to blacklist (Redis)
        ├─ Delete refresh token from Redis
        └─ Return success
```

### 2.5 Database Architecture

**TypeORM Entities**:

```typescript
// Core entities
Users (id, email, password, name, phone, role, status)
Restaurants (id, name, description, cuisines, address, rating, ownerId)
Dishes (id, name, description, price, category, dietaryInfo, restaurantId)
Carts (id, userId, restaurantId, items)
CartItems (id, cartId, dishId, quantity, specialInstructions)
Orders (id, userId, restaurantId, items, status, total, deliveryAddress)
OrderItems (id, orderId, dishId, quantity, price)
Payments (id, orderId, method, amount, status, transactionId)
Addresses (id, userId, street, city, state, zipcode, isDefault)
Feedback (id, orderId, userId, rating, foodRating, deliveryRating, comment)
Workflows (id, workflowId, workflowType, status, input, result)
```

**Relationships**:
- User → Restaurants (one-to-many, ownerId)
- Restaurant → Dishes (one-to-many)
- User → Carts (one-to-many)
- Cart → CartItems (one-to-many)
- User → Orders (one-to-many)
- Restaurant → Orders (one-to-many)
- Order → OrderItems (one-to-many)
- Order → Payment (one-to-one)
- User → Addresses (one-to-many)
- Order → Feedback (one-to-one)

### 2.6 Caching Strategy

**Redis Usage**:

```typescript
// Session management
Key: "session:userId"
Value: { accessToken, refreshToken, expiresAt }
TTL: 15 minutes

// Token blacklist
Key: "blacklist:token"
Value: "1"
TTL: 15 minutes (match token expiry)

// Rate limiting
Key: "rate_limit:login:email"
Value: attempt_count
TTL: 15 minutes

// Refresh tokens
Key: "refresh_token:token"
Value: { userId, expiresAt }
TTL: 7 days

// Restaurant cache
Key: "restaurant:id"
Value: JSON restaurant object
TTL: 30 minutes

// Dish cache
Key: "dish:id"
Value: JSON dish object
TTL: 30 minutes
```

---

## 3. Frontend Architecture

### 3.1 Customer App Structure

```
apps/customer-app/src/
├── components/
│   ├── Cart/           # CartItem, CartList, CartSummary
│   ├── Chat/           # ChatInterface, MessageCard, InputField, CTAButton,
│   │                   # DynamicForm, LoadingIndicator
│   ├── Dish/           # DishCard, DishDetail, DishList
│   ├── Order/          # OrderCard, OrderDetail, OrderList, OrderTracking
│   ├── Restaurant/     # RestaurantCard, RestaurantDetail, RestaurantList,
│   │                   # RestaurantSearch, FilterPanel
│   ├── Search/         # SearchBar, SearchFilters, SearchResults
│   ├── Status/         # ProgressStepper, StatusTracker
│   └── common/         # Button, Card, ErrorMessage, Input, LoadingSpinner
├── hooks/
│   ├── useDebounce.ts
│   ├── useInfiniteScroll.ts
│   ├── useJobPolling.ts
│   └── useRedux.ts
├── services/
│   ├── account-linking.service.ts
│   ├── api/axios.config.ts
│   ├── cart.service.ts
│   ├── chat.service.ts
│   ├── dish.service.ts
│   ├── order.service.ts
│   ├── restaurant.service.ts
│   ├── search.service.ts
│   └── user.service.ts
├── store/
│   ├── index.ts
│   └── slices/
│       ├── accountLinkingSlice.ts
│       ├── cartSlice.ts
│       ├── chatSlice.ts
│       ├── dishSlice.ts
│       ├── orderSlice.ts
│       ├── restaurantSlice.ts
│       └── userSlice.ts
├── test/
│   ├── factories/      # Test data factories
│   └── utils/          # mockStore, renderWithProviders
└── types/
    ├── api.types.ts
    ├── common.types.ts
    ├── models.ts
    └── redux.types.ts
```

### 3.2 Component Hierarchy

```
App
  ChatInterface
    MessageCard
      CTAButton
    DynamicForm
    InputField
    LoadingIndicator
  RestaurantSearch
    SearchBar
    FilterPanel
    RestaurantList
      RestaurantCard
  RestaurantDetail
    DishList
      DishCard
    DishDetail
  CartList
    CartItem
    CartSummary
  OrderList
    OrderCard
  OrderDetail
    OrderTracking
      ProgressStepper
      StatusTracker
```

### 3.3 Redux State Structure

```typescript
RootState = {
  user: {
    user: User | null,
    addresses: Address[],
    isAuthenticated: boolean,
    loading: boolean,
    error: string | null
  },
  restaurant: {
    restaurants: Restaurant[],
    selectedRestaurant: Restaurant | null,
    filters: SearchFilters,
    loading: boolean,
    error: string | null
  },
  dish: {
    dishes: Dish[],
    selectedDish: Dish | null,
    loading: boolean,
    error: string | null
  },
  cart: {
    items: CartItem[],
    total: number,
    restaurantId: string | null,
    loading: boolean,
    error: string | null
  },
  order: {
    orders: Order[],
    currentOrder: Order | null,
    tracking: OrderTracking | null,
    loading: boolean,
    error: string | null
  },
  chat: {
    messages: Message[],
    jobId: string | null,
    isLoading: boolean,
    error: string | null
  },
  accountLinking: {
    linkedAccounts: LinkedAccount[],
    linkingStatus: 'idle' | 'pending' | 'success' | 'error',
    error: string | null
  }
}
```

### 3.4 Data Flow

```
User Action (e.g., Click "Add to Cart")
    │
    ▼
Component (DishCard)
    │
    ├─ dispatch(addToCart(dish))
    │
    ▼
Redux Thunk (async action)
    │
    ├─ API call via service layer
    │  cartService.addItem(dish)
    │       │
    │       ▼
    │  Axios HTTP request
    │  POST /cart/items
    │       │
    │       ▼
    │  Backend API
    │  (Gateway API)
    │       │
    │       ▼
    │  Database update
    │       │
    │       ▼
    │  Response
    │
    ▼
Redux action dispatched
    │
    ├─ addToCart.pending  → state.loading = true
    ├─ addToCart.fulfilled → state.items = [...items, newItem]
    └─ addToCart.rejected → state.error = error.message
    │
    ▼
Component re-renders
    │
    ├─ useSelector reads updated state
    ├─ Component displays new cart item
    └─ Cart count badge updates
```

### 3.5 API Client Architecture

```typescript
// Axios instance configuration
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Request interceptor (add auth token)
apiClient.interceptors.request.use((config) => {
  const token = store.getState().user.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor (handle errors)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, try refresh
      const refreshToken = store.getState().user.refreshToken;
      const newToken = await refreshAccessToken(refreshToken);
      // Retry original request
    }
    if (error.response?.status === 429) {
      // Rate limited
      showError('Too many requests. Please try again later.');
    }
    // Network error
    if (!error.response) {
      showError('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Workflow Architecture

### 4.1 Temporal Workflow System

```
┌──────────────────────────────────────────────────────────────┐
│                    TEMPORAL ARCHITECTURE                      │
└──────────────────────────────────────────────────────────────┘

Gateway API                    Temporal Server                Workers
     │                              │                            │
     │-- startWorkflow() ---------->│                            │
     │   (placeOrderWorkflow)       │                            │
     │                              │-- dispatch activity ------>│
     │                              │   (validateCart)           │
     │                              │<-- activity result --------|
     │                              │                            │
     │                              │-- dispatch activity ------>│
     │                              │   (reserveItems)           │
     │                              │<-- activity result --------|
     │                              │                            │
     │                              │-- dispatch activity ------>│
     │                              │   (processPayment)         │
     │                              │<-- activity result --------|
     │                              │                            │
     │                              │-- dispatch activity ------>│
     │                              │   (createOrder)            │
     │                              │<-- activity result --------|
     │                              │                            │
     │-- queryWorkflow() ---------->│                            │
     │<-- workflow result ----------│                            │
```

### 4.2 Task Queue Architecture

```
┌────────────────────────────────────────────────────────┐
│                   TASK QUEUES                          │
└────────────────────────────────────────────────────────┘

foodbot-main-queue
   ├─ searchRestaurant workflow
   ├─ userOnboarding workflow
   └─ general workflows

foodbot-orders-queue
   ├─ placeOrder workflow
   └─ orderFulfillment workflow

foodbot-payments-queue
   └─ processPayment workflow

foodbot-notifications-queue
   └─ notification dispatch workflows

foodbot-onboarding-queue
   ├─ userOnboarding workflow
   └─ restaurantOnboarding workflow
```

### 4.3 Workflow Pattern (Saga)

Place Order Workflow with Compensations:

```
┌────────────────────────────────────────────────────────┐
│              PLACE ORDER WORKFLOW (Saga)               │
└────────────────────────────────────────────────────────┘

Step 1: Validate Cart
   │
   ├─ Success → Continue
   └─ Failure → End workflow with error
   │
   ▼
Step 2: Check Inventory
   │
   ├─ Success → Continue
   └─ Failure → End workflow with error
   │
   ▼
Step 3: Reserve Items
   │  (Compensation: Release Items)
   │
   ├─ Success → Continue
   └─ Failure → Compensate & end
   │
   ▼
Step 4: Process Payment
   │  (Compensation: Refund Payment)
   │
   ├─ Success → Continue
   └─ Failure → Compensate (release items, refund) & end
   │
   ▼
Step 5: Create Order
   │
   ├─ Success → Continue
   └─ Failure → Compensate (release items, refund) & end
   │
   ▼
Step 6: Update Status to Confirmed
   │
   ▼
Step 7: Notify Restaurant
   │
   ▼
Step 8: Notify Customer
   │
   ▼
Workflow Complete
```

### 4.4 Activity Organization

```
packages/workflows/src/activities/

database.activities.ts
   ├─ createOrder(orderData)
   ├─ updateOrderStatus(orderId, status)
   ├─ getUserContext(userId)
   └─ saveWorkflowResult(workflowId, result)

external.activities.ts
   ├─ searchRestaurants(query, filters)
   ├─ checkInventory(items)
   ├─ reserveItems(items)
   └─ releaseItems(items)

llm.activities.ts
   ├─ enrichQuery(query, userContext)
   ├─ classifyIntent(message)
   └─ generateResponse(input)

notification.activities.ts
   ├─ notifyCustomer(userId, message)
   ├─ notifyRestaurant(restaurantId, message)
   └─ sendEmail(to, subject, body)

payment.activities.ts
   ├─ processPayment(paymentDetails)
   ├─ refundPayment(paymentId)
   └─ validatePayment(paymentDetails)
```

### 4.5 Worker Configuration

```typescript
// Worker setup
const worker = await Worker.create({
  workflowsPath: require.resolve('../workflows'),
  activities,
  taskQueue: 'foodbot-main-queue',
  maxConcurrentActivityTaskExecutions: 100,
  maxConcurrentWorkflowTaskExecutions: 50,
});

await worker.run();
```

---

## 5. MCP Orchestrator Architecture

### 5.1 Spring Boot Service Structure

```
services/mcp-orchestrator/src/main/java/com/foodbot/mcp/
├── MCPOrchestratorApplication.java    # Spring Boot entry point
├── controller/                        # REST controllers
│   ├── SearchController.java
│   ├── RestaurantController.java
│   ├── DishController.java
│   ├── FilterController.java
│   └── HealthController.java
├── providers/                         # MCP provider clients
│   ├── MCPProviderClient.java         # Provider interface
│   ├── swiggy/SwiggyMCPClient.java
│   ├── zomato/ZomatoMCPClient.java
│   └── mock/                          # Mock provider with test data
├── search/                            # Elasticsearch services
│   ├── ElasticsearchService.java
│   ├── SearchIndexer.java
│   ├── SearchQueryBuilder.java
│   ├── FacetedSearchService.java
│   └── GeoSearchService.java
├── cache/                             # Redis caching
├── router/                            # Provider routing and failover
├── aggregator/                        # Result aggregation
├── resilience/                        # Circuit breaker, retry
├── indexing/                          # Kafka consumers
├── config/                            # Spring configuration
└── model/                             # Domain models
```

### 5.2 MCP Request Flow

```
External Request (from Temporal workflow)
    │
    ▼
┌─────────────────────┐
│ SearchController    │  1. Receive search request
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Router              │  2. Determine which providers to query
└──────────┬──────────┘     (Swiggy, Zomato, Mock)
           │
           ├─────────────┬─────────────┐
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Provider │  │ Provider │  │ Provider │  3. Query providers in parallel
    │  Swiggy  │  │  Zomato  │  │   Mock   │     (Circuit breaker, retry)
    └────┬─────┘  └────┬─────┘  └────┬─────┘
         │             │             │
         └─────────────┴─────────────┘
                       │
                       ▼
           ┌─────────────────────┐
           │   Aggregator        │  4. Aggregate results
           └──────────┬──────────┘     - Merge data
                      │                - Deduplicate
                      │                - Rank
                      ▼
           ┌─────────────────────┐
           │ Elasticsearch       │  5. Index aggregated results
           └──────────┬──────────┘     (for future queries)
                      │
                      ▼
           ┌─────────────────────┐
           │   Cache (Redis)     │  6. Cache results
           └──────────┬──────────┘     TTL: 30 minutes
                      │
                      ▼
           ┌─────────────────────┐
           │   Response          │  7. Return to caller
           └─────────────────────┘
```

---

## 6. Mobile Architecture

### 6.1 React Native App Structure

```
apps/mobile-app/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ChatBubble.tsx
│   │   └── RestaurantCard.tsx
│   ├── navigation/          # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/             # Full-page screen components
│   │   ├── ChatScreen.tsx
│   │   ├── LoginScreen.tsx
│   │   ├── OAuthCallbackScreen.tsx
│   │   └── RestaurantSearchScreen.tsx
│   ├── services/            # Business logic and API clients
│   │   ├── api/
│   │   │   └── GatewayClient.ts
│   │   └── auth/
│   │       └── OAuthService.ts
│   ├── store/               # Redux state management
│   │   ├── index.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       └── chatSlice.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   └── utils/               # Utility functions
│       └── logger.ts
├── android/                 # Android native code
├── ios/                     # iOS native code
├── App.tsx                  # Root component
└── index.js                 # Entry point
```

### 6.2 Mobile App Data Flow

```
User Interaction (e.g., Send Message)
    │
    ▼
Screen Component (ChatScreen)
    │
    ├─ dispatch(sendMessage(text))
    │
    ▼
Redux Thunk
    │
    ├─ API call via GatewayClient
    │  gatewayClient.sendMessage(text)
    │       │
    │       ▼
    │  HTTP request with auth header
    │  POST /chat/messages
    │       │
    │       ▼
    │  Gateway API
    │       │
    │       ▼
    │  Response
    │
    ▼
Redux state update
    │
    ├─ sendMessage.pending → loading = true
    ├─ sendMessage.fulfilled → messages = [...messages, newMessage]
    └─ sendMessage.rejected → error = error.message
    │
    ▼
Component re-renders
    │
    └─ Display new message in ChatBubble
```

### 6.3 OAuth Deep Linking

```
OAuth Flow:
1. User taps "Login with Google"
   │
   ▼
2. App opens browser with OAuth URL
   │
   ▼
3. User authenticates in browser
   │
   ▼
4. Provider redirects to foodbot://oauth/callback?code=...
   │
   ▼
5. Deep link handler captures URL
   │
   ▼
6. OAuthCallbackScreen extracts code
   │
   ▼
7. Exchange code for tokens
   POST /auth/oauth/callback
   { provider: 'google', code: '...' }
   │
   ▼
8. Store tokens in Redux + secure storage
   │
   ▼
9. Navigate to home screen
```

---

## 7. CI/CD Architecture

### 7.1 GitHub Actions Pipeline

```
┌────────────────────────────────────────────────────────┐
│                   CI/CD PIPELINE                       │
└────────────────────────────────────────────────────────┘

TRIGGER: Push to main or PR
    │
    ├───────────┬───────────┬───────────┬───────────┐
    ▼           ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│  Lint  │ │Backend │ │Frontend│ │  MCP   │ │ Security │
│  Job   │ │  Test  │ │  Test  │ │  Test  │ │   Scan   │
└───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ └─────┬────┘
    │          │          │          │            │
    └──────────┴──────────┴──────────┴────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Build All Services   │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Upload Artifacts     │
            └────────────┬───────────┘
                         │
    ┌────────────────────┴────────────────────┐
    │                                         │
    ▼                                         ▼
┌─────────┐                              ┌────────┐
│ E2E Test│ (main branch only)           │ Deploy │ (main branch only)
└─────────┘                              └────┬───┘
                                              │
                                              ▼
                                   ┌──────────────────┐
                                   │   AWS EC2        │
                                   │   Deployment     │
                                   └──────────────────┘
```

### 7.2 Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                 EC2 DEPLOYMENT STRUCTURE                │
└────────────────────────────────────────────────────────┘

/home/ubuntu/foodbot/
├── current → releases/YYYYMMDD_HHMMSS/deploy-package  (symlink)
├── releases/
│   ├── 20260219_143022/
│   │   └── deploy-package/
│   │       ├── backend/
│   │       ├── frontend/
│   │       └── mcp/
│   ├── 20260219_145530/  (current release)
│   │   └── deploy-package/
│   │       ├── backend/
│   │       ├── frontend/
│   │       └── mcp/
│   └── 20260219_150102/
│       └── deploy-package/
├── shared/
│   ├── logs/
│   │   ├── backend.log
│   │   ├── frontend.log
│   │   └── mcp.log
│   └── .env  (environment variables)
└── scripts/
    ├── deploy.sh
    ├── rollback.sh
    └── health-check.sh

Systemd Services:
- foodbot-backend.service → /home/ubuntu/foodbot/current/backend
- foodbot-frontend.service → /home/ubuntu/foodbot/current/frontend
- foodbot-mcp.service → /home/ubuntu/foodbot/current/mcp

Nginx:
- Reverse proxy for frontend (port 80 → 3001)
- Reverse proxy for backend (port 80/api → 3000)
- Reverse proxy for MCP (port 80/mcp → 8080)
```

---

## 8. Infrastructure Architecture

### 8.1 Docker Compose Services

```
┌────────────────────────────────────────────────────────┐
│               DOCKER COMPOSE SERVICES                  │
└────────────────────────────────────────────────────────┘

Application Stack:
- foodbot-app-db (PostgreSQL 15)
  Port: 5433
  Data: volume mounted

- foodbot-redis (Redis 7)
  Port: 6379
  Password: foodbot-redis-password

- redis-commander (Redis UI)
  Port: 8081

Workflow Stack:
- foodbot-temporal-db (PostgreSQL 15)
  Port: 5432

- foodbot-temporal (Temporal Server)
  Port: 7233

- foodbot-temporal-ui (Temporal Web UI)
  Port: 8080

Event Streaming Stack:
- foodbot-zookeeper (ZooKeeper)
  Port: 2181

- foodbot-kafka (Kafka)
  Port: 9092
  Topics: order.created, order.updated, payment.processed, etc.

- foodbot-kafka-init (Topic Initialization)
  One-time initialization container

- foodbot-kafka-ui (Kafka UI)
  Port: 8082

Search Stack:
- foodbot-elasticsearch (Elasticsearch 8)
  Port: 9200
  Indices: restaurants, dishes

- foodbot-kibana (Kibana)
  Port: 5601
```

### 8.2 Service Dependencies

```
Gateway API depends on:
  - PostgreSQL (foodbot-app-db)
  - Redis (foodbot-redis)
  - Temporal Server (for workflow triggering)

Temporal Workers depend on:
  - Temporal Server (foodbot-temporal)
  - Gateway API (for activity calls)
  - MCP Orchestrator (for search activities)

MCP Orchestrator depends on:
  - Elasticsearch (foodbot-elasticsearch)
  - Kafka (foodbot-kafka)

Customer App depends on:
  - Gateway API

Mobile App depends on:
  - Gateway API
```

---

## 9. Monitoring Architecture

### 9.1 Monitoring Stack

```
┌────────────────────────────────────────────────────────┐
│             MONITORING & OBSERVABILITY                 │
└────────────────────────────────────────────────────────┘

Application Layer:
  Gateway API → Pino Logger → Structured JSON logs
       │
       ├─ Metrics endpoint (/metrics)
       ├─ Health endpoint (/health, /health/live, /health/ready)
       └─ Sentry integration (errors + APM)

Metrics Collection:
  Prometheus (port 9090)
       │
       ├─ Scrapes /metrics endpoints
       ├─ Stores time-series metrics
       └─ Feeds data to Grafana

Visualization:
  Grafana (port 3030)
       │
       ├─ Reads from Prometheus
       ├─ Pre-configured dashboards
       └─ Alerting rules

Log Aggregation:
  Loki
       │
       ├─ Collects logs from applications
       └─ Queryable via Grafana

Error Tracking:
  Sentry
       │
       ├─ Automatic error capture
       ├─ Error context and breadcrumbs
       └─ Performance monitoring (APM)

Alerting:
  AlertManager (port 9093)
       │
       ├─ Receives alerts from Prometheus
       ├─ Routes alerts (email, Slack, PagerDuty)
       └─ Alert deduplication
```

### 9.2 Health Check Architecture

```
Load Balancer / Kubernetes
    │
    ├─ Liveness Probe → GET /health/live
    │   Returns 200 if process is alive
    │
    └─ Readiness Probe → GET /health/ready
        Returns 200 if service is ready to accept traffic
        Checks:
          ├─ Database connection
          ├─ Redis connection
          └─ Critical dependencies

Monitoring System (Prometheus)
    │
    └─ Health Check → GET /health
        Returns 200 if service is healthy
        Includes detailed status:
          ├─ Database: up/down
          ├─ Redis: up/down
          ├─ Temporal: up/down
          └─ External APIs: up/down

Application Metrics:
  /metrics endpoint exposes:
    ├─ HTTP request duration
    ├─ HTTP request count
    ├─ Active connections
    ├─ Database query duration
    ├─ Cache hit/miss rate
    └─ Custom business metrics
```

---

## Summary

This document provides a comprehensive extraction of architecture details from all guide documents, covering:

- **System Architecture**: High-level overview, tech stack, monorepo structure
- **Backend**: NestJS modules, request flow, authentication, database, caching
- **Frontend**: React components, Redux state, data flow, API client
- **Workflows**: Temporal architecture, task queues, saga pattern, activities
- **MCP Orchestrator**: Spring Boot service, provider routing, search indexing
- **Mobile**: React Native structure, data flow, OAuth deep linking
- **CI/CD**: GitHub Actions pipeline, deployment architecture, rollback
- **Infrastructure**: Docker Compose services, dependencies
- **Monitoring**: Monitoring stack, health checks, metrics, logging

**Total Architectural Components Documented**: 100+
