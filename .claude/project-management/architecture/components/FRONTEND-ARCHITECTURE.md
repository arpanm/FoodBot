# Frontend Architecture - Customer & Restaurant Apps

**Last Updated:** 2026-02-20
**Applications:** Customer App, Restaurant App
**Status:** ✅ Production Ready

---

## Overview

FoodBot consists of two separate React applications built with different state management approaches optimized for their specific use cases.

---

## Application Comparison

| Aspect | Customer App | Restaurant App |
|--------|-------------|----------------|
| **Framework** | React 18.2.0 | React 18.2.0 |
| **State Management** | Redux Toolkit | Zustand + TanStack Query |
| **Routing** | React Router 6.20.0 | React Router 6.20.0 |
| **Build Tool** | Vite | Vite |
| **Styling** | CSS Modules | Tailwind CSS |
| **HTTP Client** | Axios | Axios |
| **Real-Time** | Job Polling | WebSocket |
| **Components** | 41 components | 31 components |
| **LOC** | ~3,984 lines | ~2,235 lines |
| **Test Files** | 43 tests | 9 tests |
| **Use Case** | Customer ordering | Restaurant management |

---

## Customer App Architecture

### State Management: Redux Toolkit

#### Why Redux for Customer App?
1. **Complex State Interactions:** Cart, orders, chat, restaurants, dishes
2. **Cross-Component State:** Many components need access to same state
3. **Middleware Support:** Async thunks for API calls
4. **DevTools:** Time-travel debugging for complex flows
5. **Predictable Updates:** Single source of truth for application state

#### Redux Store Structure
```
RootState
├── chat: ChatState
│   ├── messages: Message[]
│   ├── loading: boolean
│   ├── error: string | null
│   └── jobId: string | null
├── restaurant: RestaurantState
│   ├── restaurants: Restaurant[]
│   ├── selectedRestaurant: Restaurant | null
│   ├── filters: RestaurantFilters
│   └── pagination: PaginationInfo
├── dish: DishState
│   ├── dishes: Dish[]
│   ├── selectedDish: Dish | null
│   └── filters: DishFilters
├── cart: CartState
│   ├── items: CartItem[]
│   ├── total: number
│   └── restaurantId: string | null
├── order: OrderState
│   ├── orders: Order[]
│   └── activeOrder: Order | null
├── user: UserState
│   ├── profile: User | null
│   ├── isAuthenticated: boolean
│   └── addresses: Address[]
└── accountLinking: AccountLinkingState
    ├── accounts: LinkedAccount[]
    ├── oauthInProgress: PlatformType | null
    └── oauthUrl: string | null
```

#### Data Flow Pattern
```
User Action → Dispatch Action → Reducer Updates State →
UI Re-renders → Side Effects (API calls) → Dispatch Success/Failure →
Reducer Updates State → UI Re-renders
```

#### Example: Add to Cart Flow
```typescript
// 1. User clicks "Add to Cart"
onClick={() => dispatch(addItem(cartItem))}

// 2. Redux action dispatched
{
  type: 'cart/addItem',
  payload: {
    dishId: '123',
    quantity: 1,
    price: 12.50,
    customizations: [...]
  }
}

// 3. Reducer updates state
const cartSlice = createSlice({
  name: 'cart',
  reducers: {
    addItem: (state, action) => {
      const existing = state.items.find(i => i.dishId === action.payload.dishId);
      if (existing) {
        existing.quantity += 1;
        existing.subtotal = existing.price * existing.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.total = calculateTotal(state.items);
    }
  }
});

// 4. Components re-render
const { items, total } = useSelector(state => state.cart);
```

### Component Architecture

#### Component Hierarchy
```
App
├── ChatInterface
│   ├── MessageCard (N)
│   ├── InputField
│   ├── LoadingIndicator
│   └── CTAButton (N)
├── RestaurantList
│   ├── RestaurantSearch
│   ├── FilterPanel
│   └── RestaurantCard (N)
│       └── RestaurantDetail
├── DishList
│   └── DishCard (N)
│       └── DishDetail
│           └── DynamicForm
├── CartList
│   ├── CartItem (N)
│   └── CartSummary
└── OrderList
    ├── OrderCard (N)
    │   └── OrderDetail
    └── OrderTracking
        ├── StatusTracker
        └── ProgressStepper
```

#### Component Communication Patterns

**1. Parent → Child (Props)**
```typescript
<RestaurantCard
  restaurant={restaurant}
  onClick={() => navigate(`/restaurant/${restaurant.id}`)}
/>
```

**2. Child → Parent (Callbacks)**
```typescript
<InputField
  value={message}
  onChange={(text) => setMessage(text)}
  onSend={() => dispatch(sendMessage(message))}
/>
```

