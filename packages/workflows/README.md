# FoodBot Workflows Package

Temporal workflow definitions and comprehensive test suite for the FoodBot platform.

## Overview

This package contains all Temporal workflow implementations for the FoodBot application, including:
- Search and discovery workflows
- Order management workflows
- Payment processing workflows
- Recommendation workflows
- LLM-powered intent detection workflows

## Structure

```
packages/workflows/
├── src/
│   ├── workflows/              # Workflow implementations
│   ├── activities/             # Activity implementations
│   ├── __tests__/              # Workflow tests
│   └── test/
│       ├── utils/              # Test utilities
│       ├── mocks/              # Activity mocks
│       └── factories/          # Test data factories
├── package.json
└── README.md
```

## Test Infrastructure

### Test Utilities (`src/test/utils/`)

- **TemporalTestHelper**: Manages Temporal test environment lifecycle
- **MockActivity**: Activity mock with call tracking and verification
- **LogCapture**: Capture and verify workflow logs

### Activity Mocks (`src/test/mocks/`)

44 comprehensive mocks covering:
- Search & Discovery (6 mocks)
- Order Management (11 mocks)
- Recommendations (5 mocks)
- LLM Operations (6 mocks)
- Notifications (4 mocks)
- Database Operations (4 mocks)
- Cache Operations (4 mocks)
- External Services (4 mocks)

### Test Data Factories (`src/test/factories/`)

24+ factory functions for generating test data:
- User contexts
- Restaurants and dishes
- Cart items and orders
- Payment details
- Recommendations
- LLM intents
- Workflow definitions

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Specific Test File
```bash
npm test -- searchRestaurant.workflow.test.ts
```

## Test Files

### ✅ Completed Tests

1. **searchRestaurant.workflow.test.ts** (11 tests)
   - Happy path with user context
   - Cache hit/miss scenarios
   - Retry logic (MCP API failures)
   - Fallback to secondary provider
   - Timeout handling
   - Workflow cancellation
   - Filter application
   - Result ranking

2. **placeOrder.workflow.test.ts** (12 tests)
   - End-to-end order placement
   - Payment failure with compensation
   - Order creation failure with refund
   - Inventory check failure
   - Cart validation
   - Notification handling
   - Saga pattern validation
   - Timeout scenarios
   - Idempotency

3. **processPayment.workflow.test.ts** (16 tests)
   - Card, UPI, and wallet payments
   - Gateway timeout and retry
   - Payment declined scenarios
   - Fraud detection
   - Exponential backoff
   - Idempotency and duplicate prevention
   - 3D Secure authentication
   - Partial authorization

### 📝 Template Tests (Ready for Implementation)

4. **searchDish.workflow.test.ts**
5. **orderTracking.workflow.test.ts**
6. **cancelOrder.workflow.test.ts**
7. **refundPayment.workflow.test.ts**
8. **generateRecommendations.workflow.test.ts**
9. **updatePreferences.workflow.test.ts**
10. **intentDetection.workflow.test.ts**
11. **workflowGeneration.workflow.test.ts**
12. **deliveryTracking.workflow.test.ts**

## Test Coverage Targets

| Workflow | Target Coverage | Status |
|----------|----------------|--------|
| Search Restaurant | 90%+ | ✅ Complete |
| Place Order | 90%+ | ✅ Complete |
| Process Payment | 90%+ | ✅ Complete |
| Other Workflows | 85%+ | 📝 Template |

## Writing New Tests

### Basic Pattern

```typescript
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import {
  mockActivity1,
  mockActivity2,
  resetAllMocks,
  getAllMockActivities
} from '../test/mocks/activity-mocks';
import { createInput } from '../test/factories/workflow-input.factory';

describe('MyWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(() => {
    resetAllMocks();
  });

  it('should execute successfully', async () => {
    const { client, nativeConnection } = testEnv;

    // Arrange
    mockActivity1.respondWith({ data: 'value' });
    mockActivity2.respondWith(true);

    const worker = await Worker.create({
      connection: nativeConnection,
      taskQueue: 'test',
      workflowsPath: require.resolve('../workflows/myWorkflow'),
      activities: getAllMockActivities(),
    });

    // Act
    const result = await worker.runUntil(async () => {
      const handle = await client.workflow.start('myWorkflow', {
        workflowId: 'test-1',
        taskQueue: 'test',
        args: [createInput()],
      });

      return await handle.result();
    });

    // Assert
    expect(result).toBeDefined();
    expect(mockActivity1.getCallCount()).toBe(1);
  });
});
```

