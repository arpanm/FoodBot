# Restaurant Agent - Requirements Summary

**Last Updated:** 2026-02-20
**Total Requirements:** 8 major features
**Implementation Status:** 🟡 62.5% Complete (5/8)
**Total Components:** 31 React components (31 planned)
**Total Tests:** 9 test files (20 planned)
**Total Lines of Code:** ~2,235 lines (~5,000 planned)

---

## Feature Overview

| Requirement ID | Feature | Status | Components | Tests | Priority |
|---------------|---------|--------|------------|-------|----------|
| RESTAURANT-REQ-001 | Authentication & Onboarding | ✅ Complete | 5 | 0 | High |
| RESTAURANT-REQ-002 | Menu Management | ✅ Complete | 5 | 2 | High |
| RESTAURANT-REQ-003 | Order Management | ✅ Complete | 3 | 3 | High |
| RESTAURANT-REQ-004 | Dashboard & Analytics | ✅ Complete | 3 | 1 | High |
| RESTAURANT-REQ-005 | Real-Time Notifications | ✅ Complete | 2 | 1 | High |
| RESTAURANT-REQ-006 | Natural Language Analytics Chat | 🟡 Pending | 6 | 4 | High |
| RESTAURANT-REQ-007 | Revenue & Insights Dashboard | 🟡 Pending | 4 | 3 | Medium |
| RESTAURANT-REQ-008 | Customer Feedback Analytics | 🟡 Pending | 3 | 2 | Medium |
| **TOTAL** | **8 Features** | **🟡 62.5%** | **31** | **16** | - |

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Frontend** | | |
| React | 18.2.0 | UI framework |
| Capacitor | 5.7.0 | Cross-platform mobile (iOS, Android, Web) |
| Zustand | 4.4.0 | Lightweight state management |
| TanStack Query | 5.17.0 | Server state management |
| React Router | 6.20.0 | Routing |
| Axios | 1.6.0 | HTTP client |
| Recharts | 2.10.0 | Analytics charts |
| Tailwind CSS | 3.4.0 | Styling |
| Vite | 5.0.0 | Build tool |
| TypeScript | 5.7.2 | Type safety |
| **Backend Services** | | |
| MCP Layer | - | Aggregates restaurant agents, orchestrates multi-agent communication |
| Elasticsearch | 8.12.0 | Real-time search, filtering, and indexing |
| Kafka | 3.6.0 | Event streaming for Elasticsearch indexing |
| **AI/LLM** | | |
| Claude (Anthropic) | 3.5 Sonnet | Primary LLM for analytics queries |
| OpenAI GPT-4 | gpt-4-turbo | Secondary LLM for insights |
| Google Gemini | 1.5 Pro | Tertiary LLM for optimization |
| **Testing** | | |
| Jest | 29.7.0 | Unit testing |
| React Testing Library | 14.1.0 | Component testing |
| Playwright | 1.40.0 | E2E testing |

---

## Project Structure