**3. Sibling Communication (Redux)**
```typescript
// CartSummary reads from Redux
const { total } = useSelector(state => state.cart);

// CartItem updates Redux
dispatch(updateQuantity({ id, quantity }));

// Both components stay in sync automatically
```

### Custom Hooks

#### 1. useJobPoller
**Purpose:** Poll async job status until completion
```typescript
const { job, isPolling, error, retry, cancel } = useJobPoller(
  jobId,
  {
    pollingInterval: 2000,
    maxAttempts: 150,
    onComplete: (job) => console.log('Done!', job),
    onError: (error) => console.error('Failed:', error)
  }
);
```

**Use Cases:**
- Chat message processing
- Restaurant search jobs
- Order placement jobs

#### 2. useDebounce
**Purpose:** Debounce rapidly changing values
```typescript
const debouncedSearchQuery = useDebounce(searchQuery, 300);

useEffect(() => {
  // Only runs after 300ms of no changes
  dispatch(searchRestaurants(debouncedSearchQuery));
}, [debouncedSearchQuery]);
```

**Use Cases:**
- Search input
- Filter changes
- Form validation

#### 3. useInfiniteScroll
**Purpose:** Load more items on scroll
```typescript
const { items, isLoading, hasMore, loadMore } = useInfiniteScroll(
  fetchRestaurants,
  { initialPage: 1, pageSize: 20 }
);
```

**Use Cases:**
- Restaurant list
- Dish list
- Order history

#### 4. useAccountLinking
**Purpose:** Manage platform account linking
```typescript
const {
  accounts,
  isLinked,
  initiateAuth,
  handleCallback,
  unlink
} = useAccountLinking();
```

**Use Cases:**
- Swiggy account linking
- Zomato account linking

### API Service Layer

#### Service Structure
```
services/
├── api/
│   └── axios.config.ts          # Axios instance + interceptors
├── chatbot.service.ts           # Chat & intent detection
├── intent-detection.service.ts  # NLP intent parsing
├── jobs.service.ts              # Job polling
├── restaurant.service.ts        # Restaurant CRUD
├── dish.service.ts              # Dish CRUD
├── cart.service.ts              # Cart operations
├── order.service.ts             # Order placement
├── user.service.ts              # User profile
├── search.service.ts            # Search
└── account-linking.service.ts   # OAuth integration
```

#### Service Pattern
```typescript
class RestaurantService {
  async getAll(params?: RestaurantQuery): Promise<Restaurant[]> {
    return apiClient.get('/restaurants', { params });
  }

  async getById(id: string): Promise<Restaurant> {
    return apiClient.get(`/restaurants/${id}`);
  }

  async search(query: SearchQuery): Promise<PaginatedResponse<Restaurant>> {
    return apiClient.post('/restaurants/search', query);
  }
}

export const restaurantService = new RestaurantService();
```

---

## Restaurant App Architecture

### State Management: Zustand + TanStack Query + React Context

#### Why This Approach?
1. **Simpler State Needs:** Less cross-component state sharing
2. **Server State Focus:** Most data comes from API (orders, menu, analytics)
3. **Real-Time Updates:** WebSocket integration easier with Context
4. **Lightweight:** Zustand is 1KB vs Redux 13KB
5. **Better DX:** Less boilerplate than Redux

#### State Distribution

**React Context (3 contexts)**
- `AuthContext`: User authentication, JWT tokens
- `RestaurantContext`: Restaurant profile data
- `OrderContext`: Orders + WebSocket subscription

**TanStack Query**
- Menu items (with caching)
- Analytics data (with refetching)
- Order history (with pagination)

**Zustand (future)**
- UI preferences
- Filter states
- Theme settings

#### Context Pattern
```typescript
// auth-context.tsx
interface AuthState {
  user: RestaurantOwner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>(initialState);

  const login = useCallback(async (credentials) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await authApi.login(credentials);
      setState({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: getErrorMessage(error)
      }));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Usage
const { user, login, logout } = useAuth();
```

#### TanStack Query Pattern
```typescript
// In component
const { data: dishes, isLoading, error, refetch } = useQuery({
  queryKey: ['dishes', restaurantId],
  queryFn: () => menuApi.listDishes(restaurantId),
  staleTime: 30_000,
  refetchOnWindowFocus: false
});

// Mutation for updates
const mutation = useMutation({
  mutationFn: (data: UpdateDishData) => menuApi.updateDish(dishId, data),
  onSuccess: () => {
    queryClient.invalidateQueries(['dishes']);
    toast.success('Dish updated!');
  }
});
```

### Real-Time Architecture

