/**
 * Diet Daily Scheduler Workflow Tests
 *
 * Tests for the daily diet plan meal ordering workflow.
 *
 * Coverage:
 * - Happy path: All meals ordered successfully
 * - No meals scheduled for today
 * - Some meals unavailable
 * - Order placement failure for a meal
 * - Nutrition log update failure (non-fatal)
 */

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import { createMockActivity } from '../test/utils/temporal-test-helper';

import type {
  ScheduledMeal,
  MealAvailabilityResult,
  AvailableMeal,
} from '../workflows/dietDailyScheduler.types';

// ============================================================================
// Mock Activities
// ============================================================================

const mockGetMealsForToday = createMockActivity<[string, string], ScheduledMeal[]>();
const mockValidateMealAvailability = createMockActivity<
  [ScheduledMeal[]],
  MealAvailabilityResult
>();
const mockPlaceMealOrder = createMockActivity<[string, AvailableMeal], void>();
const mockUpdateNutritionLog = createMockActivity<[string, string, number], void>();

function getMockActivities(): Record<string, unknown> {
  return {
    getMealsForToday: mockGetMealsForToday.fn,
    validateMealAvailability: mockValidateMealAvailability.fn,
    placeMealOrder: mockPlaceMealOrder.fn,
    updateNutritionLog: mockUpdateNutritionLog.fn,
  };
}

function resetMocks(): void {
  mockGetMealsForToday.reset();
  mockValidateMealAvailability.reset();
  mockPlaceMealOrder.reset();
  mockUpdateNutritionLog.reset();
}