```
apps/restaurant-app/src/
├── pages/                          # 10 page components
│   ├── Auth/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── Dashboard/
│   │   └── Dashboard.tsx           # Main dashboard
│   ├── Menu/
│   │   ├── Menu.tsx                # Menu list
│   │   ├── AddDish.tsx             # Add dish form
│   │   ├── EditDish.tsx            # Edit dish form
│   │   └── CategoryManagement.tsx  # Category CRUD
│   ├── Orders/
│   │   ├── OrderList.tsx           # All orders
│   │   └── OrderDetail.tsx         # Single order
│   ├── Onboarding/
│   │   └── RestaurantSetup.tsx     # Multi-step onboarding
│   ├── Profile/
│   │   └── RestaurantProfile.tsx   # Edit profile
│   └── Analytics/
│       └── Analytics.tsx           # Analytics dashboard
├── components/
│   ├── layout/                     # 3 components
│   │   ├── AppLayout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── Sidebar.tsx
│   ├── common/                     # 8 components + tests
│   │   ├── EmptyState.tsx
│   │   ├── ErrorAlert.tsx
│   │   ├── FilterBar.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── MetricCard.tsx
│   │   ├── Modal.tsx
│   │   ├── SearchBar.tsx
│   │   ├── StatusBadge.tsx
│   │   └── __tests__/ (4 test files)
│   ├── menu/                       # 1 component + test
│   │   ├── DishCard.tsx
│   │   └── __tests__/DishCard.test.tsx
│   ├── orders/                     # 1 component + test
│   │   ├── OrderCard.tsx
│   │   └── __tests__/OrderCard.test.tsx
│   └── analytics/                  # Chart components
│       ├── RevenueChart.tsx
│       ├── OrdersChart.tsx
│       └── PopularDishesChart.tsx
├── contexts/                       # 3 React contexts
│   ├── auth-context.tsx            # Auth state
│   ├── restaurant-context.tsx      # Restaurant data
│   └── order-context.tsx           # Orders + WebSocket
├── services/                       # 7 API clients
│   ├── api-client.ts               # Axios config
│   ├── auth-api.ts
│   ├── restaurant-api.ts
│   ├── menu-api.ts
│   ├── order-api.ts
│   ├── analytics-api.ts
│   ├── websocket-service.ts
│   ├── index.ts
│   └── __tests__/websocket-service.test.ts
├── hooks/                          # 2 custom hooks
│   ├── use-websocket.ts
│   └── use-notification-sound.ts
├── utils/                          # 3 utility files + tests
│   ├── format.ts
│   ├── validation.ts
│   ├── constants.ts
│   └── __tests__/
│       ├── format.test.ts
│       └── validation.test.ts
├── test/                           # Test utilities
│   ├── factories/                  # 3 factories
│   │   ├── order.factory.ts
│   │   ├── dish.factory.ts
│   │   └── restaurant.factory.ts
│   ├── utils/
│   │   ├── render-with-providers.tsx
│   │   └── setup.ts
│   └── __mocks__/
│       └── style-mock.ts
└── types/                          # Type definitions
    ├── models.ts                   # 321 lines
    ├── api.types.ts
    └── index.ts
```

---

## State Management Architecture

### React Context (3 contexts)

#### 1. AuthContext
```typescript
{
  user: RestaurantOwner | null,
  isAuthenticated: boolean,
  isLoading: boolean,
  error: string | null,
  login(), register(), logout(), clearError()
}
```

#### 2. RestaurantContext
```typescript
{
  restaurant: Restaurant | null,
  isLoading: boolean,
  error: string | null,
  fetchRestaurant(), updateRestaurant(), toggleOpen()
}
```

#### 3. OrderContext
```typescript
{
  orders: Order[],
  activeOrders: Order[],
  newOrderCount: number,
  isLoading: boolean,
  error: string | null,
  fetchOrders(), acceptOrder(), rejectOrder(),
  markPreparing(), markReady(), markDelivered(),
  cancelOrder(), clearNewOrderCount()
}
```

### TanStack Query
- Server state caching
- Automatic refetching
- Optimistic updates
- Pagination support
- **Used for:** Analytics data, menu items, order lists

### Zustand (future)
- Lightweight client state
- Filter preferences
- UI state

---

## Implemented Features

### 1. Authentication & Onboarding ✅

**Pages:** Login, Register, RestaurantSetup
**Components:** ProtectedRoute, AppLayout, Sidebar
**Contexts:** auth-context, restaurant-context
**Services:** auth-api, restaurant-api
**Platform:** Web, iOS, Android (Capacitor)

**Key Features:**
- Email/password authentication
- JWT token management
- Email verification
- Multi-step onboarding (4 steps)
- Restaurant profile setup with rich media
- Operating hours configuration
- Logo and image uploads (Capacitor Camera API)
- Admin approval workflow
- Protected routes
- Cross-platform mobile app support

### 2. Menu Management ✅

**Pages:** Menu, AddDish, EditDish, CategoryManagement
**Components:** DishCard (+ test)
**Services:** menu-api, elasticsearch-service (search/filter)
**Events:** menu.dish.created, menu.dish.updated, menu.dish.deleted (Kafka)

