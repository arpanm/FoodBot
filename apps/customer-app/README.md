# FoodBot Customer App

**Package:** `@foodbot/customer-app`
**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Overview

The Customer App is a React single-page application that provides the primary user interface for the FoodBot platform. It features a conversational AI chat interface for restaurant discovery, a full commerce flow for ordering food, and real-time order tracking.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Redux Toolkit | Global state management |
| React Router 6 | Client-side routing |
| Axios | HTTP client |
| TypeScript 5 | Type safety |
| Jest + React Testing Library | Testing |

## Features

- Natural language chat interface for restaurant discovery
- Restaurant search with filters (cuisine, price range, rating, location)
- Menu browsing with dietary filters
- Cart management (add, update, remove items)
- Order placement with real-time tracking
- Payment processing (card, UPI, wallet)
- Feedback and rating submission
- User profile and address management

## Project Structure

```
src/
  components/
    Cart/                # CartView, CartItem, CartSummary
    Chat/                # ChatWindow, MessageBubble, ChatInput
    Dish/                # DishCard, DishDetail, DishList
    Order/               # OrderCard, OrderDetail, OrderList, OrderTracking
    Restaurant/          # RestaurantCard, RestaurantDetail, RestaurantList
    Search/              # SearchBar, SearchFilters, SearchResults
    Status/              # StatusTracker, StatusStep
  hooks/
    useDebounce.ts       # Debounce input values
    useInfiniteScroll.ts # Infinite scroll pagination
    useJobPolling.ts     # Poll async job status
    useRedux.ts          # Typed Redux hooks
  pages/                 # Page-level components
  services/
    api.ts               # Axios HTTP client configuration
  store/
    index.ts             # Redux store configuration
    slices/              # Redux slices (auth, cart, chat, order, restaurant, search)
  test/
    factories/           # Test data factories
    helpers/             # Test utilities
  types/                 # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 8

### Installation

```bash
# From the monorepo root
pnpm install

# Or install just this package
cd apps/customer-app
pnpm install
```

### Development

```bash
# Start development server (from monorepo root)
pnpm --filter @foodbot/customer-app dev

# Or from this directory
pnpm dev
```

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

## State Management

The app uses Redux Toolkit with the following slices:

| Slice | Purpose |
|-------|---------|
| `auth` | JWT tokens, user profile, login state |
| `cart` | Cart items, totals, restaurant context |
| `chat` | Chat messages, sessions, AI responses |
| `order` | Order history, active orders, tracking |
| `restaurant` | Restaurant list, search results, filters |
| `search` | Search query, filters, results |

## API Integration

All API calls go through the Axios client configured in `services/api.ts`:

- Base URL: `http://localhost:3000` (configurable via environment)
- JWT token automatically attached via interceptor
- Token refresh handled on 401 responses
- Request/response logging in development

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useDebounce` | Debounces search input to reduce API calls |
| `useInfiniteScroll` | Implements infinite scroll for restaurant/dish lists |
| `useJobPolling` | Polls async chat job status until completion |
| `useRedux` | Type-safe `useSelector` and `useDispatch` wrappers |

## Testing Patterns

- Components tested with React Testing Library
- Redux store mocked with `configureStore` from Redux Toolkit
- API calls mocked with Jest
- Test factories generate deterministic data using `@faker-js/faker`
- Coverage threshold: 80% for all metrics

## Related Documentation

- [Frontend Guide](../../docs/FRONTEND_GUIDE.md)
- [API Documentation](../../docs/API_DOCUMENTATION.md)
- [Code Standards](../../docs/CODE_STANDARDS.md)
- [Contributing](../../docs/CONTRIBUTING.md)
