# Development Guardrails - FoodBot Project

**Version:** 1.0.0
**Last Updated:** 2026-02-17
**Status:** Active

---

## Table of Contents

- [1. Code Quality Standards](#1-code-quality-standards)
- [2. Architecture Guardrails](#2-architecture-guardrails)
- [3. Security Guardrails](#3-security-guardrails)
- [4. Testing Guardrails](#4-testing-guardrails)
- [5. Git Workflow](#5-git-workflow)
- [6. Naming Conventions](#6-naming-conventions)
- [7. Error Handling](#7-error-handling)
- [8. Performance Guidelines](#8-performance-guidelines)

---

## 1. Code Quality Standards

### 1.1 TypeScript Strict Mode

**Rule:** All TypeScript projects MUST use strict mode.

**Configuration:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Rationale:** Strict mode catches type errors at compile time, reducing runtime bugs and improving code maintainability.

**Example:**
```typescript
// ❌ BAD - any type allowed without strict mode
function processData(data: any) {
  return data.value.toUpperCase(); // No type checking
}

// ✅ GOOD - explicit types required
interface DataInput {
  value: string;
}

function processData(data: DataInput): string {
  return data.value.toUpperCase();
}
```

---

### 1.2 ESLint Rules

**Rule:** No ESLint warnings allowed in committed code.

**Required ESLint Configuration:**
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "no-console": "error",
    "no-debugger": "error",
    "no-alert": "error",
    "no-var": "error",
    "prefer-const": "error",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-misused-promises": "error"
  }
}
```

**Rationale:** Consistent linting prevents common bugs and maintains code quality across the team.

**Auto-fix capability:** Many ESLint rules can auto-fix issues. Run `npm run lint:fix` before committing.

---

### 1.3 Prettier Formatting

**Rule:** All code MUST be formatted with Prettier (auto-format on save).

**Configuration:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

**IDE Setup:**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**Rationale:** Automated formatting eliminates style debates and ensures consistency.

---

### 1.4 Test Coverage

**Rule:** Minimum 80% test coverage required for all new code.

**Configuration:**
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

**Enforcement:**
- Pre-push hook blocks pushes with <80% coverage
- CI/CD pipeline fails builds below threshold
- Coverage reports generated on every PR

**Rationale:** High test coverage catches bugs early and enables confident refactoring.

**Example:**
```typescript
// ✅ GOOD - well-tested function
export function calculateDiscount(price: number, percentage: number): number {
  if (price < 0) throw new InvalidPriceError('Price cannot be negative');
  if (percentage < 0 || percentage > 100) {
    throw new InvalidDiscountError('Discount must be between 0 and 100');
  }
  return price * (1 - percentage / 100);
}

// Test file covers:
// ✓ Happy path
// ✓ Negative price error
// ✓ Invalid discount error (< 0)
// ✓ Invalid discount error (> 100)
// ✓ Edge cases (0%, 100%)
```

---

### 1.5 Cyclomatic Complexity

**Rule:** Maximum cyclomatic complexity of 10 per function.

**Enforcement:** ESLint rule `complexity: ["error", 10]`

**Rationale:** High complexity makes code hard to understand, test, and maintain.

**Example:**
```typescript
// ❌ BAD - complexity > 10
function validateOrder(order: Order): boolean {
  if (order.items.length === 0) return false;
  if (order.userId === null) return false;
  if (order.total < 0) return false;
  if (order.status === 'cancelled') return false;
  if (order.paymentMethod === 'card' && !order.cardDetails) return false;
  if (order.deliveryType === 'scheduled' && !order.scheduledTime) return false;
  // ... more conditions
  return true;
}

// ✅ GOOD - refactored for lower complexity
function validateOrder(order: Order): boolean {
  return (
    hasItems(order) &&
    hasValidUser(order) &&
    hasValidTotal(order) &&
    hasValidStatus(order) &&
    hasValidPayment(order) &&
    hasValidDelivery(order)
  );
}

function hasItems(order: Order): boolean {
  return order.items.length > 0;
}

function hasValidUser(order: Order): boolean {
  return order.userId !== null;
}

// ... other validation functions
```

---

### 1.6 File Length Limits

**Rule:** Maximum 300 lines per file.

**Enforcement:** ESLint rule `max-lines: ["error", 300]`

**Rationale:** Large files are hard to navigate and often indicate poor separation of concerns.

**Refactoring Strategy:**
```typescript
// ❌ BAD - everything in one file (500+ lines)
// order.service.ts

// ✅ GOOD - split into focused modules
// order.service.ts (150 lines)
// order.validator.ts (80 lines)
// order.mapper.ts (60 lines)
// order.repository.ts (100 lines)
```

---

### 1.7 Function Length Limits

**Rule:** Maximum 50 lines per function.

**Enforcement:** ESLint rule `max-lines-per-function: ["error", 50]`

**Rationale:** Long functions are hard to understand and test.

**Example:**
```typescript
// ❌ BAD - 80 line function
async function processOrder(orderId: string) {
  // Fetch order
  const order = await db.orders.findOne({ id: orderId });
  if (!order) throw new NotFoundError();

  // Validate inventory
  for (const item of order.items) {
    const stock = await db.inventory.findOne({ id: item.productId });
    if (stock.quantity < item.quantity) throw new OutOfStockError();
  }

  // Process payment
  const payment = await paymentGateway.charge({
    amount: order.total,
    method: order.paymentMethod,
  });

  // ... 50 more lines
}

// ✅ GOOD - split into focused functions
async function processOrder(orderId: string): Promise<OrderResult> {
  const order = await fetchOrder(orderId);
  await validateInventory(order);
  const payment = await processPayment(order);
  const fulfillment = await scheduleFulfillment(order);

  return {
    orderId: order.id,
    paymentId: payment.id,
    fulfillmentId: fulfillment.id,
  };
}

async function fetchOrder(orderId: string): Promise<Order> {
  const order = await db.orders.findOne({ id: orderId });
  if (!order) throw new OrderNotFoundError(orderId);
  return order;
}

async function validateInventory(order: Order): Promise<void> {
  const checks = order.items.map((item) => checkStock(item));
  await Promise.all(checks);
}

// ... other focused functions
```

---

## 2. Architecture Guardrails

### 2.1 No Circular Dependencies

**Rule:** Circular dependencies between modules are FORBIDDEN.

**Detection:** Use `madge` to detect cycles:
```bash
npx madge --circular --extensions ts src/
```

**Pre-commit Hook:** Automatically checks for circular dependencies.

**Rationale:** Circular dependencies make code hard to reason about and can cause runtime issues.

**Example:**
```typescript
// ❌ BAD - circular dependency
// user.service.ts
import { OrderService } from './order.service';

export class UserService {
  constructor(private orderService: OrderService) {}
  getUserOrders(userId: string) {
    return this.orderService.getOrdersByUser(userId);
  }
}

// order.service.ts
import { UserService } from './user.service'; // CIRCULAR!

export class OrderService {
  constructor(private userService: UserService) {}
  getOrdersByUser(userId: string) {
    const user = this.userService.getUser(userId);
    // ...
  }
}

// ✅ GOOD - use dependency injection and interfaces
// user.service.ts
export class UserService {
  getUserOrders(userId: string) {
    // Query orders directly or use a repository
    return this.orderRepository.findByUserId(userId);
  }
}

// order.service.ts
export class OrderService {
  getOrdersByUser(userId: string) {
    return this.orderRepository.findByUserId(userId);
  }
}
```

---

### 2.2 No Direct Database Access from Controllers

**Rule:** Controllers MUST NOT access the database directly. Use services/repositories.

**Architecture:**
```
Controller → Service → Repository → Database
```

**Rationale:** Separation of concerns keeps controllers thin and business logic reusable.

**Example:**
```typescript
// ❌ BAD - controller accessing database
@Controller('/orders')
export class OrderController {
  constructor(private db: Database) {}

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.db.orders.findOne({ id }); // WRONG!
    return order;
  }
}

// ✅ GOOD - controller delegates to service
@Controller('/orders')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<OrderDto> {
    const order = await this.orderService.getOrderById(id);
    return this.orderMapper.toDto(order);
  }
}

// order.service.ts
@Injectable()
export class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  async getOrderById(id: string): Promise<Order> {
    return this.orderRepository.findById(id);
  }
}
```

---

### 2.3 Error Handling for External Calls

**Rule:** ALL external API calls MUST have error handling.

**Required Pattern:**
```typescript
// ✅ GOOD - comprehensive error handling
async function callExternalApi<T>(url: string): Promise<Result<T, ApiError>> {
  try {
    const response = await fetch(url, {
      timeout: 5000, // Always set timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return Result.err(
        new ApiError({
          code: 'API_ERROR',
          status: response.status,
          message: `API call failed: ${response.statusText}`,
          url,
        })
      );
    }

    const data = await response.json();
    return Result.ok(data as T);
  } catch (error) {
    if (error instanceof TimeoutError) {
      return Result.err(new ApiTimeoutError(url));
    }
    if (error instanceof NetworkError) {
      return Result.err(new NetworkError(url));
    }
    return Result.err(new UnknownApiError(error));
  }
}
```

**Rationale:** External services can fail. Proper error handling ensures graceful degradation.

---

### 2.4 Timeouts for Async Operations

**Rule:** ALL async operations MUST have explicit timeouts.

**Default Timeouts:**
- HTTP calls: 5 seconds
- Database queries: 10 seconds
- External API calls: 5 seconds
- Workflow activities: 30 seconds

**Implementation:**
```typescript
// ✅ GOOD - with timeout
async function fetchUserData(userId: string): Promise<User> {
  const timeoutMs = 5000;

  const result = await Promise.race([
    this.userApi.getUser(userId),
    timeout(timeoutMs, new TimeoutError('User fetch timeout')),
  ]);

  return result;
}

// Helper
function timeout<T>(ms: number, error: Error): Promise<T> {
  return new Promise((_, reject) => setTimeout(() => reject(error), ms));
}
```

**Rationale:** Prevents hanging requests and cascading failures.

---

### 2.5 API Endpoint Validation

**Rule:** ALL API endpoints MUST validate input using schemas.

**Required Setup:**
```typescript
// ✅ GOOD - using class-validator and DTOs
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsNumber()
  @Min(0)
  total: number;
}

@Controller('/orders')
export class OrderController {
  @Post()
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    // DTO automatically validated by NestJS ValidationPipe
    return this.orderService.createOrder(dto);
  }
}
```

**Rationale:** Input validation prevents injection attacks and ensures data integrity.

---

### 2.6 Typed API Responses

**Rule:** ALL API responses MUST be typed.

**Implementation:**
```typescript
// ✅ GOOD - typed response
export interface OrderResponseDto {
  id: string;
  userId: string;
  items: OrderItemDto[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

@Controller('/orders')
export class OrderController {
  @Get(':id')
  async getOrder(@Param('id') id: string): Promise<OrderResponseDto> {
    const order = await this.orderService.getOrderById(id);
    return this.orderMapper.toResponseDto(order);
  }
}

// ❌ BAD - untyped response
@Get(':id')
async getOrder(@Param('id') id: string): Promise<any> { // NO!
  return this.orderService.getOrderById(id);
}
```

**Rationale:** Type safety ensures API contracts are honored and enables auto-completion.

---

## 3. Security Guardrails

### 3.1 No Secrets in Code

**Rule:** NEVER hardcode secrets, API keys, or credentials.

**Enforcement:**
- Pre-commit hook scans for secrets
- CI/CD pipeline blocks commits with secrets
- Regular secret scanning with tools like `trufflehog`

**Examples:**
```typescript
// ❌ BAD - hardcoded secret
const apiKey = 'sk_live_abc123xyz789'; // FORBIDDEN!

// ✅ GOOD - use environment variables
const apiKey = process.env.STRIPE_API_KEY;
if (!apiKey) {
  throw new ConfigurationError('STRIPE_API_KEY not configured');
}

// ✅ GOOD - use secret manager in production
const apiKey = await secretManager.getSecret('stripe-api-key');
```

**Environment Setup:**
```bash
# .env (not committed)
STRIPE_API_KEY=sk_live_abc123xyz789
DATABASE_URL=postgres://user:pass@localhost:5432/db

# .env.example (committed)
STRIPE_API_KEY=sk_test_your_key_here
DATABASE_URL=postgres://user:pass@localhost:5432/db
```

**Rationale:** Hardcoded secrets lead to security breaches when code is exposed.

---

### 3.2 Input Sanitization

**Rule:** ALL user input MUST be sanitized before use.

**Implementation:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

// ✅ GOOD - sanitize HTML input
function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

// ✅ GOOD - sanitize SQL input (use parameterized queries)
function getUserByEmail(email: string): Promise<User> {
  // Parameterized query prevents SQL injection
  return db.query('SELECT * FROM users WHERE email = $1', [email]);
}

// ❌ BAD - string concatenation vulnerable to SQL injection
function getUserByEmail(email: string): Promise<User> {
  return db.query(`SELECT * FROM users WHERE email = '${email}'`); // VULNERABLE!
}
```

**Rationale:** Prevents XSS, SQL injection, and other injection attacks.

---

### 3.3 Parameterized SQL Queries

**Rule:** ALL SQL queries MUST use parameterized statements.

**Example:**
```typescript
// ✅ GOOD - parameterized query
async function findOrdersByUser(userId: string): Promise<Order[]> {
  const query = 'SELECT * FROM orders WHERE user_id = $1';
  return db.query(query, [userId]);
}

// ❌ BAD - string concatenation
async function findOrdersByUser(userId: string): Promise<Order[]> {
  const query = `SELECT * FROM orders WHERE user_id = '${userId}'`; // VULNERABLE!
  return db.query(query);
}

// ✅ GOOD - using ORM (TypeORM example)
async function findOrdersByUser(userId: string): Promise<Order[]> {
  return this.orderRepository.find({ where: { userId } });
}
```

**Rationale:** Prevents SQL injection attacks.

---

### 3.4 API Authentication

**Rule:** ALL API endpoints MUST be authenticated, except explicitly public endpoints.

**Implementation:**
```typescript
// ✅ GOOD - protected endpoint
@Controller('/orders')
@UseGuards(JwtAuthGuard) // All routes require authentication
export class OrderController {
  @Get()
  async getOrders(@CurrentUser() user: User): Promise<OrderDto[]> {
    return this.orderService.getOrdersByUser(user.id);
  }

  @Public() // Explicitly mark public endpoints
  @Get('/menu')
  async getMenu(): Promise<MenuDto> {
    return this.orderService.getPublicMenu();
  }
}

// Custom decorator for public endpoints
export const Public = () => SetMetadata('isPublic', true);
```

**Rationale:** Unauthorized access leads to data breaches and abuse.

---

### 3.5 Sensitive Data Encryption

**Rule:** ALL sensitive data MUST be encrypted at rest and in transit.

**Implementation:**
```typescript
import * as crypto from 'crypto';

// ✅ GOOD - encrypt PII before storing
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encrypted: string): string {
    const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage
const encrypted = encryptionService.encrypt(user.phoneNumber);
await db.users.update({ id: user.id, phoneNumber: encrypted });
```

**Data Classification:**
- **Sensitive:** Credit cards, SSN, passwords, API keys → MUST encrypt
- **PII:** Names, emails, phone numbers → SHOULD encrypt
- **Public:** Product names, prices, descriptions → No encryption needed

**Rationale:** Protects user data in case of database compromise.

---

### 3.6 OWASP Top 10 Compliance

**Rule:** Code MUST comply with OWASP Top 10 security standards.

**Required Protections:**

1. **Injection** - Parameterized queries, input validation
2. **Broken Authentication** - JWT with short expiry, secure session management
3. **Sensitive Data Exposure** - Encryption, HTTPS only
4. **XML External Entities (XXE)** - Disable XML entity processing
5. **Broken Access Control** - Role-based access control (RBAC)
6. **Security Misconfiguration** - Secure defaults, minimal permissions
7. **XSS** - Input sanitization, Content Security Policy
8. **Insecure Deserialization** - Validate serialized data
9. **Using Components with Known Vulnerabilities** - Regular dependency updates
10. **Insufficient Logging & Monitoring** - Comprehensive audit logs

**Audit Schedule:** Quarterly security audits, automated scanning on every commit.

---

## 4. Testing Guardrails

### 4.1 Unit Tests for Business Logic

**Rule:** ALL business logic MUST have unit tests.

**Coverage Requirements:**
- Happy path
- Error cases
- Edge cases
- Boundary conditions

**Example:**
```typescript
// order.service.ts
export class OrderService {
  calculateTotal(items: OrderItem[]): number {
    if (items.length === 0) {
      throw new EmptyOrderError();
    }
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }
}

// order.service.test.ts
describe('OrderService', () => {
  let service: OrderService;

  beforeEach(() => {
    service = new OrderService();
  });

  describe('calculateTotal', () => {
    it('should calculate total for single item', () => {
      const items = [{ price: 10, quantity: 2 }];
      expect(service.calculateTotal(items)).toBe(20);
    });

    it('should calculate total for multiple items', () => {
      const items = [
        { price: 10, quantity: 2 },
        { price: 5, quantity: 3 },
      ];
      expect(service.calculateTotal(items)).toBe(35);
    });

    it('should throw error for empty order', () => {
      expect(() => service.calculateTotal([])).toThrow(EmptyOrderError);
    });

    it('should handle zero quantity', () => {
      const items = [{ price: 10, quantity: 0 }];
      expect(service.calculateTotal(items)).toBe(0);
    });
  });
});
```

**Rationale:** Unit tests catch bugs early and enable confident refactoring.

---

### 4.2 Integration Tests for API Endpoints

**Rule:** ALL API endpoints MUST have integration tests.

**Example:**
```typescript
// order.controller.integration.test.ts
describe('OrderController (Integration)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token
    authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /orders', () => {
    it('should create order successfully', async () => {
      const orderData = {
        userId: 'user-123',
        items: [{ productId: 'prod-1', quantity: 2, price: 10 }],
        paymentMethod: 'card',
        total: 20,
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId: orderData.userId,
        status: 'pending',
      });
    });

    it('should return 400 for invalid order data', async () => {
      const invalidData = { userId: 'user-123' }; // Missing required fields

      await request(app.getHttpServer())
        .post('/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/orders')
        .send({})
        .expect(401);
    });
  });
});
```

**Rationale:** Integration tests verify that components work together correctly.

---

### 4.3 E2E Tests for User Workflows

**Rule:** ALL critical user workflows MUST have E2E tests.

**Critical Workflows:**
- User registration and login
- Order placement end-to-end
- Payment processing
- Order tracking

**Example:**
```typescript
// order-placement.e2e.test.ts
describe('Order Placement Workflow (E2E)', () => {
  it('should complete full order workflow', async () => {
    // 1. User logs in
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Browse menu
    await page.click('text=Order Food');
    await page.waitForSelector('.menu-items');

    // 3. Add items to cart
    await page.click('[data-testid="add-to-cart-burger"]');
    await page.click('[data-testid="add-to-cart-fries"]');

    // 4. View cart
    await page.click('[data-testid="cart-icon"]');
    expect(await page.textContent('[data-testid="cart-total"]')).toBe('$15.00');

    // 5. Checkout
    await page.click('text=Checkout');
    await page.fill('[name="address"]', '123 Main St');
    await page.fill('[name="cardNumber"]', '4242424242424242');
    await page.click('button:has-text("Place Order")');

    // 6. Verify confirmation
    await page.waitForSelector('.order-confirmation');
    const orderId = await page.textContent('[data-testid="order-id"]');
    expect(orderId).toMatch(/^ORD-\d+$/);
  });
});
```

**Rationale:** E2E tests ensure the entire system works from the user's perspective.

---

### 4.4 Deterministic Tests

**Rule:** ALL tests MUST be deterministic (same input → same output).

**Forbidden in Tests:**
- `Date.now()` without mocking
- `Math.random()` without seeding
- Network calls without mocking
- File system operations without cleanup

**Example:**
```typescript
// ❌ BAD - non-deterministic test
it('should create order with current timestamp', () => {
  const order = createOrder();
  expect(order.createdAt).toBe(Date.now()); // FLAKY!
});

// ✅ GOOD - deterministic test
it('should create order with current timestamp', () => {
  const mockDate = new Date('2024-01-01T00:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

  const order = createOrder();
  expect(order.createdAt).toBe(mockDate.getTime());
});
```

**Rationale:** Flaky tests erode confidence in the test suite.

---

### 4.5 Test Data Factories

**Rule:** NO hardcoded test data. Use factories for test data generation.

**Implementation:**
```typescript
// test/factories/order.factory.ts
import { faker } from '@faker-js/faker';

export class OrderFactory {
  static build(overrides?: Partial<Order>): Order {
    return {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      items: [OrderItemFactory.build()],
      total: faker.number.int({ min: 10, max: 100 }),
      status: 'pending',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      ...overrides,
    };
  }

  static buildMany(count: number, overrides?: Partial<Order>): Order[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }
}

// Usage in tests
describe('OrderService', () => {
  it('should process multiple orders', () => {
    const orders = OrderFactory.buildMany(5, { status: 'pending' });
    const result = service.processOrders(orders);
    expect(result).toHaveLength(5);
  });
});
```

**Rationale:** Factories make tests more maintainable and reduce duplication.

---

### 4.6 Mock External Dependencies

**Rule:** ALL external dependencies MUST be mocked in unit tests.

**Example:**
```typescript
// order.service.test.ts
describe('OrderService', () => {
  let service: OrderService;
  let mockPaymentGateway: jest.Mocked<PaymentGateway>;
  let mockOrderRepository: jest.Mocked<OrderRepository>;

  beforeEach(() => {
    mockPaymentGateway = {
      charge: jest.fn(),
      refund: jest.fn(),
    } as any;

    mockOrderRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new OrderService(mockPaymentGateway, mockOrderRepository);
  });

  it('should charge payment when processing order', async () => {
    const order = OrderFactory.build();
    mockOrderRepository.findById.mockResolvedValue(order);
    mockPaymentGateway.charge.mockResolvedValue({ id: 'payment-123' });

    await service.processOrder(order.id);

    expect(mockPaymentGateway.charge).toHaveBeenCalledWith({
      amount: order.total,
      orderId: order.id,
    });
  });
});
```

**Rationale:** Unit tests should be fast and not depend on external services.

---

## 5. Git Workflow

### 5.1 Feature Branches

**Rule:** ALL changes MUST be developed on feature branches from main.

**Branch Naming:**
```bash
feat/add-user-authentication
feat/order-tracking-system
fix/payment-validation-bug
fix/memory-leak-in-worker
hotfix/critical-security-patch
chore/update-dependencies
docs/api-documentation
```

**Workflow:**
```bash
# Create feature branch
git checkout main
git pull origin main
git checkout -b feat/add-user-profile

# Make changes and commit
git add .
git commit -m "feat: add user profile endpoint"

# Push to remote
git push -u origin feat/add-user-profile

# Create PR
gh pr create --title "Add user profile endpoint" --body "..."
```

**Rationale:** Feature branches enable parallel development and code review.

---

### 5.2 Pull Request Requirements

**Rule:** ALL changes MUST go through pull requests.

**PR Requirements:**
- All CI checks passing (lint, test, build)
- Code review from at least one team member
- No merge conflicts
- Branch up to date with main
- All conversations resolved

**PR Template:**
```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Breaking change
- [ ] Documentation

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.logs or debugger statements
```

**Rationale:** Code review catches bugs and maintains quality.

---

### 5.3 Pre-merge Checks

**Rule:** ALL checks MUST pass before merging.

**Required Checks:**
- Linting (ESLint)
- Type checking (TypeScript)
- Unit tests (80% coverage)
- Integration tests
- Build success
- No security vulnerabilities
- No circular dependencies

**CI/CD Configuration:**
```yaml
# .github/workflows/pr-checks.yml
name: PR Checks
on: [pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test -- --coverage
      - run: |
          if [ $(cat coverage/coverage-summary.json | jq '.total.lines.pct') -lt 80 ]; then
            echo "Coverage below 80%"
            exit 1
          fi

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
```

---

### 5.4 Squash Commits on Merge

**Rule:** Commits MUST be squashed when merging to main.

**GitHub Settings:**
```json
{
  "repository": {
    "allow_squash_merge": true,
    "allow_merge_commit": false,
    "allow_rebase_merge": false
  }
}
```

**Result:** Clean linear history on main branch.

**Rationale:** Keeps main branch history clean and easy to navigate.

---

### 5.5 Semantic Commit Messages

**Rule:** Commits MUST follow conventional commit format.

**Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semi colons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): add JWT authentication

Implement JWT-based authentication for API endpoints.
- Add JWT middleware
- Add login/logout endpoints
- Add token refresh logic

Closes #123

fix(payment): handle declined cards gracefully

Previously, declined cards caused unhandled exceptions.
Now returns proper error response to user.

Fixes #456

docs(api): update order endpoint documentation

Added examples for all order endpoints.

chore(deps): update dependencies

Update all dependencies to latest versions.
```

**Enforcement:** Pre-commit hook validates commit message format.

**Rationale:** Semantic commits enable automatic changelog generation.

---

## 6. Naming Conventions

### 6.1 File Naming

**Rule:** Files MUST use kebab-case.

**Examples:**
```
✅ GOOD
user-controller.ts
order-service.ts
payment-gateway.ts
authentication-middleware.ts

❌ BAD
UserController.ts
orderService.ts
Payment_Gateway.ts
authenticationMiddleware.ts
```

**Rationale:** Consistent, URL-friendly, works across operating systems.

---

### 6.2 Component Naming

**Rule:** Components MUST use PascalCase.

**Examples:**
```typescript
// ✅ GOOD
export class OrderController {}
export class UserService {}
export class PaymentGateway {}
export const UserProfile: React.FC = () => {};

// ❌ BAD
export class orderController {}
export class user_service {}
export const userProfile: React.FC = () => {};
```

---

### 6.3 Function Naming

**Rule:** Functions MUST use camelCase.

**Examples:**
```typescript
// ✅ GOOD
function calculateTotal(items: Item[]): number {}
function getUserById(id: string): Promise<User> {}
const processOrder = async (order: Order) => {};

// ❌ BAD
function CalculateTotal(items: Item[]): number {}
function get_user_by_id(id: string): Promise<User> {}
const ProcessOrder = async (order: Order) => {};
```

---

### 6.4 Constants

**Rule:** Constants MUST use UPPER_SNAKE_CASE.

**Examples:**
```typescript
// ✅ GOOD
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_TIMEOUT_MS = 5000;

// ❌ BAD
const maxRetryAttempts = 3;
const apiBaseUrl = 'https://api.example.com';
const defaultTimeoutMs = 5000;
```

---

### 6.5 Interfaces

**Rule:** Interfaces MUST use PascalCase with 'I' prefix (legacy) OR PascalCase without prefix (modern).

**Examples:**
```typescript
// ✅ GOOD (legacy style)
interface IUser {
  id: string;
  name: string;
}

// ✅ GOOD (modern style - preferred)
interface User {
  id: string;
  name: string;
}

interface UserRepository {
  findById(id: string): Promise<User>;
}

// ❌ BAD
interface user {}
interface user_repository {}
```

**Project Standard:** Use modern style (no 'I' prefix) for FoodBot.

---

### 6.6 Type Aliases

**Rule:** Type aliases MUST use PascalCase.

**Examples:**
```typescript
// ✅ GOOD
type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled';
type PaymentMethod = 'card' | 'cash' | 'upi';
type UserId = string;

// ❌ BAD
type orderStatus = 'pending' | 'confirmed';
type payment_method = 'card' | 'cash';
```

---

## 7. Error Handling

### 7.1 Result Type Pattern

**Rule:** Functions that can fail SHOULD return `Result<T, E>` type.

**Implementation:**
```typescript
// result.ts
export type Result<T, E> = Ok<T> | Err<E>;

export class Ok<T> {
  constructor(public readonly value: T) {}
  isOk(): this is Ok<T> { return true; }
  isErr(): this is Err<never> { return false; }
}

export class Err<E> {
  constructor(public readonly error: E) {}
  isOk(): this is Ok<never> { return false; }
  isErr(): this is Err<E> { return true; }
}

export const Result = {
  ok: <T>(value: T): Result<T, never> => new Ok(value),
  err: <E>(error: E): Result<never, E> => new Err(error),
};

// Usage
async function findUserById(id: string): Promise<Result<User, UserError>> {
  const user = await db.users.findOne({ id });

  if (!user) {
    return Result.err(new UserNotFoundError(id));
  }

  return Result.ok(user);
}

// Consumer
const result = await findUserById('user-123');

if (result.isErr()) {
  console.error('Failed to find user:', result.error);
  return;
}

const user = result.value;
console.log('Found user:', user.name);
```

**Rationale:** Makes error handling explicit and type-safe.

---

### 7.2 Error Codes

**Rule:** ALL API errors MUST include error codes.

**Error Code Format:** `DOMAIN_ERROR_NAME`

**Examples:**
```typescript
export enum OrderErrorCode {
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
  ORDER_ALREADY_CANCELLED = 'ORDER_ALREADY_CANCELLED',
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  INVALID_ORDER_STATUS = 'INVALID_ORDER_STATUS',
}

export class OrderError extends Error {
  constructor(
    public readonly code: OrderErrorCode,
    message: string,
    public readonly context?: Record<string, any>
  ) {
    super(message);
    this.name = 'OrderError';
  }
}

// Usage
throw new OrderError(
  OrderErrorCode.ORDER_NOT_FOUND,
  `Order ${orderId} not found`,
  { orderId }
);
```

**Rationale:** Error codes enable better error tracking and i18n.

---

### 7.3 User-Friendly Error Messages

**Rule:** ALL user-facing errors MUST have friendly messages.

**Implementation:**
```typescript
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly technicalMessage: string,
    public readonly userMessage: string,
    public readonly context?: Record<string, any>
  ) {
    super(technicalMessage);
  }
}