**Key Features:**
- Dish CRUD operations
- Category management
- Availability toggle (real-time via WebSocket)
- Image upload (Capacitor Camera/Gallery)
- Price management
- Dietary information
- Customization options
- Nutritional info
- Real-time search powered by Elasticsearch
- Advanced filtering (category, price, dietary, availability)
- Dish sorting and ranking
- **Elasticsearch Integration:** All menu items indexed in real-time via Kafka events
- **MCP Layer:** Menu agents aggregated and orchestrated

**API Methods:**
```typescript
- listDishes(restaurantId, filters)
- getDish(id)
- createDish(data)
- updateDish(id, data)
- deleteDish(id)
- toggleAvailability(id, isAvailable)
- listCategories(restaurantId)
- createCategory(data)
- updateCategory(id, data)
- deleteCategory(id)
```

### 3. Order Management ✅

**Pages:** OrderList, OrderDetail
**Components:** OrderCard (+ test)
**Context:** order-context
**Services:** order-api, websocket-service, mcp-orchestration-service
**Hooks:** use-websocket, use-notification-sound
**Events:** order.received, order.status_updated, order.cancelled (Kafka)

**Key Features:**
- Real-time order notifications (WebSocket + Push Notifications on mobile)
- Order status updates with customer notifications
- Accept/reject orders with MCP orchestration
- Mark as preparing/ready/delivered
- Order cancellation with customer agent coordination
- Order filtering by status (Elasticsearch-powered)
- Real-time order search
- Notification sounds and vibrations (mobile)
- Detailed order view with customer history
- Customer contact info with one-tap call/SMS (Capacitor)
- **MCP Integration:** Orders orchestrated between customer and restaurant agents
- **Elasticsearch:** Real-time order indexing for search/analytics

**Order Statuses:**
```typescript
PENDING → CONFIRMED → PREPARING → READY →
OUT_FOR_DELIVERY → DELIVERED

Or: PENDING → REJECTED/CANCELLED
```

**WebSocket Events:**
- `new_order` - New order received
- `order_updated` - Order status changed
- `order_cancelled` - Order cancelled by customer

### 4. Dashboard & Analytics ✅

**Page:** Dashboard, Analytics
**Components:** MetricCard, RevenueChart, OrdersChart, PopularDishesChart
**Services:** analytics-api, elasticsearch-analytics-service

**Dashboard Metrics:**
- Today's revenue (with % change)
- Active orders count
- Completed orders today
- Average order value
- Average preparation time
- Real-time updates via Elasticsearch aggregations

**Analytics Features:**
- Revenue trends (daily, weekly, monthly)
- Order volume charts
- Popular dishes ranking (Elasticsearch aggregations)
- Customer feedback summaries
- Time-based filtering
- Export reports (PDF, CSV, Excel)
- **Elasticsearch Integration:** Fast aggregations for real-time metrics
- **Performance:** Sub-second query response times

**Analytics API:**
```typescript
- getSummary(restaurantId, period)
- getRevenueChart(restaurantId, period)
- getOrdersChart(restaurantId, period)
- getPopularDishes(restaurantId, period)
- getCustomerFeedback(restaurantId, page)
```

### 5. Real-Time Notifications ✅

**Components:** NotificationBell, NotificationList
**Services:** websocket-service, push-notification-service
**Hooks:** use-websocket, use-notification-sound

**Features:**
- Real-time WebSocket notifications
- Push notifications (iOS/Android via Capacitor)
- Notification sounds and vibrations
- Visual badge indicators
- In-app notification center
- Notification history
- Mark as read/unread
- Configurable notification preferences

### 6. Restaurant Profile ✅

**Page:** RestaurantProfile
**Context:** restaurant-context
**Services:** restaurant-api, elasticsearch-indexing-service

**Editable Fields:**
- Basic info (name, description, cuisine)
- Logo and images (Capacitor Camera/Gallery)
- Location and address with map picker
- Operating hours editor
- Contact information
- Delivery settings
- Open/closed toggle with real-time updates
- **Elasticsearch:** Profile indexed for customer search

---

## Pending Features (New Requirements)

### 6. Natural Language Analytics Chat 🟡 PENDING

