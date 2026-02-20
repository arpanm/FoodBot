# FoodBot - Extracted Requirements from Guide Documents

**Generated**: 2026-02-20
**Source**: All guide documents in `docs/guide/`
**Status**: Comprehensive extraction of implemented features

---

## Table of Contents

- [1. User-Facing Features](#1-user-facing-features)
- [2. Developer Features](#2-developer-features)
- [3. Workflow Features](#3-workflow-features)
- [4. CI/CD Features](#4-cicd-features)
- [5. Monitoring Features](#5-monitoring-features)
- [6. Mobile Features](#6-mobile-features)

---

## 1. User-Facing Features

### 1.1 Authentication & User Management

**Implemented Features**:

- User registration with email verification
- Login with JWT token authentication (15-minute access token)
- Automatic session refresh
- Profile management (view, update name/email/phone)
- Address management (add, edit, remove delivery addresses)
- Account deletion
- Role-based access (customer, restaurant_owner, admin)
- Phone number validation (international format required)
- Password minimum 4 characters

**User Roles**:

| Role | Capabilities |
|------|-------------|
| Customer | Browse restaurants, order food, track deliveries, leave feedback |
| Restaurant Owner | Manage restaurant profile, menus, incoming orders |
| Admin | Manage users, approve restaurants, view platform statistics |

### 1.2 Chat Interface (Primary UI)

**Implemented Features**:

- Conversational AI-powered interface
- Natural language queries for restaurant search
- Rich message types:
  - Text messages
  - Restaurant cards (visual cards with details)
  - Dish cards (with "Add to Cart" buttons)
  - CTA buttons (View Menu, Track Order, etc.)
  - Dynamic forms (delivery address, payment)
  - Loading indicators
  - Error messages with retry option
- Chat message history
- Real-time workflow progress updates

**Example Interactions**:
- "Find me Italian restaurants nearby"
- "Show me vegetarian dishes under $15"
- "I want to order pizza for delivery"
- "What is the status of my last order?"

### 1.3 Restaurant Discovery

**Implemented Features**:

- Restaurant search by:
  - Cuisine type
  - Location (user location, radius)
  - Rating
  - Price range
  - Open/closed status
- Restaurant cards showing:
  - Name and image
  - Cuisine type badges
  - Star rating
  - Price range indicator
  - Distance (when location available)
  - Open/closed status
- Restaurant detail view with:
  - Cover image
  - Description
  - Rating and review count
  - Address and operating hours
  - Full menu organized by categories
  - Filter options for dietary preferences

### 1.4 Menu Browsing

**Implemented Features**:

- Dishes organized by category (Appetizers, Main Course, Desserts, etc.)
- Each dish displays:
  - Name, description, price
  - Dietary information (vegetarian, vegan, gluten-free)
  - Nutritional information
  - Preparation time
- Filters:
  - Vegetarian/vegan options
  - Price range
  - Category
- Dish detail view with:
  - Full description
  - Customization options
  - "Add to Cart" with quantity selector

### 1.5 Cart Management

**Implemented Features**:

- Add items to cart with quantity and special instructions
- View all cart items with quantities and prices
- Update item quantities
- Remove individual items
- Clear entire cart
- Cart total calculation
- Special instructions per item (e.g., "extra cheese", "no onions")

### 1.6 Order Placement

**Implemented Features**:

- Cart validation before checkout
- Delivery address confirmation
- Payment method selection (card, UPI, wallet)
- Special delivery instructions
- Item availability checking
- Payment processing with 3DS support
- Order confirmation with:
  - Order ID for tracking
  - Estimated delivery time
  - Order summary

### 1.7 Order Tracking

**Implemented Features**:

- Real-time order status tracking
- Visual progress stepper:
  - Order Placed
  - Preparing
  - Out for Delivery
  - Delivered
- Current status highlighted
- Estimated delivery time updates
- Order details display (items, total, delivery address)
- Order cancellation (before restaurant confirmation)
- Order history with filter by status

### 1.8 Feedback System

**Implemented Features**:

- Post-delivery feedback form
- Multiple rating categories:
  - Overall rating (1-5 stars)
  - Food quality rating (1-5)
  - Delivery speed rating (1-5)
  - Packaging rating (1-5)
- Written comment (optional)
- Feedback impacts restaurant ratings

### 1.9 Restaurant Owner Features

**Implemented Features**:

**Restaurant Profile Management**:
- Create restaurant profile with:
  - Name and description
  - Cuisine types (Italian, Chinese, Indian, etc.)
  - Address and location coordinates
  - Price range
  - Operating hours
- Restaurant approval workflow (pending → approved/rejected by admin)
- Restaurant appears in search after approval

**Menu Management**:
- Add dishes with:
  - Name, description, price
  - Category
  - Dietary flags (vegetarian, vegan)
  - Preparation time
  - Nutritional information
- Update dish details
- Toggle dish availability on/off
- Delete dishes
- Immediate visibility changes to customers

**Order Management**:
- View incoming orders
- Update order status:
  - pending → confirmed → preparing → ready → delivered
- Real-time status updates visible to customers

### 1.10 Admin Features

**Implemented Features**:

**Restaurant Approval**:
- View pending restaurant applications
- Review restaurant details (name, owner, location, cuisine)
- Approve with optional approval notes
- Reject with rejection reason
- Owner notification of decision

**User Management**:
- List all users with role and status filters
- Search by name or email
- Suspend user with:
  - Reason
  - Duration (days)
  - Prevents platform access
- Reactivate suspended users

**Dashboard**:
- Platform statistics:
  - Total users
  - Total restaurants
  - Total orders
  - Pending restaurant approvals
  - Active users
  - Revenue metrics (today, this week, this month)

### 1.11 Payment Features

**Implemented Features**:

- Payment methods supported:
  - Credit/debit cards
  - UPI
  - Digital wallets
- Card payment with 3D Secure authentication
- Payment processing workflow
- Idempotency protection (prevents double charging)
- Refund support
- Payment validation

---

## 2. Developer Features

### 2.1 Development Environment

**Implemented Features**:

- Monorepo structure with pnpm workspaces
- Three workspace roots:
  - `apps/*` (applications)
  - `services/*` (backend services)
  - `packages/*` (shared libraries)
- VS Code integration with recommended extensions:
  - ESLint
  - Prettier
  - TypeScript Importer
  - Jest Runner
  - EditorConfig
- Docker Compose for infrastructure services
- Health check utilities
- Hot reload for development

### 2.2 Backend Architecture (Gateway API)

**Implemented Features**:

**NestJS Modular Architecture**:
- Modules:
  - auth (authentication, JWT, guards, strategies)
  - restaurant (CRUD operations)
  - dish (menu management)
  - cart (cart operations)
  - order (order management)
  - payment (payment processing)
  - feedback (ratings and reviews)
  - user (profile and addresses)
  - chat (AI chat interface)
  - admin (admin operations)
- Controller → Service → Repository pattern
- DTO validation with class-validator
- Guards for authentication and authorization
- Custom decorators (@Public, @Roles, @CurrentUser)
- Global exception filters

**Authentication System**:
- JWT-based authentication
- JWT access tokens (15-minute expiry)
- Refresh token support
- Token blacklist with Redis
- Rate limiting on login endpoint
- Role-based authorization
- Password hashing with bcrypt
- Email verification workflow

### 2.3 Frontend Architecture (Customer App)

**Implemented Features**:

**React App Structure**:
- React 18+ with TypeScript
- Redux Toolkit for state management
- Axios for HTTP client
- Vite for build tool
- Component organization:
  - Cart/ (CartItem, CartList, CartSummary)
  - Chat/ (ChatInterface, MessageCard, InputField, CTAButton, DynamicForm, LoadingIndicator)
  - Dish/ (DishCard, DishDetail, DishList)
  - Order/ (OrderCard, OrderDetail, OrderList, OrderTracking)
  - Restaurant/ (RestaurantCard, RestaurantDetail, RestaurantList, RestaurantSearch, FilterPanel)
  - Search/ (SearchBar, SearchFilters, SearchResults, LocationSearch)
  - Status/ (ProgressStepper, StatusTracker)
  - common/ (Button, Card, ErrorMessage, Input, LoadingSpinner)

**Custom Hooks**:
- useDebounce (debounced values for search)
- useInfiniteScroll (pagination)
- useJobPolling (poll workflow results)
- useRedux (typed Redux hooks)

**Redux Slices**:
- userSlice (login, register, profile, addresses)
- restaurantSlice (search, fetch)
- dishSlice (fetch dishes)
- cartSlice (add, remove, update)
- orderSlice (create, fetch, tracking)
- chatSlice (send message, poll job)
- accountLinkingSlice (link/unlink accounts)

**API Integration**:
- Axios configuration with interceptors
- Request interceptor (attach JWT token)
- Response interceptor (handle 401, 429, network errors)
- Retry logic for transient failures
- Service layer per domain

### 2.4 Testing Infrastructure

**Implemented Features**:

**Test Types**:
- Unit tests (`.test.ts` / `.test.tsx`) - Jest
- Integration tests (`.spec.ts`) - Jest with NestJS TestingModule
- E2E tests (`.e2e.ts`) - Playwright

**Test Utilities**:
- Test factories (generate realistic test data with Faker)
- Test module factory (pre-configured NestJS test modules)
- Auth helper (generate JWT tokens for tests)
- Mock store (pre-configured Redux store)
- renderWithProviders (wrapped render for React components)

**Coverage Requirements**:
- 80% minimum coverage enforced
- Coverage thresholds for branches, functions, lines, statements
- Pre-push hook blocks pushes below 80%
- CI/CD pipeline fails builds below threshold

### 2.5 Code Quality Tools

**Implemented Features**:

- ESLint with:
  - TypeScript-specific rules
  - Security rules (eslint-plugin-security)
  - Code quality rules (eslint-plugin-sonarjs)
  - Import ordering (eslint-plugin-import)
  - Promise handling (eslint-plugin-promise)
  - React rules (eslint-plugin-react, eslint-plugin-react-hooks)
- Prettier for code formatting
- TypeScript strict mode enabled
- EditorConfig for consistent formatting
- Pre-commit hooks for linting and formatting
- Quality check command (`pnpm quality:check`)

### 2.6 Build & Development Scripts

**Implemented Features**:

**pnpm Scripts**:
- `pnpm install` - Install dependencies
- `pnpm test` / `pnpm test:unit` - Run unit tests
- `pnpm test:integration` - Run integration tests
- `pnpm test:e2e` - Run E2E tests
- `pnpm test:all` - Run all test suites
- `pnpm test:watch` - Watch mode
- `pnpm test:coverage` - Coverage report
- `pnpm lint` / `pnpm lint:fix` - Linting
- `pnpm format` / `pnpm format:check` - Formatting
- `pnpm quality:check` - Full quality check
- `pnpm quality:fix` - Auto-fix quality issues
- `pnpm security:scan` - Snyk security scan
- `pnpm docker:up` / `pnpm docker:down` - Docker control
- `pnpm docker:health` - Infrastructure health check
- `pnpm docker:logs` - View Docker logs
- `pnpm docker:clean` - Clean Docker volumes

### 2.7 Wrapper Script (foodbot)

**Implemented Features**:

A Maven wrapper-style CLI tool providing unified interface for:

**Setup & Installation**:
- `./foodbot setup` - Initial project setup
- `./foodbot install` - Install dependencies
- `./foodbot doctor` - System health check

**Build Commands**:
- `./foodbot build` - Build all projects
- `./foodbot build:ts` - Build TypeScript projects
- `./foodbot build:java` - Build Java projects
- `./foodbot build [PROJECT]` - Build specific project

**Development Commands**:
- `./foodbot dev` - Run all services in dev mode
- `./foodbot dev [PROJECT]` - Run specific project

**Infrastructure Commands**:
- `./foodbot infra:up` - Start Docker services
- `./foodbot infra:down` - Stop Docker services
- `./foodbot infra:logs` - Show logs
- `./foodbot infra:ps` - Show status

**Database Commands**:
- `./foodbot db:setup` - Setup schema
- `./foodbot db:seed` - Seed data
- `./foodbot db:reset` - Reset database
- `./foodbot db:migrate` - Run migrations

**Testing Commands**:
- `./foodbot test` - All tests
- `./foodbot test:unit` - Unit tests
- `./foodbot test:integration` - Integration tests
- `./foodbot test:e2e` - E2E tests
- `./foodbot test:coverage` - Coverage report

**Code Quality Commands**:
- `./foodbot lint` - Lint all
- `./foodbot lint:fix` - Auto-fix
- `./foodbot format` - Check formatting
- `./foodbot format:fix` - Format code
- `./foodbot typecheck` - TypeScript check
- `./foodbot quality` - All quality checks

**Security Commands**:
- `./foodbot security` - Security audit
- `./foodbot security:fix` - Fix vulnerabilities

### 2.8 Infrastructure Services

**Implemented Features**:

- PostgreSQL (port 5433) - Application database
- PostgreSQL (port 5432) - Temporal database
- Redis (port 6379) - Session management and caching
- Redis Commander (port 8081) - Redis UI
- Kafka (port 9092) - Event streaming
- Zookeeper (port 2181) - Kafka coordination
- Kafka UI (port 8082) - Kafka management UI
- Elasticsearch (port 9200) - Search indexing
- Kibana (port 5601) - Elasticsearch UI
- Temporal Server (port 7233) - Workflow orchestration
- Temporal UI (port 8080) - Workflow monitoring

**Health Checks**:
- Automatic health monitoring
- Health check endpoints per service
- Docker healthcheck configurations

### 2.9 Database Management

**Implemented Features**:

- TypeORM for database management
- Automatic table creation from entities (development)
- Entities: Users, Restaurants, Dishes, Orders, OrderItems, Carts, CartItems, Payments, Addresses, Feedback, Workflows
- Migration support
- Seed data support
- Database connection pooling
- Query parameterization (SQL injection prevention)

---

## 3. Workflow Features

### 3.1 Temporal Workflow Infrastructure

**Implemented Features**:

- Temporal Server for durable workflow orchestration
- Temporal UI for workflow monitoring
- Worker management
- Task queues:
  - `foodbot-main-queue` (search, general workflows)
  - `foodbot-orders-queue` (order workflows)
  - `foodbot-payments-queue` (payment workflows)
  - `foodbot-notifications-queue` (notification workflows)
  - `foodbot-onboarding-queue` (onboarding workflows)
- Workflow features:
  - Durable execution (survives restarts)
  - Built-in retries with exponential backoff
  - Saga pattern for distributed transactions
  - Signal handling for external events
  - Full workflow history for debugging

### 3.2 Search Restaurant Workflow

**Implemented Features**:

- Workflow file: `packages/workflows/src/workflows/searchRestaurant.workflow.ts`
- Search restaurants via MCP Orchestrator
- User context enrichment:
  - Load user preferences
  - Load location
  - Load order history
- Apply filters (cuisine, price, rating, location, radius)
- Return ranked results

### 3.3 Place Order Workflow (Saga Pattern)

**Implemented Features**:

- Workflow file: `packages/workflows/src/workflows/placeOrder.workflow.ts`
- Full order placement with compensation logic
- Steps:
  1. Validate cart items
  2. Check inventory availability
  3. Reserve items (compensation: release items)
  4. Process payment (compensation: refund payment)
  5. Create order in database
  6. Update order status to "confirmed"
  7. Notify restaurant
  8. Notify customer
- Automatic compensations on failure (saga pattern):
  - Refund payment
  - Release reserved items
  - Notify customer of failure

### 3.4 Process Payment Workflow

**Implemented Features**:

- Workflow file: `packages/workflows/src/workflows/processPayment.workflow.ts`
- Payment processing with 3DS authentication support
- Steps:
  1. Validate payment details
  2. Charge payment gateway
  3. Handle 3DS redirect if required
  4. Update payment status
- Retry logic for transient failures

### 3.5 Order Fulfillment Workflow (Signal-Based)

**Implemented Features**:

- Workflow file: `packages/workflows/src/workflows/orderFulfillment.workflow.ts`
- Track order through fulfillment stages
- External signals:
  - `orderReadySignal` - Restaurant marks order ready
  - `orderPickedUpSignal` - Delivery partner picks up
  - `orderDeliveredSignal` - Order delivered to customer
- Real-time status updates to customer

### 3.6 User Onboarding Workflow

**Implemented Features**:

- Workflow file: `packages/workflows/src/workflows/userOnboarding.workflow.ts`
- Guide new users through onboarding
- Engagement tracking
- Signals:
  - `orderPlacedSignal` - First order placed

### 3.7 Restaurant Onboarding Workflow

**Implemented Features**:

- Workflow file: `packages/workflows/src/workflows/restaurantOnboarding.workflow.ts`
- Restaurant approval workflow with admin review
- Signals:
  - `emailVerifiedSignal` - Owner verifies email
  - `adminApprovedSignal` - Admin approves restaurant
  - `adminRejectedSignal` - Admin rejects restaurant

### 3.8 Activity Implementations

**Implemented Features**:

Activities organized by domain:
- `database.activities.ts` - createOrder, updateOrderStatus, getUserContext
- `external.activities.ts` - searchRestaurants, checkInventory, reserveItems
- `llm.activities.ts` - enrichQuery, classifyIntent
- `notification.activities.ts` - notifyCustomer, notifyRestaurant
- `payment.activities.ts` - processPayment, refundPayment, validatePayment

### 3.9 Worker Setup

**Implemented Features**:

- Worker manager: `packages/workflows/src/workers/worker.ts` and `worker-manager.ts`
- Configuration:
  - TEMPORAL_ADDRESS (default: localhost:7233)
  - TEMPORAL_NAMESPACE (default: default)
  - WORKER_MAX_CONCURRENT_ACTIVITIES (default: 100)
  - WORKER_MAX_CONCURRENT_WORKFLOWS (default: 50)
- Automatic worker pooling
- Activity execution concurrency control

### 3.10 Workflow Monitoring

**Implemented Features**:

- Temporal Web UI (http://localhost:8080)
- View running, completed, and failed workflows
- Inspect workflow history (step-by-step)
- View activity inputs and outputs
- Terminate or cancel workflows
- Search workflows by ID, type, or status
- CLI tools (tctl):
  - List workflows
  - Describe workflow
  - Send signals
  - Terminate workflows
- Key metrics:
  - temporal_workflow_task_schedule_to_start_latency
  - temporal_activity_schedule_to_start_latency
  - temporal_workflow_completed
  - temporal_workflow_failed

---

## 4. CI/CD Features

### 4.1 CI Workflow (GitHub Actions)

**Implemented Features**:

**Triggers**:
- Push to main or develop branches
- Pull requests targeting main or develop

**Jobs**:
1. **Lint & Type Check** (~2-3 min):
   - ESLint on all code
   - Prettier formatting check
   - TypeScript compilation (no-emit mode)

2. **Backend Tests** (~5-8 min):
   - Spin up PostgreSQL and Redis containers
   - Run unit and integration tests
   - Generate coverage report
   - Upload to Codecov

3. **Frontend Tests** (~3-5 min):
   - Run Jest tests with React Testing Library
   - Generate coverage report
   - Upload to Codecov

4. **MCP Tests** (~3-5 min):
   - Run Maven tests for Spring Boot service

5. **Build Steps** (~5-7 min):
   - Build backend (NestJS)
   - Build frontend (React)
   - Build MCP service (Spring Boot JAR)
   - Upload artifacts

6. **Security Scan** (~2-3 min):
   - npm audit on dependencies
   - Optional Snyk security scan

7. **E2E Tests** (main branch only, ~10-15 min):
   - Playwright end-to-end tests
   - Full stack testing

**Total CI Time**:
- PR/Branch Push: ~15-20 minutes
- Main Branch Push: ~25-35 minutes (includes E2E)

### 4.2 CD Workflow (Deployment to AWS EC2)

**Implemented Features**:

**Triggers**:
- Push to main branch
- Manual workflow dispatch (any branch)

**Deployment Steps**:

1. **Build Phase** (~5-7 min):
   - Setup Node.js, Java
   - Install dependencies
   - Build backend (NestJS)
   - Build frontend (React → static files)
   - Build MCP (Spring Boot → JAR)
   - Create deployment tarball

2. **Transfer Phase** (~1-2 min):
   - Configure AWS credentials
   - Optional upload to S3
   - SCP to EC2 server

3. **Deployment Phase** (~3-5 min):
   - Extract package to releases directory
   - Stop running services
   - Create symlink to new release
   - Install production dependencies
   - Run database migrations
   - Start services (systemd)

4. **Verification Phase** (~1 min):
   - Wait for services to initialize
   - Health checks:
     - Backend: http://localhost:3000/api/v1/health
     - Frontend: http://localhost:3001/
     - MCP: http://localhost:8080/actuator/health
   - Verify via public URL

5. **Rollback on Failure**:
   - Automatic rollback if any check fails
   - Revert symlink to previous release
   - Restart services
   - Verify rollback success

**Total Deployment Time**:
- Successful: ~12-15 minutes
- With Rollback: ~15-18 minutes

### 4.3 Manual Deployment

**Implemented Features**:

- Via GitHub Actions UI:
  - Actions tab → Select workflow → Run workflow
- Via GitHub CLI:
  - `gh workflow run deploy-aws.yml --ref main --field environment=production`

### 4.4 Rollback Features

**Implemented Features**:

**Automatic Rollback**:
- Triggered on build failure
- Triggered on health check failure
- Triggered on service start failure

**Manual Rollback**:
- Via SSH: `./scripts/rollback.sh`
- List releases: `ls -lt /home/ubuntu/foodbot/releases/`
- Manual rollback to specific release supported

### 4.5 Deployment Monitoring

**Implemented Features**:

- GitHub Actions workflow logs
- EC2 systemd service status
- Application logs
- Deployment history tracking
- Current release indicator
- Service health checks

---

## 5. Monitoring Features

### 5.1 Monitoring Stack

**Implemented Features**:

- **Pino Logger** - Structured JSON logging with correlation IDs
- **Prometheus** - Metrics collection and storage
- **Sentry** - Error tracking and APM
- **Grafana** - Visualization and dashboards
- **Loki** - Log aggregation
- **AlertManager** - Alert routing and management

### 5.2 Monitoring Dashboards

**Implemented Features**:

- Grafana UI (http://localhost:3030)
- Prometheus UI (http://localhost:9090)
- AlertManager UI (http://localhost:9093)
- Pre-configured Grafana dashboards

### 5.3 Health Check Endpoints

**Implemented Features**:

- `/health` - Combined health check
- `/health/live` - Liveness probe (K8s)
- `/health/ready` - Readiness probe (K8s)
- `/metrics` - Prometheus metrics endpoint

### 5.4 Logging Features

**Implemented Features**:

- Structured JSON logging
- Correlation IDs for request tracing
- Log levels (error, warn, info, debug)
- Context-aware logging
- Log aggregation with Loki

### 5.5 Error Tracking

**Implemented Features**:

- Sentry integration
- Automatic error capture
- Error context and breadcrumbs
- User feedback capture
- Release tracking
- Performance monitoring (APM)

---

## 6. Mobile Features

### 6.1 Mobile App (React Native)

**Implemented Features**:

**Setup & Configuration**:
- React Native project structure
- TypeScript configuration
- iOS and Android support
- Deep linking configuration (foodbot:// scheme)
- OAuth callback handling

**State Management**:
- Redux Toolkit slices:
  - authSlice (authentication state)
  - chatSlice (chat sessions)
- Typed Redux hooks (useAppDispatch, useAppSelector)
- Async thunk support

**API Integration**:
- GatewayClient for API calls
- Result type pattern for error handling
- Authentication header injection
- Token refresh on 401
- Retry logic

**Components**:
- ChatBubble (message display)
- RestaurantCard (restaurant display)
- Navigation (React Navigation)

**Screens**:
- ChatScreen
- LoginScreen
- OAuthCallbackScreen
- RestaurantSearchScreen

**Testing**:
- Jest configuration
- React Native Testing Library
- Unit tests for components
- Integration tests for API client

### 6.2 OAuth Integration

**Implemented Features**:

- OAuth service for third-party authentication
- Deep linking for OAuth callbacks
- Token storage with secure keychain
- OAuth flow handling

### 6.3 Mobile Development Tools

**Implemented Features**:

- Metro bundler configuration
- Hot reload support
- TypeScript strict mode
- ESLint and Prettier integration
- Test scripts

---

## Summary Statistics

**Total Implemented Features**: 200+

**Feature Categories**:
- User-facing features: 60+
- Developer features: 50+
- Workflow features: 30+
- CI/CD features: 25+
- Monitoring features: 15+
- Mobile features: 20+

**Infrastructure Services**: 11 services (PostgreSQL x2, Redis, Kafka, Zookeeper, Elasticsearch, Kibana, Temporal, Temporal UI, Redis Commander, Kafka UI)

**Test Coverage**: 80% minimum enforced across all projects

**Deployment**: Automated CI/CD with GitHub Actions to AWS EC2

**Monitoring**: Production-grade monitoring with Prometheus, Grafana, Sentry, Loki, AlertManager

---

**This document provides a comprehensive extraction of ALL implemented features documented in the guide files.**
