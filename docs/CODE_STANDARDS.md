# FoodBot Code Standards

**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Table of Contents

- [1. TypeScript Guidelines](#1-typescript-guidelines)
- [2. Java Guidelines](#2-java-guidelines)
- [3. Naming Conventions](#3-naming-conventions)
- [4. File Structure](#4-file-structure)
- [5. Error Handling Patterns](#5-error-handling-patterns)
- [6. Testing Patterns](#6-testing-patterns)

---

## 1. TypeScript Guidelines

### Strict Mode

All TypeScript projects enforce strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Type Safety

```typescript
// GOOD: Explicit types
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// BAD: Implicit any
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

### Prefer Interfaces for Object Shapes

```typescript
// GOOD: Interface for object shapes
interface Order {
  id: string;
  userId: string;
  total: number;
  status: OrderStatus;
}

// GOOD: Type alias for unions and primitives
type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';
type UserId = string;
```

### Avoid Enums, Prefer Const Objects

```typescript
// PREFERRED: Const object with as const
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
} as const;

type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
```

### Async/Await Over Promises

```typescript
// GOOD
async function fetchOrder(id: string): Promise<Order> {
  const order = await this.orderRepository.findById(id);
  if (!order) throw new OrderNotFoundError(id);
  return order;
}

// BAD
function fetchOrder(id: string): Promise<Order> {
  return this.orderRepository.findById(id).then((order) => {
    if (!order) throw new OrderNotFoundError(id);
    return order;
  });
}
```

---

## 2. Java Guidelines

### Spring Boot Conventions

- Use constructor injection (not field injection)
- Use `@Service`, `@Repository`, `@Controller` annotations appropriately
- Use `@ConfigurationProperties` for configuration binding
- Use `ResponseEntity<T>` for controller return types

```java
// GOOD: Constructor injection
@Service
public class SearchService {
    private final ElasticsearchClient esClient;
    private final CacheService cacheService;

    public SearchService(ElasticsearchClient esClient, CacheService cacheService) {
        this.esClient = esClient;
        this.cacheService = cacheService;
    }
}

// BAD: Field injection
@Service
public class SearchService {
    @Autowired
    private ElasticsearchClient esClient;
}
```

### Package Structure

```
com.foodbot.mcp/
  config/        # Spring configuration classes
  controller/    # REST controllers
  model/         # Domain models
  repository/    # Data access
  search/        # Search service logic
  providers/     # MCP provider clients
  aggregator/    # Result aggregation
  cache/         # Cache management
  resilience/    # Circuit breaker, rate limiter
  router/        # Provider routing
  indexing/      # Kafka consumers for indexing
  exception/     # Custom exceptions
  consumers/     # Kafka event consumers
```

---

## 3. Naming Conventions

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| TypeScript source | kebab-case | `order-service.ts` |
| React component | PascalCase | `RestaurantCard.tsx` |
| Test file (unit) | kebab-case + `.test` | `order-service.test.ts` |
| Test file (integration) | kebab-case + `.spec` | `order.controller.e2e.spec.ts` |
| DTO | kebab-case + `.dto` | `create-order.dto.ts` |
| Entity | kebab-case + `.entity` | `order.entity.ts` |
| Module | kebab-case + `.module` | `order.module.ts` |
| Controller | kebab-case + `.controller` | `order.controller.ts` |
| Service | kebab-case + `.service` | `order.service.ts` |
| Guard | kebab-case + `.guard` | `jwt-auth.guard.ts` |
| Java source | PascalCase | `SearchController.java` |

### Variable Naming

```typescript
// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 5000;

// Variables and functions: camelCase
const orderTotal = calculateTotal(items);
function getUserById(id: string): Promise<User> { ... }

// Classes: PascalCase
class OrderService { ... }
class RestaurantCard extends React.Component { ... }

// Interfaces: PascalCase (no I prefix)
interface Order { ... }
interface SearchRequest { ... }

// Type aliases: PascalCase
type OrderStatus = 'pending' | 'confirmed';
type PaymentMethod = 'card' | 'upi' | 'cash';
```

---

## 4. File Structure

### NestJS Module Structure

```
modules/
  order/
    __tests__/
      order.controller.e2e.spec.ts
    dto/
      create-order.dto.ts
      update-order-status.dto.ts
    order.controller.ts
    order.module.ts
    order.service.ts
```

### React Component Structure

```
components/
  Order/
    __tests__/
      OrderCard.test.tsx
      OrderDetail.test.tsx
      OrderList.test.tsx
    OrderCard.tsx
    OrderDetail.tsx
    OrderList.tsx
    OrderTracking.tsx
```

### Shared Package Structure

```
packages/
  events/
    src/
      __tests__/
        schemas.spec.ts
      schemas/
        base-event.ts
        order-events.ts
        restaurant-events.ts
      index.ts
      topics.ts
    package.json
    tsconfig.json
```

---

## 5. Error Handling Patterns

### Custom Error Classes

```typescript
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly technicalMessage: string,
    public readonly userMessage: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(technicalMessage);
    this.name = 'DomainError';
  }
}

export class OrderNotFoundError extends DomainError {
  constructor(orderId: string) {
    super(
      'ORDER_NOT_FOUND',
      `Order ${orderId} not found in database`,
      'We could not find your order. Please check the order ID and try again.',
      { orderId }
    );
  }
}
```

### Error Handling in Controllers

NestJS exception filters handle errors centrally:

```typescript
// validation-exception.filter.ts handles DTO validation errors
// HttpException automatically returns proper status codes
// Unhandled errors return 500 with generic message (no stack trace)
```

### Error Handling in Activities

Temporal activities should throw typed errors:

```typescript
import { ApplicationFailure } from '@temporalio/common';

// Retryable error (Temporal will retry)
throw ApplicationFailure.retryable('Payment gateway timeout');

// Non-retryable error (Temporal will not retry)
throw ApplicationFailure.nonRetryable('Invalid payment method');
```

---

## 6. Testing Patterns

### Unit Test Structure

```typescript
describe('OrderService', () => {
  let service: OrderService;
  let mockRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;
    service = new OrderService(mockRepository);
  });

  describe('findById', () => {
    it('should return order when found', async () => {
      const order = OrderFactory.build();
      mockRepository.findById.mockResolvedValue(order);

      const result = await service.findById(order.id);

      expect(result).toEqual(order);
      expect(mockRepository.findById).toHaveBeenCalledWith(order.id);
    });

    it('should throw when order not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(OrderNotFoundError);
    });
  });
});
```

### Integration Test Structure

```typescript
describe('OrderController (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create order successfully', async () => {
      const dto = OrderInputFactory.build();

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
    });
  });
});
```

### React Component Test Structure

```typescript
describe('RestaurantCard', () => {
  it('should render restaurant name and rating', () => {
    const restaurant = RestaurantFactory.build({ name: 'Pizza Place', rating: 4.5 });

    render(
      <Provider store={mockStore}>
        <RestaurantCard restaurant={restaurant} />
      </Provider>
    );

    expect(screen.getByText('Pizza Place')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    const restaurant = RestaurantFactory.build();

    render(
      <Provider store={mockStore}>
        <RestaurantCard restaurant={restaurant} onSelect={onSelect} />
      </Provider>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(restaurant.id);
  });
});
```