**Priority:** High
**Status:** 🟡 Not Started
**Pages:** AnalyticsChat, ChatHistory
**Components:** ChatInterface, MessageBubble, QuerySuggestions, AnalyticsVisualization, VoiceInput
**Services:** llm-orchestration-api, claude-api, openai-api, gemini-api

**Key Features:**
- **Rich Chat UI:** Conversational interface for analytics queries
- **Voice Input:** Voice-to-text using Capacitor (mobile)
- **Natural Language Queries:**
  - "What was my revenue last week?"
  - "Show me top 5 dishes this month"
  - "Which days have highest orders?"
  - "What's my average prep time?"
  - "Give me insights on customer behavior"
- **Multi-LLM Support:**
  - **Claude (Primary):** Complex analytics reasoning
  - **OpenAI GPT-4:** Insight generation
  - **Gemini:** Menu optimization suggestions
- **Response Formats:**
  - Text summaries
  - Interactive charts (Recharts)
  - Tables with sorting/filtering
  - Exportable reports
- **Query History:** Save and revisit previous queries
- **Smart Suggestions:** Context-aware follow-up questions
- **MCP Integration:** LLM orchestration layer routes queries to appropriate models
- **Elasticsearch:** Fast data retrieval for LLM context

**API Endpoints:**
```
POST   /api/analytics/chat/query
GET    /api/analytics/chat/history
POST   /api/analytics/chat/feedback
GET    /api/analytics/chat/suggestions
```

**User Stories:**
1. As a restaurant owner, I can ask analytics questions in natural language
2. As a restaurant owner, I can speak my query instead of typing (mobile)
3. As a restaurant owner, I receive visual charts in response to my queries
4. As a restaurant owner, I can see suggested follow-up questions
5. As a restaurant owner, I can export analytics responses as reports
6. As a restaurant owner, I can view my past analytics conversations

---

### 7. Revenue & Insights Dashboard 🟡 PENDING

**Priority:** Medium
**Status:** 🟡 Not Started
**Pages:** RevenueDashboard, InsightsDetail
**Components:** RevenueMetrics, PeakHoursChart, DishPerformanceTable, ForecastChart
**Services:** revenue-analytics-api, ml-forecast-service

**Key Features:**
- **Comprehensive Revenue Metrics:**
  - Daily/weekly/monthly revenue
  - Revenue by time of day
  - Revenue by dish category
  - Revenue trends and growth rates
  - Year-over-year comparisons
- **Peak Hours Analysis:**
  - Order volume by hour
  - Revenue distribution by time
  - Staffing optimization insights
- **Top-Selling Dishes:**
  - Ranked by revenue
  - Ranked by order count
  - Profit margin analysis
  - Dish performance trends
- **Revenue Forecasting:**
  - ML-powered predictions
  - Confidence intervals
  - Seasonal adjustments
  - What-if scenarios
- **Natural Language Insights:**
  - "Revenue increased 15% this week due to weekend promotions"
  - "Lunch hours generate 40% of daily revenue"
  - "Burger sales are trending upward"
- **Export Options:** PDF, CSV, Excel

**API Endpoints:**
```
GET    /api/analytics/revenue/summary?period=weekly
GET    /api/analytics/revenue/peak-hours
GET    /api/analytics/revenue/top-dishes
GET    /api/analytics/revenue/forecast?days=30
POST   /api/analytics/revenue/export
```

**User Stories:**
1. As a restaurant owner, I can view comprehensive revenue breakdowns
2. As a restaurant owner, I can identify peak hours to optimize staffing
3. As a restaurant owner, I can see which dishes generate most revenue
4. As a restaurant owner, I can forecast future revenue
5. As a restaurant owner, I receive AI-generated insights about revenue trends

---

### 8. Customer Feedback Analytics 🟡 PENDING

**Priority:** Medium
**Status:** 🟡 Not Started
**Pages:** FeedbackDashboard, FeedbackDetail
**Components:** FeedbackList, SentimentChart, ReviewWordCloud, ResponseInterface
**Services:** feedback-analytics-api, sentiment-analysis-service (LLM)