// Example
throw new DomainError(
  'INSUFFICIENT_STOCK',
  'Product XYZ has 0 units in stock',
  'Sorry, this item is currently out of stock. We\'ll notify you when it\'s available!',
  { productId: 'XYZ', requestedQty: 5, availableQty: 0 }
);

// API Response
{
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Sorry, this item is currently out of stock. We'll notify you when it's available!",
    "timestamp": "2024-02-17T10:30:00Z",
    "requestId": "req-abc-123"
  }
}
```

**Rationale:** Improves user experience and reduces support tickets.

---

### 7.4 Error Logging with Context

**Rule:** ALL errors MUST be logged with context and correlation IDs.

**Implementation:**
```typescript
export class Logger {
  error(message: string, error: Error, context?: Record<string, any>): void {
    const correlationId = getCorrelationId(); // From async context

    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      correlationId,
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      context,
    }));
  }
}

// Usage
try {
  await processOrder(orderId);
} catch (error) {
  logger.error('Failed to process order', error, {
    orderId,
    userId: user.id,
    orderTotal: order.total,
  });
  throw error;
}
```

**Rationale:** Context helps debug issues faster in production.

---

## 8. Performance Guidelines

### 8.1 Database Query Indexes

**Rule:** ALL database queries MUST use indexed columns.

**Example:**
```typescript
// Schema with indexes
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- Index for user_id queries
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index for status queries
CREATE INDEX idx_orders_status ON orders(status);

