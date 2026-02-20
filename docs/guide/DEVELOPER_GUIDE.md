# FoodBot Developer Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure Walkthrough](#project-structure-walkthrough)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Strategy](#testing-strategy)
- [Common Tasks](#common-tasks)
- [Debugging Tips](#debugging-tips)
- [Tooling Reference](#tooling-reference)

---

## Getting Started

### Prerequisites

| Tool           | Version | Purpose                         |
| -------------- | ------- | ------------------------------- |
| Node.js        | >= 20   | Runtime for TypeScript services |
| pnpm           | >= 8    | Package manager                 |
| Docker         | Latest  | Infrastructure services         |
| Docker Compose | Latest  | Multi-container orchestration   |
| Java           | >= 17   | MCP Orchestrator (Spring Boot)  |
| Git            | Latest  | Version control                 |

### First-Time Setup

```bash
# 1. Clone the repository
git clone https://github.com/foodbot/foodbot.git
cd foodbot

# 2. Install dependencies
pnpm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your local configuration

# 4. Start infrastructure services
pnpm docker:up

# 5. Verify infrastructure health
pnpm docker:health

# 6. Run tests to verify setup
pnpm test:unit
```

### IDE Setup

**VS Code** (recommended):

**Required Extensions:**

- ESLint
- Prettier - Code formatter
- TypeScript Importer
- Jest Runner
- EditorConfig for VS Code

**Configuration:**

The project includes `.editorconfig` for consistent formatting. VS Code will auto-format on
save if Prettier is configured properly.

---

## Project Structure Walkthrough

### Monorepo Layout

FoodBot uses **pnpm workspaces** to manage a monorepo:

```yaml
# pnpm-workspace.yaml
packages:
  - apps/* # Application packages
  - services/* # Backend services
  - packages/* # Shared libraries
```

### Key Directories

```
FoodBot/
├── apps/                      # Application frontends and APIs
│   ├── gateway-api/           # Main NestJS backend (see below)
│   ├── customer-app/          # React customer frontend (see below)
│   ├── restaurant-app/        # Restaurant dashboard (React)
│   ├── mobile-app/            # React Native mobile app
│   └── backend/               # Additional backend services
├── services/                  # Microservices
│   ├── mcp-orchestrator/      # Java/Spring Boot MCP aggregator
│   ├── search-orchestrator/   # TypeScript search service
│   ├── mcp-adapter/           # MCP provider adapter
│   └── notification-service/  # Notification service
├── packages/                  # Shared libraries
│   ├── workflows/             # Temporal workflow definitions
│   ├── events/                # Event schemas and publishers
│   ├── security/              # Security utilities
│   ├── shared/                # Shared types and utilities
│   ├── llm-router/            # LLM routing logic
│   └── monitoring/            # Monitoring utilities
├── docs/                      # Documentation
├── scripts/                   # Build and deployment scripts
├── e2e/                       # End-to-end Playwright tests
└── .claude/                   # AI-assisted development rules
    ├── rules/                 # Development guardrails
    └── project-management/    # Project docs and architecture
        └── architecture/      # Detailed architecture documentation
```

### apps/gateway-api (NestJS Backend)

**Main backend service** providing REST APIs for all clients.

```
apps/gateway-api/src/
├── app.module.ts              # Root module
├── main.ts                    # Application entry point
├── main.prod.ts               # Production entry point
├── modules/                   # Feature modules
│   ├── auth/                  # Authentication & authorization
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts # Routes: /auth/*
│   │   ├── auth.service.ts    # Business logic
│   │   ├── dto/               # Request/response DTOs
│   │   │   ├── register.dto.ts
│   │   │   ├── login.dto.ts
│   │   │   └── ...
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts  # JWT verification
│   │   │   └── roles.guard.ts     # RBAC authorization
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts
│   │   └── decorators/
│   │       ├── public.decorator.ts    # @Public()
│   │       ├── roles.decorator.ts     # @Roles()
│   │       └── current-user.decorator.ts
│   ├── restaurant/            # Restaurant CRUD
│   ├── dish/                  # Dish CRUD
│   ├── cart/                  # Cart management
│   ├── order/                 # Order management
│   ├── payment/               # Payment processing
│   ├── feedback/              # Ratings and feedback
│   ├── user/                  # User profiles
│   ├── chat/                  # AI chat interface
│   ├── search/                # Search endpoints
│   ├── jobs/                  # Async job status
│   ├── admin/                 # Admin operations
│   └── health/                # Health checks
├── entities/                  # TypeORM entities
├── services/                  # Shared services (Redis, Email)
├── temporal/                  # Temporal client integration
├── mcp/                       # MCP provider clients
├── config/                    # Configuration modules
├── filters/                   # Exception filters
├── interceptors/              # Logging, timeout interceptors
├── events/                    # Kafka event producers
├── database/
│   └── seeds/                 # Database seed data
├── test/                      # Test utilities
│   ├── factories/             # Test data factories
│   │   ├── user.factory.ts
│   │   ├── restaurant.factory.ts
│   │   ├── dish.factory.ts
│   │   └── order.factory.ts
│   └── utils/                 # Test helpers
│       ├── test-module.factory.ts
│       └── auth-helper.ts
└── test-helpers/              # Additional test utilities
```

**Key Patterns:**

- Each module follows: `controller` → `service` → `repository`
- DTOs use `class-validator` for input validation
- Guards enforce authentication and authorization
- Services contain business logic
- Controllers handle HTTP routing only

**For detailed architecture**, see:
`.claude/project-management/architecture/components/backend/nestjs-architecture.md`

### apps/customer-app (React Frontend)

**Customer-facing web application** built with React, Redux Toolkit, and TypeScript.

```
apps/customer-app/src/
├── components/
│   ├── Chat/                  # AI chat interface
│   │   ├── ChatInterface.tsx  # Main container
│   │   ├── MessageCard.tsx    # Message display
│   │   ├── InputField.tsx
│   │   ├── CTAButton.tsx      # Action buttons
│   │   ├── DynamicForm.tsx    # Dynamic form rendering
│   │   └── LoadingIndicator.tsx
│   ├── Restaurant/            # Restaurant browsing
│   ├── Dish/                  # Dish browsing
│   ├── Cart/                  # Cart management
│   ├── Order/                 # Order views
│   ├── Status/                # Order status tracking
│   ├── Search/                # Search components
│   ├── Job/                   # Job status polling
│   ├── AccountLinking/        # OAuth provider linking
│   └── common/                # Shared components (Button, Input, Card)
├── hooks/
│   ├── useRedux.ts            # Typed Redux hooks
│   ├── useJobPolling.ts       # Job status polling
│   ├── useDebounce.ts
│   └── ...
├── services/
│   ├── api/
│   │   └── axios.config.ts    # Axios instance
│   ├── chat.service.ts        # Chat API client
│   ├── restaurant.service.ts  # Restaurant API
│   ├── order.service.ts
│   └── ...
├── store/
│   ├── index.ts               # Redux store config
│   └── slices/
│       ├── chatSlice.ts
│       ├── restaurantSlice.ts
│       ├── dishSlice.ts
│       ├── cartSlice.ts
│       ├── orderSlice.ts
│       ├── userSlice.ts
│       └── accountLinkingSlice.ts
├── pages/                     # Page components
├── types/                     # TypeScript type definitions
└── test/                      # Test utilities
    ├── utils/                 # mockStore, renderWithProviders
    └── factories/             # Test data factories
```

**For detailed frontend architecture**, see:
`.claude/project-management/architecture/components/frontend/`

### packages/workflows (Temporal Workflows)

**Distributed workflow orchestration** using Temporal.

```
packages/workflows/src/
├── workflows/
│   ├── searchRestaurant.workflow.ts   # Restaurant search
│   ├── placeOrder.workflow.ts         # Order placement (saga)
│   ├── processPayment.workflow.ts     # Payment processing
│   ├── orderFulfillment.workflow.ts   # Order fulfillment
│   ├── userOnboarding.workflow.ts     # User onboarding
│   ├── restaurantOnboarding.workflow.ts
│   └── index.ts
├── activities/
│   ├── database.activities.ts         # Database operations
│   ├── notification.activities.ts     # Notifications
│   └── ...
├── test/
│   ├── mocks/
│   │   └── activity-mocks.ts
│   ├── utils/
│   │   └── temporal-test-helper.ts
│   └── factories/
│       └── workflow-input.factory.ts
├── types/                             # Workflow type definitions
└── __tests__/                         # Workflow tests
    ├── placeOrder.workflow.test.ts
    ├── processPayment.workflow.test.ts
    └── ...
```

**For workflow architecture**, see:
`.claude/project-management/architecture/components/workflows/`

### services/mcp-orchestrator (Java/Spring Boot)

**Multi-provider aggregation service** for restaurant and menu data.

```
services/mcp-orchestrator/src/main/java/com/foodbot/mcp/
├── MCPOrchestratorApplication.java    # Spring Boot entry
├── controller/                        # REST controllers
│   ├── SearchController.java
│   ├── RestaurantController.java
│   ├── DishController.java
│   └── ...
├── providers/                         # MCP provider clients
│   ├── MCPProviderClient.java
│   ├── swiggy/
│   ├── zomato/
│   └── mock/                          # Mock provider
├── search/                            # Elasticsearch services
│   ├── ElasticsearchService.java
│   ├── SearchIndexer.java
│   └── ...
├── cache/                             # Redis caching
├── router/                            # Provider routing
├── aggregator/                        # Result aggregation
├── resilience/                        # Circuit breaker, retry
├── consumers/                         # Kafka consumers
├── repository/                        # Spring Data repositories
├── config/                            # Spring configuration
└── model/                             # Domain models
```

**For MCP architecture**, see: `.claude/project-management/architecture/components/mcp/`

---

## Development Workflow

### Git Workflow

**Branch Strategy:**

| Branch         | Purpose              |
| -------------- | -------------------- |
| `main`         | Production-ready     |
| `feature/*`    | New features         |
| `fix/*`        | Bug fixes            |
| `refactor/*`   | Code refactoring     |
| `docs/*`       | Documentation        |
| `chore/*`      | Maintenance tasks    |
| `test/*`       | Test improvements    |

**Commit Message Format:**

```
<type>: <short description>

<optional detailed body>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`, `perf`

**Examples:**

```bash
feat: add JWT authentication to auth module
fix: resolve race condition in cart state
refactor: extract OAuth logic into separate service
docs: update API documentation for order endpoints
test: add integration tests for payment flow
chore: update dependencies to latest versions
```

### Pre-Commit Quality Checks

```bash
# Run full quality check
pnpm quality:check

# This runs:
# 1. pnpm lint          - ESLint checks
# 2. pnpm format:check  - Prettier formatting
# 3. pnpm test:coverage - Unit + integration tests with coverage

# Auto-fix issues
pnpm quality:fix      # Fixes lint and formatting issues
```

### Code Review Checklist

Before submitting a PR:

- [ ] All tests pass (`pnpm test:all`)
- [ ] Code coverage >= 80%
- [ ] ESLint has no errors or warnings
- [ ] Code is formatted with Prettier
- [ ] Type checking passes (`pnpm typecheck`)
- [ ] No console.log or debugger statements
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention

---

## Coding Standards

**Full standards are documented in:**
`.claude/rules/development-guardrails.md`

### TypeScript Configuration

- **Target:** ES2022
- **Module:** ESNext
- **Strict mode:** Enabled (all strict flags)
- **Configuration:** `tsconfig.json` in project root

### ESLint Configuration

Located at: `/Users/arpan1.mukherjee/code/FoodBot/eslint.config.js`

**Key rules:**

- TypeScript strict rules enabled
- Import ordering enforced
- React hooks rules
- Security rules (via `eslint-plugin-security`)
- Code quality rules (via `eslint-plugin-sonarjs`)
- Complexity limits (max 10 per function)
- Max file length: 500 lines

```bash
# Run linting
pnpm lint

# Auto-fix issues
pnpm lint:fix
```

### Prettier Configuration

Located at: `/Users/arpan1.mukherjee/code/FoodBot/.prettierrc.cjs`

**Settings:**

- Print width: 100
- Tab width: 2 spaces
- Single quotes: Yes
- Semicolons: Yes
- Trailing commas: ES5
- Arrow function parens: avoid
- Line endings: LF

```bash
# Check formatting
pnpm format:check

# Auto-format all files
pnpm format
```

### Naming Conventions

| Item                  | Convention                   | Example                                   |
| --------------------- | ---------------------------- | ----------------------------------------- |
| Files (components)    | PascalCase                   | `ChatInterface.tsx`                       |
| Files (services)      | kebab-case                   | `auth.service.ts`                         |
| Files (DTOs)          | kebab-case                   | `create-restaurant.dto.ts`                |
| Files (tests)         | Same as source + suffix      | `auth.service.test.ts`, `auth.e2e.spec.ts`|
| Classes               | PascalCase                   | `AuthService`, `OrderController`          |
| Interfaces            | PascalCase (no I prefix)     | `User`, `OrderRepository`                 |
| Functions             | camelCase                    | `createOrder`, `getUserById`              |
| Variables             | camelCase                    | `accessToken`, `userId`                   |
| Constants             | UPPER_SNAKE_CASE             | `MAX_RETRY_ATTEMPTS`, `API_BASE_URL`      |
| Decorators            | PascalCase                   | `@Public()`, `@Roles('admin')`            |
| Module names          | PascalCase + "Module"        | `AuthModule`, `OrderModule`               |

### NestJS Module Pattern

```typescript
// 1. Module definition (feature.module.ts)
@Module({
  imports: [TypeOrmModule.forFeature([FeatureEntity])],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService], // if shared with other modules
})
export class FeatureModule {}

// 2. Controller (feature.controller.ts)
@Controller('feature')
@UseGuards(JwtAuthGuard)
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Get()
  async findAll(): Promise<FeatureDto[]> {
    return this.featureService.findAll();
  }

  @Post()
  async create(@Body() dto: CreateFeatureDto): Promise<FeatureDto> {
    return this.featureService.create(dto);
  }
}

// 3. Service (feature.service.ts)
@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);

  constructor(
    @InjectRepository(FeatureEntity)
    private readonly featureRepository: Repository<FeatureEntity>
  ) {}

  async findAll(): Promise<FeatureDto[]> {
    const entities = await this.featureRepository.find();
    return entities.map(e => this.toDto(e));
  }
}

// 4. DTO (dto/create-feature.dto.ts)
export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
```

### React Component Pattern

```typescript
export interface MyComponentProps {
  'data-testid'?: string;
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  'data-testid': testId,
  title,
  onAction,
}) => {
  const dispatch = useAppDispatch();
  const { data, loading, error } = useAppSelector(state => state.feature);

  useEffect(() => {
    dispatch(fetchFeatureData());
  }, [dispatch]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div data-testid={testId || 'my-component'}>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

---

## Testing Strategy

### Test Types

| Type        | Extension                    | Runner     | Description                          |
| ----------- | ---------------------------- | ---------- | ------------------------------------ |
| Unit        | `.test.ts`, `.test.tsx`      | Jest       | Component/service tests              |
| Integration | `.spec.ts`, `.e2e.spec.ts`   | Jest       | HTTP endpoint tests                  |
| E2E         | `.e2e.ts`                    | Playwright | Full browser-based tests             |

### Test Locations

Tests are co-located with source files:

```
src/modules/auth/__tests__/auth.controller.e2e.spec.ts
src/components/Chat/__tests__/ChatInterface.test.tsx
packages/workflows/src/__tests__/placeOrder.workflow.test.ts
```

### Running Tests

```bash
# Unit tests only
pnpm test:unit

# Integration tests
pnpm test:integration

# E2E tests (Playwright)
pnpm test:e2e

# Run all tests
pnpm test:all

# Watch mode (unit tests)
pnpm test:watch

# With coverage report
pnpm test:coverage
```

### Test Utilities

**Backend (NestJS):**

- **Test factories:** `/apps/gateway-api/src/test/factories/`
  - `user.factory.ts` - Generate test users
  - `restaurant.factory.ts` - Generate test restaurants
  - `dish.factory.ts` - Generate test dishes
  - `order.factory.ts` - Generate test orders
- **Test helpers:** `/apps/gateway-api/src/test/utils/`
  - `test-module.factory.ts` - Pre-configured NestJS test modules
  - `auth-helper.ts` - Generate JWT tokens for tests

**Frontend (React):**

- **Test utilities:** `/apps/customer-app/src/test/utils/`
  - `mockStore.ts` - Pre-configured Redux store
  - `renderWithProviders.tsx` - Wrapped render function

**Workflows (Temporal):**

- **Test helpers:** `/packages/workflows/src/test/`
  - `utils/temporal-test-helper.ts` - Temporal test environment
  - `mocks/activity-mocks.ts` - Mock activity implementations
  - `factories/workflow-input.factory.ts` - Test data factories

### Writing Tests

**Unit Test Example (Service):**

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepository: jest.Mocked<Repository<User>>;

  beforeEach(() => {
    mockUserRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as any;

    service = new AuthService(mockUserRepository);
  });

  it('should register a new user', async () => {
    const dto = { email: 'test@example.com', password: 'password123', name: 'Test User' };
    mockUserRepository.save.mockResolvedValue({ id: '1', ...dto } as User);

    const result = await service.register(dto);

    expect(result.user.email).toBe(dto.email);
    expect(result.accessToken).toBeDefined();
  });
});
```

**Integration Test Example (Controller):**

```typescript
describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/register should create a user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        phoneNumber: '+11234567890',
      })
      .expect(201)
      .expect(res => {
        expect(res.body.accessToken).toBeDefined();
      });
  });
});
```

**React Component Test Example:**

```typescript
describe('ChatInterface', () => {
  it('should render chat messages', () => {
    const { getByTestId } = renderWithProviders(<ChatInterface />);
    expect(getByTestId('chat-messages')).toBeInTheDocument();
  });
});
```

### Coverage Requirements

Configured in `jest.config.cjs`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Create the DTO:**

```typescript
// apps/gateway-api/src/modules/feature/dto/create-feature.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
```

2. **Add controller method:**

```typescript
// apps/gateway-api/src/modules/feature/feature.controller.ts
@UseGuards(JwtAuthGuard)
@Post()
async create(
  @CurrentUser() user: User,
  @Body() dto: CreateFeatureDto
): Promise<FeatureDto> {
  return this.featureService.create(user.id, dto);
}
```

3. **Implement service logic:**

```typescript
// apps/gateway-api/src/modules/feature/feature.service.ts
@Injectable()
export class FeatureService {
  async create(userId: string, dto: CreateFeatureDto): Promise<FeatureDto> {
    // Business logic here
  }
}
```

4. **Write tests:**

```typescript
// apps/gateway-api/src/modules/feature/__tests__/feature.controller.e2e.spec.ts
it('POST /feature should create a feature', () => {
  return request(app.getHttpServer())
    .post('/feature')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Feature' })
    .expect(201);
});
```

### Adding a New React Component

1. **Create the component:**

```typescript
// apps/customer-app/src/components/Feature/FeatureCard.tsx
export interface FeatureCardProps {
  'data-testid'?: string;
  feature: Feature;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ 'data-testid': testId, feature }) => {
  return (
    <div data-testid={testId || 'feature-card'}>
      <h3>{feature.name}</h3>
    </div>
  );
};
```

2. **Write the test:**

```typescript
// apps/customer-app/src/components/Feature/__tests__/FeatureCard.test.tsx
describe('FeatureCard', () => {
  it('should render feature name', () => {
    const { getByText } = render(<FeatureCard feature={{ name: 'Test' }} />);
    expect(getByText('Test')).toBeInTheDocument();
  });
});
```

3. **Add Redux slice (if needed):**

```typescript
// apps/customer-app/src/store/slices/featureSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchFeatures = createAsyncThunk('feature/fetchAll', async () => {
  // API call
});

const featureSlice = createSlice({
  name: 'feature',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchFeatures.pending, state => {
        state.loading = true;
      })
      .addCase(fetchFeatures.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      });
  },
});

export default featureSlice.reducer;
```

### Adding a New Temporal Workflow

1. **Define the workflow:**

```typescript
// packages/workflows/src/workflows/myWorkflow.workflow.ts
import { proxyActivities, log } from '@temporalio/workflow';

interface Activities {
  step1(input: string): Promise<Result>;
  step2(data: Result): Promise<FinalResult>;
}

const { step1, step2 } = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});

export async function myWorkflow(input: WorkflowInput): Promise<WorkflowResult> {
  log.info('Starting workflow', { input });
  const intermediate = await step1(input.data);
  const result = await step2(intermediate);
  return result;
}
```

2. **Export from index:**

```typescript
// packages/workflows/src/workflows/index.ts
export { myWorkflow } from './myWorkflow.workflow';
```

3. **Write tests:**

```typescript
// packages/workflows/src/__tests__/myWorkflow.workflow.test.ts
import { TestWorkflowEnvironment } from '@temporalio/testing';

describe('myWorkflow', () => {
  it('should complete successfully', async () => {
    // Test with mocked activities
  });
});
```

---

## Debugging Tips

### Gateway API Debugging

**View logs:**

NestJS uses `Logger` class with named contexts:

```typescript
private readonly logger = new Logger(MyService.name);

this.logger.log('Operation completed', { context });
this.logger.error('Error occurred', error.stack);
this.logger.debug('Debug info', { data });
```

**Test a single endpoint:**

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'
```

### Workflow Debugging

**View workflow executions:** Open Temporal UI at http://localhost:8080

**View workflow logs:** Temporal workflows use `log.info()` which appears in Temporal UI

**Test workflows in isolation:**

```bash
pnpm test:unit -- --testPathPattern=workflow
```

### Infrastructure Debugging

**Redis:** Open Redis Commander at http://localhost:8081

```bash
docker exec -it foodbot-redis redis-cli -a foodbot-redis-password
> KEYS *
> GET "blacklist:some-token"
```

**Elasticsearch/Kibana:** http://localhost:5601

**Kafka UI:** http://localhost:8082

**PostgreSQL:**

```bash
docker exec -it foodbot-postgres psql -U foodbot -d foodbot
```

---

## Tooling Reference

### pnpm Scripts

| Command                 | Description                              |
| ----------------------- | ---------------------------------------- |
| `pnpm install`          | Install all dependencies                 |
| `pnpm test`             | Run unit tests                           |
| `pnpm test:unit`        | Run unit tests                           |
| `pnpm test:integration` | Run integration tests                    |
| `pnpm test:e2e`         | Run E2E tests (Playwright)               |
| `pnpm test:all`         | Run all test suites                      |
| `pnpm test:watch`       | Run unit tests in watch mode             |
| `pnpm test:coverage`    | Run tests with coverage report           |
| `pnpm lint`             | Run ESLint                               |
| `pnpm lint:fix`         | Auto-fix ESLint issues                   |
| `pnpm format`           | Format code with Prettier                |
| `pnpm format:check`     | Check code formatting                    |
| `pnpm typecheck`        | Run TypeScript type checking             |
| `pnpm quality:check`    | Full quality check (lint + format + test)|
| `pnpm quality:fix`      | Auto-fix lint and formatting             |
| `pnpm security:scan`    | Run Snyk security scan                   |
| `pnpm docker:up`        | Start Docker infrastructure              |
| `pnpm docker:down`      | Stop Docker infrastructure               |
| `pnpm docker:dev`       | Start with dev overrides                 |
| `pnpm docker:health`    | Check infrastructure health              |
| `pnpm docker:logs`      | View Docker service logs                 |
| `pnpm docker:clean`     | Stop and remove volumes                  |

### Docker Services

When running `pnpm docker:up`, the following services start:

- **PostgreSQL:** Port 5432 (Database)
- **Redis:** Port 6379 (Cache & sessions)
- **Redis Commander:** Port 8081 (Redis UI)
- **Temporal Server:** Port 7233 (Workflow engine)
- **Temporal UI:** Port 8080 (Workflow UI)
- **Elasticsearch:** Port 9200 (Search)
- **Kibana:** Port 5601 (Elasticsearch UI)
- **Kafka:** Port 9092 (Event streaming)
- **Kafka UI:** Port 8082 (Kafka UI)

---

## Additional Resources

### Architecture Documentation

For detailed architecture documentation, see:

- **Backend:** `.claude/project-management/architecture/components/backend/`
- **Frontend:** `.claude/project-management/architecture/components/frontend/`
- **Workflows:** `.claude/project-management/architecture/components/workflows/`
- **MCP:** `.claude/project-management/architecture/components/mcp/`
- **System Architecture:** `.claude/project-management/architecture/system-architecture.md`

### Development Guardrails

Comprehensive coding standards and best practices:

`.claude/rules/development-guardrails.md`

### Project Management

For task tracking and progress:

`.claude/project-management/`

---

**Questions or issues?** Check the architecture documentation or open an issue in the project
repository.
