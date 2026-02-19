# FoodBot Restaurant App

**Package:** `@foodbot/restaurant-app`
**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Overview

The Restaurant App is a React single-page application that provides the management dashboard for restaurant owners on the FoodBot platform. It enables restaurant owners to manage their restaurant profile, menu items, incoming orders, and view analytics.

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Zustand 4 | Lightweight state management |
| TanStack Query 5 | Server state management and caching |
| React Router 6 | Client-side routing |
| Axios | HTTP client |
| Recharts | Data visualization for analytics |
| Tailwind CSS 3 | Utility-first styling |
| Vite 5 | Build tool and dev server |
| TypeScript 5 | Type safety |
| Jest + React Testing Library | Testing |

## Features

- Restaurant profile management and onboarding
- Menu item (dish) CRUD with availability toggling
- Real-time order management with WebSocket notifications
- Analytics dashboard with revenue and order metrics
- Role-based access with protected routes
- Notification sounds for new orders

## Project Structure

```
src/
  components/
    analytics/           # Analytics charts and visualizations
    common/              # Reusable UI components
      EmptyState.tsx     # Empty state placeholder
      ErrorAlert.tsx     # Error display component
      FilterBar.tsx      # Reusable filter controls
      LoadingSpinner.tsx # Loading indicator
      MetricCard.tsx     # Dashboard metric display
      Modal.tsx          # Modal dialog
      SearchBar.tsx      # Search input
      StatusBadge.tsx    # Order status badge
      __tests__/         # Common component tests
    layout/
      AppLayout.tsx      # Main layout wrapper
      ProtectedRoute.tsx # Auth-gated route wrapper
      Sidebar.tsx        # Navigation sidebar
    menu/
      DishCard.tsx       # Menu item card
      __tests__/         # Menu component tests
    orders/
      OrderCard.tsx      # Order display card
      __tests__/         # Order component tests
  contexts/
    auth-context.tsx     # Authentication state
    order-context.tsx    # Order management state
    restaurant-context.tsx # Restaurant profile state
  hooks/
    use-notification-sound.ts  # Audio notifications for orders
    use-websocket.ts           # WebSocket connection management
  pages/
    Analytics/           # Revenue and order analytics
    Auth/                # Login and registration
    Dashboard/           # Main dashboard
    Menu/                # Menu management
    Onboarding/          # Restaurant onboarding flow
    Orders/              # Order management
    Profile/             # Restaurant profile
  services/              # API client services
  test/                  # Test utilities and factories
  types/                 # TypeScript type definitions
  utils/                 # Utility functions
  App.tsx                # Root application component
  main.tsx               # Application entry point
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
cd apps/restaurant-app
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

The app runs on `http://localhost:5173` by default (Vite dev server).

### Building

```bash
pnpm build    # TypeScript check + Vite build
pnpm preview  # Preview production build
```

### Testing

```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # With coverage report
```

### Linting

```bash
pnpm lint              # Check for issues
pnpm lint:fix          # Auto-fix issues
```

## State Management

The app uses a combination of state management approaches:

| Tool | Purpose |
|------|---------|
| Zustand | Client-side state (UI state, filters, preferences) |
| TanStack Query | Server state (API data fetching, caching, mutations) |
| React Context | Auth state, order state, restaurant profile |

## Real-Time Features

- **WebSocket Connection:** Receives real-time order updates from the Gateway API
- **Notification Sounds:** Audio alerts when new orders arrive
- **Automatic Refresh:** TanStack Query revalidates data on window focus

## Testing

- Components tested with React Testing Library
- Zustand stores tested in isolation
- TanStack Query hooks tested with query client wrapper
- Common components have dedicated test files
- Coverage threshold: 80%

## Related Documentation

- [Frontend Guide](../../docs/FRONTEND_GUIDE.md)
- [API Documentation](../../docs/API_DOCUMENTATION.md)
- [Code Standards](../../docs/CODE_STANDARDS.md)
- [Contributing](../../docs/CONTRIBUTING.md)