-- Composite index for common query patterns
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- ✅ GOOD - uses index
SELECT * FROM orders WHERE user_id = 'user-123'; -- Uses idx_orders_user_id

-- ❌ BAD - full table scan
SELECT * FROM orders WHERE LOWER(user_id) = 'user-123'; -- No index!
```

**Query Performance Review:** Run `EXPLAIN ANALYZE` on all queries to verify index usage.

**Rationale:** Indexes drastically improve query performance at scale.

---

### 8.2 API Response Time

**Rule:** API responses MUST be < 500ms at p95.

**Monitoring:**
```typescript
export class PerformanceMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;

      metrics.histogram('http_request_duration_ms', duration, {
        method: req.method,
        route: req.route?.path,
        status: res.statusCode,
      });

      if (duration > 500) {
        logger.warn('Slow API response', {
          method: req.method,
          path: req.path,
          duration,
        });
      }
    });

    next();
  }
}
```

**Optimization Strategies:**
- Cache frequently accessed data
- Use database connection pooling
- Implement pagination for large datasets
- Use async processing for long-running tasks

**Rationale:** Fast APIs improve user experience and reduce infrastructure costs.

---

### 8.3 React.memo for Expensive Renders

**Rule:** Expensive React components MUST use `React.memo`.

**Example:**
```typescript
// ❌ BAD - re-renders on every parent update
export const OrderList = ({ orders }: { orders: Order[] }) => {
  return (
    <div>
      {orders.map((order) => (
        <ExpensiveOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};

// ✅ GOOD - memoized component
export const OrderList = React.memo(({ orders }: { orders: Order[] }) => {
  return (
    <div>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
});

const OrderCard = React.memo(({ order }: { order: Order }) => {
  // Expensive rendering logic
  return <div>...</div>;
});
```

**When to use React.memo:**
- Component renders frequently
- Rendering logic is expensive
- Props don't change often

**Rationale:** Reduces unnecessary re-renders and improves performance.

---

### 8.4 List Virtualization

**Rule:** Lists with > 100 items MUST use virtualization.

**Implementation:**
```typescript
import { FixedSizeList } from 'react-window';

// ✅ GOOD - virtualized list
export const OrderHistory = ({ orders }: { orders: Order[] }) => {
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => (
    <div style={style}>
      <OrderCard order={orders[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={orders.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};

// ❌ BAD - renders all 1000+ items
export const OrderHistory = ({ orders }: { orders: Order[] }) => {
  return (
    <div>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} />
      ))}
    </div>
  );
};
```

**Rationale:** Virtualization prevents browser slowdown with large lists.

---

### 8.5 Image Lazy Loading

**Rule:** Images MUST use lazy loading.

**Implementation:**
```typescript
// ✅ GOOD - lazy loaded image
export const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
    />
  );
};

// ✅ BETTER - with modern Image component
import Image from 'next/image';

export const ProductImage = ({ src, alt }: { src: string; alt: string }) => {
  return (
    <Image
      src={src}
      alt={alt}
      width={300}
      height={300}
      loading="lazy"
      placeholder="blur"
      blurDataURL="/placeholder.jpg"
    />
  );
};
```

**Rationale:** Lazy loading reduces initial page load time.

---

### 8.6 Code Splitting for Routes

**Rule:** Routes MUST use code splitting.

**Implementation:**
```typescript
// ✅ GOOD - lazy loaded routes
import { lazy, Suspense } from 'react';

const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const Menu = lazy(() => import('./pages/Menu'));

export const App = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/orders" element={<OrderHistory />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/menu" element={<Menu />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

// ❌ BAD - all components loaded upfront
import OrderHistory from './pages/OrderHistory';
import UserProfile from './pages/UserProfile';
import Menu from './pages/Menu';
```

**Rationale:** Code splitting reduces initial bundle size and improves load time.

---

## Summary

These guardrails ensure:
- **Quality:** High code standards, comprehensive testing, maintainability
- **Security:** Protection against common vulnerabilities, data encryption
- **Performance:** Fast APIs, optimized frontend, efficient database queries
- **Consistency:** Standardized naming, formatting, and workflows
- **Maintainability:** Clean architecture, good error handling, documentation

**Enforcement:**
- Pre-commit hooks for linting, formatting, testing
- CI/CD pipeline blocks non-compliant code
- Code review ensures adherence to standards
- Automated monitoring tracks performance and security

**Questions or Clarifications?**
Refer to:
- [.claude/rules.md](../rules.md) - High-level rules
- [.ai/context/architecture.md](../../.ai/context/architecture.md) - Architecture decisions
- [.ai/prompts/coding-standard.md](../../.ai/prompts/coding-standard.md) - Coding standards

---

**This document is a living guide. Update it as the project evolves.**