### Testing Patterns

#### 1. Happy Path
```typescript
it('should complete successfully', async () => {
  mockActivity.respondWith(successResponse);
  const result = await runWorkflow();
  expect(result.status).toBe('success');
});
```

#### 2. Error Handling
```typescript
it('should handle activity failures', async () => {
  mockActivity.throwErrors(new Error('Failure'));
  await expect(runWorkflow()).rejects.toThrow();
});
```

#### 3. Retry Logic
```typescript
it('should retry on transient failures', async () => {
  mockActivity
    .throwErrors(error, error)  // Fail twice
    .respondWith(success);       // Then succeed

  const result = await runWorkflow();
  expect(mockActivity.getCallCount()).toBe(3);
});
```

#### 4. Compensation (Saga Pattern)
```typescript
it('should rollback on failure', async () => {
  mockStep1.respondWith(success);
  mockStep2.throwErrors(error);  // This fails
  mockCompensateStep1.respondWith(undefined);

  await expect(runWorkflow()).rejects.toThrow();
  expect(mockCompensateStep1.getCallCount()).toBe(1);
});
```

#### 5. Idempotency
```typescript
it('should prevent duplicate execution', async () => {
  const workflowId = 'unique-id';

  const result1 = await startWorkflow(workflowId);
  const handle = await client.workflow.getHandle(workflowId);
  const result2 = await handle.result();

  expect(result1).toEqual(result2);
  expect(mockActivity.getCallCount()).toBe(1);
});
```

## Best Practices

### 1. Test Isolation
- Reset all mocks between tests
- Use unique workflow IDs
- Clean up test environment after each test

### 2. Arrange-Act-Assert
- Arrange: Set up mocks and inputs
- Act: Execute workflow
- Assert: Verify results and mock calls

### 3. Descriptive Names
```typescript
// ❌ Bad
it('should work', async () => { ... });

// ✅ Good
it('should retry payment on transient network failure', async () => { ... });
```

### 4. Test All Paths
- Happy path
- Error scenarios
- Edge cases
- Boundary conditions

### 5. Verify Mock Calls
```typescript
expect(mockActivity.getCallCount()).toBe(1);
expect(mockActivity.wasCalledWith(expectedArgs)).toBe(true);

const calls = mockActivity.getCalls();
expect(calls[0][0]).toEqual(expectedFirstArg);
```

## Common Issues

### Issue: Test Timeout
```typescript
// ❌ Bad - No timeout
await worker.runUntil(async () => {
  return await handle.result();
});

// ✅ Good - With timeout
await worker.runUntil(async () => {
  const handle = await client.workflow.start('workflow', {
    workflowId: 'test',
    taskQueue: 'test',
    args: [input],
    workflowExecutionTimeout: '10s',  // Add timeout
  });
  return await handle.result();
});
```

### Issue: Mock Not Reset
```typescript
// ❌ Bad - Mocks retain state
describe('Tests', () => {
  it('test 1', async () => {
    mockActivity.respondWith(value1);
    // ... test
  });

  it('test 2', async () => {
    // mockActivity still has value1!
    // ... test
  });
});

// ✅ Good - Reset between tests
describe('Tests', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  it('test 1', async () => { ... });
  it('test 2', async () => { ... });
});
```

### Issue: Workflow Path Not Found
```typescript
// ❌ Bad - Relative path
workflowsPath: '../workflows/myWorkflow'

// ✅ Good - require.resolve
workflowsPath: require.resolve('../workflows/myWorkflow.workflow')
```

## Documentation

For detailed test generation documentation, see:
- [TEST_GENERATION_WORKFLOWS.md](/prompt-docs/TEST_GENERATION_WORKFLOWS.md)

For development guardrails:
- [development-guardrails.md](/.claude/rules/development-guardrails.md)

## Contributing

When adding new workflows:
1. Implement the workflow in `src/workflows/`
2. Create comprehensive tests in `src/__tests__/`
3. Follow the established test patterns
4. Ensure 85%+ test coverage
5. Update this README

## License

Proprietary - FoodBot Platform
