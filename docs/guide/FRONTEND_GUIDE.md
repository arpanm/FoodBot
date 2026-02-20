# FoodBot Frontend Guide

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. Customer App Architecture](#1-customer-app-architecture)
- [2. Restaurant App Architecture](#2-restaurant-app-architecture)
- [3. Component Structure](#3-component-structure)
- [4. State Management](#4-state-management)
- [5. API Integration](#5-api-integration)
- [6. WebSocket Integration](#6-websocket-integration)
- [7. Testing Approach](#7-testing-approach)

---

## 1. Customer App Architecture

**Location:** `apps/customer-app/`
**Framework:** React 18+ with TypeScript
**State Management:** Redux Toolkit
**HTTP Client:** Axios
**Build Tool:** Vite
**Testing:** Jest + React Testing Library

### Directory Structure

```
apps/customer-app/
  src/
    components/
      Cart/           # CartItem, CartList, CartSummary
      Chat/           # ChatInterface, MessageCard, InputField, CTAButton,
                      # DynamicForm, LoadingIndicator
      Dish/           # DishCard, DishDetail, DishList
      Order/          # OrderCard, OrderDetail, OrderList, OrderTracking
      Restaurant/     # RestaurantCard, RestaurantDetail, RestaurantList,
                      # RestaurantSearch, FilterPanel
      Search/         # SearchBar, SearchFilters, SearchResults, LocationSearch
      Status/         # ProgressStepper, StatusTracker
      common/         # Button, Card, ErrorMessage, Input, LoadingSpinner
    hooks/
      useDebounce.ts
      useInfiniteScroll.ts
      useJobPolling.ts
      useRedux.ts
    services/
      account-linking.service.ts
      api/axios.config.ts
      cart.service.ts
      chat.service.ts
      dish.service.ts
      order.service.ts
      restaurant.service.ts
      search.service.ts
      user.service.ts
    store/
      index.ts
      slices/
        accountLinkingSlice.ts
        cartSlice.ts
        chatSlice.ts
        dishSlice.ts
        orderSlice.ts
        restaurantSlice.ts
        userSlice.ts
    test/
      factories/      # dish, message, order, restaurant, user factories
      utils/           # mockStore, renderWithProviders
    types/
      api.types.ts
      common.types.ts
      index.ts
      models.ts
      redux.types.ts
```

### Key Features

- **Conversational UI** -- Chat-based interface using `ChatInterface` component with `MessageCard`, `CTAButton`, and `DynamicForm` for rich interactions.
- **Job-Based Async** -- `useJobPolling` hook polls for workflow results after chat messages trigger backend workflows.
- **Restaurant Discovery** -- `RestaurantSearch` with `FilterPanel` for cuisine, price range, rating, and location filters.
- **Cart Management** -- Full cart flow with `CartItem`, `CartList`, and `CartSummary` components.
- **Order Tracking** -- `OrderTracking` with `ProgressStepper` and `StatusTracker` for real-time status.
- **Performance** -- React.memo on expensive components, debounced search input, infinite scroll for lists.

---

## 2. Restaurant App Architecture

**Location:** `apps/restaurant-app/`
**Status:** Scaffolded (Vite + React + TypeScript configured)

The restaurant app will provide:

- Order management dashboard (accept, reject, update status)
- Menu management (add, edit, remove dishes, toggle availability)
- Analytics and reporting
- AI-powered insights via natural language queries

**Current Configuration:**
- `vite.config.ts` -- Vite build configuration
- `tsconfig.json` -- TypeScript configuration
- `jest.config.cjs` -- Test configuration
- `package.json` -- Dependencies

---

## 3. Component Structure

### Component Conventions

All components follow these conventions:

- **File naming:** PascalCase (e.g., `RestaurantCard.tsx`)
- **Test files:** Co-located in `__tests__/` directories (e.g., `__tests__/RestaurantCard.test.tsx`)
- **Props:** Typed with TypeScript interfaces
- **Memoization:** `React.memo` on components that receive complex props or render frequently

### Component Hierarchy

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

### Common Components

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, disabled, onClick | Styled button with loading state |
| `Card` | title, children, footer | Card container |
| `ErrorMessage` | message, retry | Error display with retry action |
| `Input` | label, value, onChange, error | Form input with validation |
| `LoadingSpinner` | size, message | Loading indicator |

---

## 4. State Management

### Redux Store Configuration

**File:** `apps/customer-app/src/store/index.ts`

The Redux store uses Redux Toolkit with the following slices:

### Slices

| Slice | Key State | Async Thunks |
|-------|-----------|-------------|
| `userSlice` | user, addresses, isAuthenticated | login, register, fetchProfile, fetchAddresses |
| `restaurantSlice` | restaurants, selectedRestaurant, filters | searchRestaurants, fetchRestaurant |
| `dishSlice` | dishes, selectedDish | fetchDishes, fetchDish |
| `cartSlice` | items, total, restaurantId | addToCart, removeFromCart, updateQuantity |
| `orderSlice` | orders, currentOrder, tracking | createOrder, fetchOrders, fetchOrderTracking |
| `chatSlice` | messages, jobId, isLoading | sendMessage, pollJobStatus |
| `accountLinkingSlice` | linkedAccounts, linkingStatus | linkAccount, unlinkAccount |

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useRedux` | Typed `useSelector` and `useDispatch` wrappers |
| `useDebounce` | Debounces a value (used for search input) |
| `useInfiniteScroll` | Triggers load-more when scrolling near bottom |
| `useJobPolling` | Polls a job endpoint until completion or timeout |

---

## 5. API Integration

### Axios Configuration

**File:** `apps/customer-app/src/services/api/axios.config.ts`

- Base URL configurable via environment variable
- Request interceptor: Attaches JWT token from Redux store
- Response interceptor: Handles 401 (redirect to login), 429 (rate limit), network errors
- Retry logic for transient failures

### Service Layer

Each domain has a dedicated service file:

```typescript
// Example: restaurant.service.ts
class RestaurantService {
  async search(query: string, filters: SearchFilters): Promise<Restaurant[]> {
    const response = await api.get('/restaurants/search', { params: { query, ...filters } });
    return response.data;
  }

  async getById(id: string): Promise<Restaurant> {
    const response = await api.get(`/restaurants/${id}`);
    return response.data;
  }

  async getMenu(id: string): Promise<Dish[]> {
    const response = await api.get(`/restaurants/${id}/menu`);
    return response.data;
  }
}
```

---

## 6. WebSocket Integration

WebSocket connections are planned for real-time features:

- **Order Tracking** -- Real-time order status updates
- **Chat** -- Streaming workflow progress updates
- **Notifications** -- In-app notification delivery

The Notification Service already implements a `WebSocketChannel` for pushing real-time updates.

---

## 7. Testing Approach

### Test Setup

- **Test Runner:** Jest with `jest.config.cjs`
- **Test Library:** React Testing Library
- **Mocking:** Jest mocks for services and API calls
- **Test Utils:** `renderWithProviders` wraps components with Redux Provider and mock store

### Test Factories

Located in `apps/customer-app/src/test/factories/`:

| Factory | Generates |
|---------|-----------|
| `dish.factory.ts` | Mock dish objects with random data |
| `message.factory.ts` | Mock chat message objects |
| `order.factory.ts` | Mock order objects |
| `restaurant.factory.ts` | Mock restaurant objects |
| `user.factory.ts` | Mock user objects |

### Test Coverage

Component tests cover:
- Rendering with various prop combinations
- User interactions (click, input, submit)
- Loading and error states
- Redux state changes via dispatch
- API call mocking and response handling

### Running Tests

```bash
cd apps/customer-app
pnpm test                    # Run all tests
pnpm test -- --coverage      # With coverage report
pnpm test -- --watch         # Watch mode
```