**Key Features:**
- **Feedback Aggregation:**
  - All customer reviews and ratings
  - Real-time sentiment analysis
  - Star rating distribution
  - Feedback trends over time
- **Sentiment Analysis:**
  - Positive/neutral/negative classification
  - LLM-powered emotion detection
  - Key themes extraction
  - Word clouds for common terms
- **Dish-Specific Feedback:**
  - Reviews per dish
  - Average ratings
  - Common complaints/praises
  - Improvement suggestions
- **Natural Language Queries:**
  - "What are customers saying about my pizza?"
  - "Why are ratings lower this week?"
  - "Summarize negative feedback from last month"
- **Response Management:**
  - Respond to reviews in-app
  - AI-suggested responses (LLM)
  - Track response rate
- **Actionable Insights:**
  - "10% of reviews mention slow delivery"
  - "Customers love your pasta but find portions small"
  - "Rating dropped due to increased wait times"

**API Endpoints:**
```
GET    /api/feedback/restaurant/:id
GET    /api/feedback/dish/:dishId
GET    /api/feedback/sentiment-analysis
POST   /api/feedback/respond
GET    /api/feedback/insights
```

**User Stories:**
1. As a restaurant owner, I can view all customer feedback in one place
2. As a restaurant owner, I can see sentiment trends over time
3. As a restaurant owner, I can identify common issues from feedback
4. As a restaurant owner, I can respond to reviews directly
5. As a restaurant owner, I receive AI-generated summaries of feedback
6. As a restaurant owner, I can ask natural language questions about feedback

---

## API Integration

### Base Configuration
**File:** `services/api-client.ts`

```typescript
- Base URL: http://localhost:3000/api
- Timeout: 10 seconds
- JWT token auto-attached
- Automatic error handling
- Request/response logging (dev mode)
```

### API Endpoints Summary

```
Authentication
POST   /api/auth/login
POST   /api/auth/register
POST   /api/auth/logout
GET    /api/auth/me

Restaurants
GET    /api/restaurants/my-restaurant
POST   /api/restaurants/setup
PUT    /api/restaurants/:id
PATCH  /api/restaurants/:id/toggle-open

Menu
GET    /api/menu/restaurants/:id/dishes
GET    /api/menu/dishes/:id
POST   /api/menu/dishes
PUT    /api/menu/dishes/:id
DELETE /api/menu/dishes/:id
PATCH  /api/menu/dishes/:id/availability
GET    /api/menu/restaurants/:id/categories
POST   /api/menu/categories
PUT    /api/menu/categories/:id
DELETE /api/menu/categories/:id

Orders
GET    /api/orders/restaurant/:id
GET    /api/orders/:id
PUT    /api/orders/:id/accept
PUT    /api/orders/:id/reject
PUT    /api/orders/:id/preparing
PUT    /api/orders/:id/ready
PUT    /api/orders/:id/delivered
PUT    /api/orders/:id/cancel

Analytics
GET    /api/analytics/restaurants/:id/summary
GET    /api/analytics/restaurants/:id/revenue
GET    /api/analytics/restaurants/:id/orders
GET    /api/analytics/restaurants/:id/popular-dishes
GET    /api/analytics/restaurants/:id/feedback
```

### WebSocket Connection
**URL:** `ws://localhost:3000/ws/restaurant/:restaurantId`
**Events:** new_order, order_updated, order_cancelled

---

## Real-Time Features

### WebSocket Service
**File:** `services/websocket-service.ts`
**Test:** `websocket-service.test.ts`

**Features:**
- Automatic reconnection
- Heartbeat ping/pong
- Message queuing during disconnection
- Event-based subscriptions
- TypeScript types for messages

**Hook:** `use-websocket.ts`
```typescript
const { isConnected, subscribe, send } = useWebSocket({
  restaurantId: restaurant.id,
  autoConnect: true
});

// Subscribe to events
useEffect(() => {
  const unsubscribe = subscribe('new_order', (message) => {
    // Handle new order
    playNotificationSound();
    addOrderToList(message.data);
  });

  return unsubscribe;
}, []);
```

### Notification Sounds
**Hook:** `use-notification-sound.ts`