#### WebSocket Service
```typescript
class WebSocketService {
  private ws: WebSocket | null = null;
  private restaurantId: string | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(restaurantId: string): void {
    this.restaurantId = restaurantId;
    this.ws = new WebSocket(`${WS_URL}/restaurant/${restaurantId}`);

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.emit(message.type, message);
      this.emit('all', message);
    };

    this.ws.onerror = () => this.reconnect();
  }

  on(eventType: string, handler: Function): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => this.listeners.get(eventType)?.delete(handler);
  }

  private emit(eventType: string, data: any): void {
    this.listeners.get(eventType)?.forEach(handler => handler(data));
  }

  private reconnect(): void {
    setTimeout(() => {
      if (this.restaurantId) {
        this.connect(this.restaurantId);
      }
    }, 5000);
  }
}

export const wsService = new WebSocketService();
```

#### WebSocket Hook
```typescript
const { isConnected, subscribe } = useWebSocket({
  restaurantId: restaurant.id,
  autoConnect: true
});

useEffect(() => {
  const unsubscribe = subscribe('new_order', (message) => {
    playNotificationSound();
    refetchOrders();
    showNotification('New order received!');
  });

  return unsubscribe;
}, []);
```

### Component Architecture

#### Page-Based Structure
```
App
├── Login
├── Register
├── RestaurantSetup (Onboarding)
├── Dashboard
│   ├── MetricCard (4x)
│   ├── OrderCard (N)
│   └── RevenueChart
├── Menu
│   ├── SearchBar
│   ├── FilterBar
│   └── DishCard (N)
│       ├── AddDish (Modal)
│       └── EditDish (Modal)
├── OrderList
│   ├── FilterBar
│   └── OrderCard (N)
│       └── OrderDetail
├── RestaurantProfile
│   └── EditForm
└── Analytics
    ├── RevenueChart
    ├── OrdersChart
    └── PopularDishesChart
```

#### Layout Components
```
AppLayout
├── Sidebar
│   ├── Logo
│   ├── NavLinks
│   └── UserMenu
├── Header
│   ├── PageTitle
│   ├── NotificationBell
│   └── RestaurantToggle (Open/Closed)
└── Content
    └── {children}
```

---

## Shared Patterns

### 1. Error Handling
```typescript
// Centralized error handler
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.message || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}

// Usage in components
try {
  await api.call();
} catch (error) {
  setError(getErrorMessage(error));
}
```

### 2. Loading States
```typescript
// Standard loading pattern
{isLoading && <LoadingSpinner />}
{error && <ErrorAlert message={error} />}
{data && <DataDisplay data={data} />}
{!isLoading && !error && !data && <EmptyState />}
```

### 3. Type Safety
```typescript
// All API responses typed
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// All component props typed
interface DishCardProps {
  dish: Dish;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// All Redux state typed
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### 4. Test Utilities
```typescript
// Render with providers
function renderWithProviders(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({ reducer, preloadedState }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }
  return { store, ...render(ui, { wrapper: Wrapper, ...renderOptions }) };
}

// Test factories
const mockRestaurant = RestaurantFactory.build({
  id: '123',
  name: 'Test Restaurant',
  isOpen: true
});
```

---

## Performance Optimizations

### Customer App
1. **Code Splitting:** Lazy-loaded routes
2. **Memoization:** React.memo for expensive components
3. **Debouncing:** Search and filter inputs
4. **Infinite Scroll:** Paginated lists
5. **Redux Selectors:** Reselect for derived state

### Restaurant App
1. **Code Splitting:** Lazy-loaded pages
2. **TanStack Query Caching:** 30s stale time
3. **Optimistic Updates:** Immediate UI feedback
4. **WebSocket Batching:** Grouped updates
5. **Image Optimization:** Compressed uploads

---

## Security Measures

### Both Apps
1. **JWT Authentication:** HTTP-only tokens (future)
2. **Input Validation:** Client + server side
3. **XSS Prevention:** Sanitized inputs
4. **CSRF Protection:** State tokens for OAuth
5. **HTTPS Only:** Enforced in production

---

## Build Configuration

### Customer App (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'redux-vendor': ['@reduxjs/toolkit', 'react-redux'],
          'ui-vendor': ['axios']
        }
      }
    }
  }
});
```

### Restaurant App (Vite)
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js'  // Tailwind
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'chart-vendor': ['recharts'],
          'query-vendor': ['@tanstack/react-query', 'zustand']
        }
      }
    }
  }
});
```

---

## Deployment

### Docker Setup
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables
```bash
# Customer App
VITE_API_BASE_URL=https://api.foodbot.com
VITE_WS_BASE_URL=wss://api.foodbot.com

# Restaurant App
VITE_API_BASE_URL=https://api.foodbot.com
VITE_WS_BASE_URL=wss://api.foodbot.com
```

---

## Related Documentation

- [Customer Requirements Summary](../requirements/customer-agent/CUSTOMER-REQUIREMENTS-SUMMARY.md)
- [Restaurant Requirements Summary](../requirements/restaurant-agent/RESTAURANT-REQUIREMENTS-SUMMARY.md)
- [Completed Tasks](../tasks/completed/)