function createScheduledMeal(overrides?: Partial<ScheduledMeal>): ScheduledMeal {
  return {
    mealId: 'meal-1',
    mealType: 'lunch',
    dishId: 'dish-1',
    dishName: 'Grilled Chicken',
    restaurantId: 'rest-1',
    restaurantName: 'FitKitchen',
    calories: 500,
    price: 250,
    deliveryAddress: '123 Main St',
    scheduledOrderTime: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('DietDailySchedulerWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(() => {
    resetMocks();
  });

  describe('Happy Path', () => {
    it('should order all available meals successfully', async () => {
      const { client, nativeConnection } = testEnv;

      const meals = [
        createScheduledMeal({ mealId: 'meal-1', mealType: 'breakfast' }),
        createScheduledMeal({ mealId: 'meal-2', mealType: 'lunch' }),
        createScheduledMeal({ mealId: 'meal-3', mealType: 'dinner' }),
      ];

      mockGetMealsForToday.respondWith(meals);
      mockValidateMealAvailability.respondWith({
        available: meals.map((m) => ({ ...m, waitMs: 0 })),
        unavailable: [],
      });
      mockPlaceMealOrder.respondWith(undefined);
      mockUpdateNutritionLog.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-diet',
        workflowsPath: require.resolve(
          '../workflows/dietDailyScheduler.workflow',
        ),
        activities: getMockActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'dietDailySchedulerWorkflow',
          {
            workflowId: 'test-diet-daily-happy',
            taskQueue: 'test-diet',
            args: [
              { userId: 'user-1', planId: 'plan-1', date: '2026-02-23' },
            ],
          },
        );
        return handle.result();
      });

      expect(result.mealsProcessed).toBe(3);
      expect(result.mealsOrdered).toBe(3);
      expect(result.mealsSkipped).toBe(0);
      expect(result.mealsFailed).toBe(0);
      expect(mockPlaceMealOrder.getCallCount()).toBe(3);
      expect(mockUpdateNutritionLog.getCallCount()).toBe(1);
    });
  });

  describe('No Meals Scheduled', () => {
    it('should return zero counts when no meals for today', async () => {
      const { client, nativeConnection } = testEnv;

      mockGetMealsForToday.respondWith([]);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-diet',
        workflowsPath: require.resolve(
          '../workflows/dietDailyScheduler.workflow',
        ),
        activities: getMockActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'dietDailySchedulerWorkflow',
          {
            workflowId: 'test-diet-daily-no-meals',
            taskQueue: 'test-diet',
            args: [
              { userId: 'user-1', planId: 'plan-1', date: '2026-02-23' },
            ],
          },
        );
        return handle.result();
      });

      expect(result.mealsProcessed).toBe(0);
      expect(result.mealsOrdered).toBe(0);
      expect(mockValidateMealAvailability.getCallCount()).toBe(0);
      expect(mockPlaceMealOrder.getCallCount()).toBe(0);
    });
  });

  describe('Partially Unavailable Meals', () => {
    it('should skip unavailable meals and order available ones', async () => {
      const { client, nativeConnection } = testEnv;

      const meal1 = createScheduledMeal({ mealId: 'meal-1', mealType: 'breakfast' });
      const meal2 = createScheduledMeal({ mealId: 'meal-2', mealType: 'lunch' });
      const meal3 = createScheduledMeal({ mealId: 'meal-3', mealType: 'dinner' });

      mockGetMealsForToday.respondWith([meal1, meal2, meal3]);
      mockValidateMealAvailability.respondWith({
        available: [
          { ...meal1, waitMs: 0 },
          { ...meal3, waitMs: 0 },
        ],
        unavailable: [meal2],
      });
      mockPlaceMealOrder.respondWith(undefined);
      mockUpdateNutritionLog.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-diet',
        workflowsPath: require.resolve(
          '../workflows/dietDailyScheduler.workflow',
        ),
        activities: getMockActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'dietDailySchedulerWorkflow',
          {
            workflowId: 'test-diet-daily-partial',
            taskQueue: 'test-diet',
            args: [
              { userId: 'user-1', planId: 'plan-1', date: '2026-02-23' },
            ],
          },
        );
        return handle.result();
      });

      expect(result.mealsProcessed).toBe(3);
      expect(result.mealsOrdered).toBe(2);
      expect(result.mealsSkipped).toBe(1);
      expect(mockPlaceMealOrder.getCallCount()).toBe(2);
    });
  });

  describe('Order Failure', () => {
    it('should count failed orders and continue with remaining', async () => {
      const { client, nativeConnection } = testEnv;

      const meals = [
        createScheduledMeal({ mealId: 'meal-1', mealType: 'breakfast' }),
        createScheduledMeal({ mealId: 'meal-2', mealType: 'lunch' }),
      ];

      mockGetMealsForToday.respondWith(meals);
      mockValidateMealAvailability.respondWith({
        available: meals.map((m) => ({ ...m, waitMs: 0 })),
        unavailable: [],
      });

      // First order fails all 3 retries, second succeeds
      mockPlaceMealOrder.throwErrors(
        new Error('Restaurant closed'),
        new Error('Restaurant closed'),
        new Error('Restaurant closed'),
      ).respondWith(undefined);
      mockUpdateNutritionLog.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-diet',
        workflowsPath: require.resolve(
          '../workflows/dietDailyScheduler.workflow',
        ),
        activities: getMockActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'dietDailySchedulerWorkflow',
          {
            workflowId: 'test-diet-daily-order-fail',
            taskQueue: 'test-diet',
            args: [
              { userId: 'user-1', planId: 'plan-1', date: '2026-02-23' },
            ],
          },
        );
        return handle.result();
      });

      expect(result.mealsOrdered).toBe(1);
      expect(result.mealsFailed).toBe(1);
    });
  });

  describe('Nutrition Log Failure', () => {
    it('should complete workflow even if nutrition log update fails', async () => {
      const { client, nativeConnection } = testEnv;

      const meals = [createScheduledMeal({ mealId: 'meal-1' })];

      mockGetMealsForToday.respondWith(meals);
      mockValidateMealAvailability.respondWith({
        available: [{ ...meals[0], waitMs: 0 }],
        unavailable: [],
      });
      mockPlaceMealOrder.respondWith(undefined);
      mockUpdateNutritionLog.throwErrors(new Error('DB error'));

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-diet',
        workflowsPath: require.resolve(
          '../workflows/dietDailyScheduler.workflow',
        ),
        activities: getMockActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'dietDailySchedulerWorkflow',
          {
            workflowId: 'test-diet-daily-nutrition-fail',
            taskQueue: 'test-diet',
            args: [
              { userId: 'user-1', planId: 'plan-1', date: '2026-02-23' },
            ],
          },
        );
        return handle.result();
      });

      // Workflow still completes
      expect(result.mealsOrdered).toBe(1);
    });
  });
});