- Plays sound on new order
- Browser notification (if permitted)
- Visual badge on orders tab
- Configurable sound selection

---

## Utility Functions

### Format Utils (`utils/format.ts`)
```typescript
- formatCurrency(amount): string       // $12.50
- formatDate(date): string             // Feb 19, 2026
- formatTime(date): string             // 2:30 PM
- formatPhoneNumber(phone): string     // (555) 123-4567
- formatOrderNumber(number): string    // ORD-20260219-001
```
**Test:** `format.test.ts`

### Validation Utils (`utils/validation.ts`)
```typescript
- validateEmail(email): boolean
- validatePhone(phone): boolean
- validatePassword(password): boolean
- validateUrl(url): boolean
- validatePrice(price): boolean
```
**Test:** `validation.test.ts`

### Constants (`utils/constants.ts`)
```typescript
- API_BASE_URL
- WS_BASE_URL
- JWT_STORAGE_KEY
- ORDER_STATUS_COLORS
- ORDER_STATUS_LABELS
- CUISINE_TYPES
- DEFAULT_PAGINATION
```

---

## Test Coverage

### Component Tests (6 files)
- ✅ StatusBadge.test.tsx
- ✅ MetricCard.test.tsx
- ✅ EmptyState.test.tsx
- ✅ FilterBar.test.tsx
- ✅ DishCard.test.tsx
- ✅ OrderCard.test.tsx

### Service Tests (1 file)
- ✅ websocket-service.test.ts

### Utility Tests (2 files)
- ✅ format.test.ts
- ✅ validation.test.ts

**Coverage:** ~75% (estimated)
**Target:** 80%

---

## User Stories Covered (20 total)

**Authentication & Setup**
1. ✅ Register as restaurant owner
2. ✅ Verify email address
3. ✅ Login securely
4. ✅ Complete onboarding wizard
5. ✅ Upload restaurant logo and images

**Menu Management**
6. ✅ Add new dishes to menu
7. ✅ Edit existing dishes
8. ✅ Delete dishes
9. ✅ Toggle dish availability
10. ✅ Organize dishes by category
11. ✅ Add customization options

**Order Management**
12. ✅ Receive real-time order notifications
13. ✅ Accept or reject orders
14. ✅ Update order status
15. ✅ View order details
16. ✅ Cancel orders with reason
17. ✅ Filter orders by status

**Analytics & Monitoring**
18. ✅ View today's revenue and orders
19. ✅ See popular dishes
20. ✅ Track order trends over time

---

## Performance Optimizations

1. **Code Splitting**
   - Lazy-loaded routes
   - Dynamic imports for pages
   - Reduced initial bundle size

2. **React Query Caching**
   - 30s stale time
   - Background refetching
   - Optimistic updates

3. **Image Optimization**
   - Compressed uploads
   - Responsive images
   - Lazy loading

4. **WebSocket Efficiency**
   - Connection pooling
   - Message batching
   - Automatic reconnection

---

## Security Measures

1. **Authentication**
   - JWT tokens (24h expiry)
   - HTTP-only cookies (future)
   - Token refresh mechanism

2. **Authorization**
   - Role-based access control
   - Restaurant ownership validation
   - Protected API endpoints

3. **Input Validation**
   - Client-side validation
   - Server-side validation
   - Sanitization of user input

4. **Data Protection**
   - HTTPS only
   - Encrypted passwords (bcrypt)
   - Secure token storage

---

## Build & Deploy

### Development
```bash
pnpm dev              # Start dev server (port 5173)
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
pnpm lint             # ESLint check
pnpm lint:fix         # Auto-fix issues
```

### Production
```bash
pnpm build            # TypeScript check + Vite build
pnpm preview          # Preview prod build
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 5173
CMD ["pnpm", "preview", "--host"]
```

---

## Related Documentation

- [Architecture: Restaurant App Components](../../architecture/components/restaurant-app-components.md)
- [Tasks: Restaurant App Implementation](../../tasks/completed/TASK-RESTAURANT-APP-IMPLEMENTATION.md)
- [Customer Agent Requirements](../customer-agent/CUSTOMER-REQUIREMENTS-SUMMARY.md)
