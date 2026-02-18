# FoodBot Developer Guide

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure Walkthrough](#project-structure-walkthrough)
- [Coding Standards](#coding-standards)
- [Testing Strategy](#testing-strategy)
- [Git Workflow](#git-workflow)
- [Common Tasks](#common-tasks)
- [Debugging Tips](#debugging-tips)
- [Tooling Reference](#tooling-reference)

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | >= 20 | Runtime for TypeScript services |
| pnpm | >= 8 | Package manager with workspace support |
| Docker | Latest | Infrastructure services |
| Docker Compose | Latest | Multi-container orchestration |
| Java | >= 17 | MCP Orchestrator (Spring Boot) |
| Git | Latest | Version control |

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

# 4. Start infrastructure
docker-compose up -d

# 5. Verify infrastructure health
pnpm docker:health

# 6. Run tests to verify setup
pnpm test:unit
```

### IDE Setup

**VS Code** (recommended):

Extensions:
- ESLint
- Prettier - Code formatter
- TypeScript Importer
- Jest Runner
- EditorConfig for VS Code

The project includes `.editorconfig` for consistent formatting across editors.

---

## Project Structure Walkthrough

### Monorepo Layout

FoodBot uses **pnpm workspaces** to manage a monorepo with three workspace roots:

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*          # Application packages
  - services/*      # Backend services
  - packages/*      # Shared libraries
```

### apps/gateway-api (NestJS Backend)

This is the main backend service. It follows NestJS modular architecture:

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

**Key patterns**:

- Each module has a `controller`, `service`, `module`, and `dto/` directory
- Controllers handle HTTP routing and request validation
- Services contain business logic
- DTOs use `class-validator` decorators for input validation
- Guards enforce authentication and authorization

### apps/customer-app (React Frontend)

```
apps/customer-app/src/
├── components/
│   ├── Chat/                  # Chat interface components
│   │   ├── ChatInterface.tsx  # Main chat container
│   │   ├── MessageCard.tsx    # Message display
│   │   ├── InputField.tsx     # Message input
│   │   ├── CTAButton.tsx      # Call-to-action buttons
│   │   ├── DynamicForm.tsx    # Dynamic form rendering
│   │   └── LoadingIndicator.tsx
│   ├── Restaurant/            # Restaurant browsing
│   ├── Dish/                  # Dish browsing
│   ├── Cart/                  # Cart management
│   ├── Order/                 # Order views
│   ├── Status/                # Order status tracking
│   └── common/                # Shared components (Button, Input, Card, etc.)
├── hooks/
│   ├── useRedux.ts            # Typed useSelector/useDispatch
│   ├── useJobPolling.ts       # Job status polling
│   ├── useDebounce.ts         # Debounced values
│   └── useInfiniteScroll.ts   # Infinite scroll pagination
├── services/
│   ├── api/axios.config.ts    # Axios instance configuration
│   ├── chat.service.ts        # Chat API client
│   ├── restaurant.service.ts  # Restaurant API client
│   └── ...
├── store/
│   ├── index.ts               # Redux store configuration
│   └── slices/
│       ├── chatSlice.ts       # Chat state management
│       ├── restaurantSlice.ts # Restaurant state
│       ├── dishSlice.ts       # Dish state
│       ├── cartSlice.ts       # Cart state
│       ├── orderSlice.ts      # Order state
│       └── userSlice.ts       # User state
└── test/
    ├── utils/                 # Test utilities (mockStore, renderWithProviders)
    └── factories/             # Test data factories
```

### packages/workflows (Temporal Workflows)

```
packages/workflows/src/
├── index.ts                   # Package entry point
├── activities/
│   └── index.ts               # All activity implementations (30+ activities)
├── workflows/
│   ├── index.ts               # Workflow exports
│   ├── searchRestaurant.workflow.ts  # Restaurant search workflow
│   ├── placeOrder.workflow.ts        # Order placement (saga pattern)
│   └── processPayment.workflow.ts    # Payment processing
└── __tests__/
    ├── searchRestaurant.workflow.test.ts
    ├── placeOrder.workflow.test.ts
    └── processPayment.workflow.test.ts
```

### services/mcp-orchestrator (Java/Spring Boot)

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

---

## Coding Standards

### TypeScript Style

- **Target**: ES2022
- **Module**: ESNext
- **Strict mode**: Enabled (all strict flags)
- **No unused variables/parameters**: Enforced via `noUnusedLocals` and `noUnusedParameters`
- **Explicit return types**: Encouraged but not enforced for all functions

### ESLint Rules

The project uses a comprehensive ESLint configuration (`eslint.config.js`) with:

- TypeScript-specific rules via `typescript-eslint`
- Security rules via `eslint-plugin-security`
- Code quality rules via `eslint-plugin-sonarjs`
- Import ordering via `eslint-plugin-import`
- Promise handling via `eslint-plugin-promise`
- React rules via `eslint-plugin-react` and `eslint-plugin-react-hooks`

### Formatting (Prettier)

Configured in `.prettierrc.cjs`:

```bash
# Check formatting
pnpm format:check

# Auto-format
pnpm format
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase | `ChatInterface.tsx` |
| Files (services) | kebab-case | `redis.service.ts` |
| Files (DTOs) | kebab-case | `create-restaurant.dto.ts` |
| Files (tests) | Same as source + suffix | `ChatInterface.test.tsx`, `auth.controller.e2e.spec.ts` |
| Classes | PascalCase | `AuthService` |
| Interfaces | PascalCase | `StoredUser` |
| Functions | camelCase | `createJob` |
| Variables | camelCase | `accessToken` |
| Constants | UPPER_SNAKE_CASE | `IS_PUBLIC_KEY` |
| Decorators | PascalCase | `@Public()`, `@Roles()` |
| Module names | PascalCase + "Module" | `AuthModule` |

### NestJS Module Pattern

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

### React Component Pattern

```typescript
// Component with typed props
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
  const { data, loading, error } = useAppSelector((state) => state.feature);

  return (
    <div data-testid={testId || 'my-component'}>
      {/* Component JSX */}
    </div>
  );
};
```

---

## Testing Strategy

### Test Types and File Naming

| Type | Extension | Runner | Description |
|------|-----------|--------|-------------|
| Unit | `.test.ts` / `.test.tsx` | Jest | Individual component/service tests |
| Integration | `.spec.ts` | Jest | HTTP endpoint tests with NestJS TestingModule |
| E2E | `.e2e.ts` | Playwright | Full browser-based tests |

### Unit Tests

Unit tests are co-located with source files in `__tests__/` directories:

```
src/components/Chat/__tests__/ChatInterface.test.tsx
src/modules/auth/__tests__/auth.controller.e2e.spec.ts
packages/workflows/src/__tests__/placeOrder.workflow.test.ts
```

**Writing unit tests**:

```typescript
// Component test
describe('ChatInterface', () => {
  it('should render the chat messages area', () => {
    const { getByTestId } = renderWithProviders(<ChatInterface />);
    expect(getByTestId('chat-messages')).toBeInTheDocument();
  });
});

// Service test
describe('AuthService', () => {
  it('should hash password on registration', async () => {
    const result = await authService.register(registerDto);
    expect(result.user.email).toBe(registerDto.email);
    expect(result.accessToken).toBeDefined();
  });
});
```

### Integration Tests

Integration tests use NestJS `Test.createTestingModule()` and Supertest:

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

  it('POST /auth/register should create a user', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'test1234', name: 'Test', phoneNumber: '+11234567890' })
      .expect(201)
      .expect((res) => {
        expect(res.body.accessToken).toBeDefined();
      });
  });
});
```

### Test Utilities

The project provides reusable test infrastructure:

- **Test factories** (`test/factories/`): Generate realistic test data using `@faker-js/faker`
- **Test module factory** (`test/utils/test-module.factory.ts`): Pre-configured NestJS test modules
- **Auth helper** (`test/utils/auth-helper.ts`): Generate JWT tokens for test users
- **Mock store** (`test/utils/mockStore.ts`): Pre-configured Redux store for component tests
- **Render with providers** (`test/utils/renderWithProviders.tsx`): Wrapped render for React components

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

## Git Workflow

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `feature/*` | New feature development |
| `fix/*` | Bug fixes |
| `refactor/*` | Code refactoring |
| `docs/*` | Documentation updates |

### Commit Message Format

```
<type>: <short description>

<optional body with details>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `ci`

### Pre-Commit Quality Gates

Before committing, ensure:

```bash
# Run quality check
pnpm quality:check

# This runs:
# 1. pnpm lint
# 2. pnpm format:check
# 3. pnpm test:coverage
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Create or update the DTO**:

```typescript
// apps/gateway-api/src/modules/feature/dto/create-feature.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateFeatureDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
```

2. **Add the controller method**:

```typescript
// apps/gateway-api/src/modules/feature/feature.controller.ts
@UseGuards(JwtAuthGuard)
@Post()
create(@Req() req: AuthenticatedRequest, @Body() dto: CreateFeatureDto) {
  return this.featureService.create(req.user.userId, dto);
}
```

3. **Implement the service logic**:

```typescript
// apps/gateway-api/src/modules/feature/feature.service.ts
@Injectable()
export class FeatureService {
  create(userId: string, dto: CreateFeatureDto) {
    // Business logic
  }
}
```

4. **Write tests**:

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

1. **Create the component**:

```typescript
// apps/customer-app/src/components/Feature/FeatureCard.tsx
export interface FeatureCardProps {
  'data-testid'?: string;
  feature: Feature;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  'data-testid': testId,
  feature,
}) => {
  return (
    <div data-testid={testId || 'feature-card'}>
      <h3>{feature.name}</h3>
    </div>
  );
};
```

2. **Write the test**:

```typescript
// apps/customer-app/src/components/Feature/__tests__/FeatureCard.test.tsx
describe('FeatureCard', () => {
  it('should render feature name', () => {
    const { getByText } = render(
      <FeatureCard feature={{ name: 'Test Feature' }} />
    );
    expect(getByText('Test Feature')).toBeInTheDocument();
  });
});
```

3. **Add a Redux slice** (if needed):

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
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeatures.pending, (state) => { state.loading = true; })
      .addCase(fetchFeatures.fulfilled, (state, action) => { ... });
  },
});
```

### Adding a New Temporal Workflow

1. **Define the workflow**:

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

  log.info('Workflow completed', { result });
  return result;
}
```

2. **Implement activities**:

```typescript
// packages/workflows/src/activities/index.ts
export async function step1(input: string): Promise<Result> {
  // Activity implementation
}
```

3. **Export from index**:

```typescript
// packages/workflows/src/workflows/index.ts
export { myWorkflow } from './myWorkflow.workflow';
```

4. **Write tests**:

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

**View NestJS logs**:

```bash
# NestJS uses Logger class with named contexts
# Look for log output like: [AuthService] User registered: user@example.com
```

**Debug a specific module**:

```typescript
// Add Logger to any service
private readonly logger = new Logger(MyService.name);

this.logger.log('Operation details', { context });
this.logger.error('Error occurred', error.stack);
this.logger.debug('Debug info', { data });
```

**Test a single endpoint**:

```bash
# Using curl
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test1234"}'
```

### Workflow Debugging

**View workflow executions**: Open Temporal UI at http://localhost:8080

**View workflow logs**: Temporal workflows use `log.info()` and `log.error()` which appear in Temporal UI

**Test workflows in isolation**:

```bash
pnpm test:unit -- --testPathPattern=workflow
```

### Redis Debugging

**View cached data**: Open Redis Commander at http://localhost:8081

**CLI access**:

```bash
docker exec -it foodbot-redis redis-cli -a foodbot-redis-password
> KEYS *
> GET "blacklist:some-token"
> TTL "rate_limit:login:user@example.com"
```

### Elasticsearch Debugging

**View indices and data**: Open Kibana at http://localhost:5601

**Direct API**:

```bash
# List indices
curl http://localhost:9200/_cat/indices

# Search an index
curl http://localhost:9200/restaurants/_search?pretty
```

### Kafka Debugging

**View topics and messages**: Open Kafka UI at http://localhost:8082

---

## Tooling Reference

### pnpm Scripts

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm test` | Run unit tests |
| `pnpm test:unit` | Run unit tests explicitly |
| `pnpm test:integration` | Run integration tests |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm test:all` | Run all test suites |
| `pnpm test:watch` | Run unit tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Auto-fix ESLint issues |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check code formatting |
| `pnpm quality:check` | Full quality check (lint + format + tests) |
| `pnpm quality:fix` | Auto-fix lint and formatting |
| `pnpm security:scan` | Run Snyk security scan |
| `pnpm sonar` | Run SonarQube analysis |
| `pnpm docker:up` | Start Docker infrastructure |
| `pnpm docker:down` | Stop Docker infrastructure |
| `pnpm docker:dev` | Start with dev overrides |
| `pnpm docker:health` | Check infrastructure health |
| `pnpm docker:logs` | View Docker service logs |
| `pnpm docker:clean` | Stop and remove volumes |
| `pnpm clean` | Remove build artifacts |

### AI Development Tools

| Command | Description |
|---------|-------------|
| `pnpm tool:apply-patch` | Apply code patches from AI |
| `pnpm tool:start-workflow` | Start a Temporal workflow |
| `pnpm tool:emit-event` | Emit an observability event |
| `pnpm tool:validate-workflow` | Validate workflow definitions |
| `pnpm ai:validate` | Validate AI configuration |
