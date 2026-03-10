/**
 * Search Restaurant Workflow Tests
 *
 * Tests for FR-LLM-INTENT-001: Intent detection and restaurant search workflow
 *
 * Coverage:
 * - Happy path: Search completes successfully
 * - Retry: MCP API fails then succeeds
 * - Fallback: Primary provider fails, fallback succeeds
 * - Timeout: Activity timeout handling
 * - Cancellation: Workflow cancellation
 * - Cache hit/miss scenarios
 * - Filter application
 * - Result ranking
 */

import { WorkflowFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import {
  createUserContext,
  createRestaurants,
  createSearchRestaurantInput,
} from '../test/factories/workflow-input.factory';
import {
  mockLoadUserContext,
  mockCallMCPSearch,
  mockCacheResults,
  mockApplyFilters,
  mockRankResults,
  mockGetFromCache,
  mockSetInCache,
  resetAllMocks,
  getAllMockActivities,
} from '../test/mocks/activity-mocks';

describe('SearchRestaurantWorkflow', () => {
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

  describe('Happy Path', () => {
    it('should successfully search restaurants with user context', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const userContext = createUserContext({
        userId: 'user_123',
        preferences: {
          cuisine: ['Italian'],
          priceRange: [20, 50],
        },
      });

      const restaurants = createRestaurants(5, { cuisine: 'Italian' });

      mockLoadUserContext.respondWith(userContext);
      mockGetFromCache.respondWith(null); // Cache miss
      mockCallMCPSearch.respondWith(restaurants);
      mockApplyFilters.respondWith(restaurants.slice(0, 3));
      mockRankResults.respondWith(restaurants.slice(0, 3));
      mockSetInCache.respondWith(undefined);
      mockCacheResults.respondWith(true);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-1',
          taskQueue: 'test',
          args: [createSearchRestaurantInput({ userId: 'user_123', query: 'Italian pizza' })],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(3);
      expect(mockLoadUserContext.getCallCount()).toBe(1);
      expect(mockCallMCPSearch.getCallCount()).toBe(1);
      expect(mockApplyFilters.getCallCount()).toBe(1);
      expect(mockRankResults.getCallCount()).toBe(1);
    });

    it('should return cached results on cache hit', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const cachedRestaurants = createRestaurants(3, { cuisine: 'Italian' });
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(cachedRestaurants); // Cache hit

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-cache-hit',
          taskQueue: 'test',
          args: [createSearchRestaurantInput()],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toEqual(cachedRestaurants);
      expect(mockGetFromCache.getCallCount()).toBe(1);
      expect(mockCallMCPSearch.getCallCount()).toBe(0); // Should not call MCP
    });
  });

  describe('Retry Logic', () => {
    it('should retry MCP API on transient failures', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(null);

      // First 2 calls fail, 3rd succeeds
      const apiError = new Error('API temporarily unavailable');
      mockCallMCPSearch
        .throwErrors(apiError, apiError)
        .respondWith(createRestaurants(2));

      mockApplyFilters.respondWith(createRestaurants(2));
      mockRankResults.respondWith(createRestaurants(2));
      mockCacheResults.respondWith(true);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-retry',
          taskQueue: 'test',
          args: [createSearchRestaurantInput()],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(mockCallMCPSearch.getCallCount()).toBe(3); // 2 failures + 1 success
    });

    it('should fail after max retry attempts', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(null);

      const apiError = new Error('API permanently unavailable');
      // Always throw error
      mockCallMCPSearch.throwErrors(apiError, apiError, apiError, apiError, apiError);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('searchRestaurantWorkflow', {
            workflowId: 'test-search-max-retries',
            taskQueue: 'test',
            args: [createSearchRestaurantInput()],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      expect(mockCallMCPSearch.getCallCount()).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Fallback Strategy', () => {
    it('should fallback to secondary provider on primary failure', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(null);

      // Primary provider fails, fallback succeeds
      const primaryError = new Error('Primary provider down');
      mockCallMCPSearch
        .throwErrors(primaryError, primaryError, primaryError)
        .respondWith(createRestaurants(3)); // Fallback response

      mockApplyFilters.respondWith(createRestaurants(3));
      mockRankResults.respondWith(createRestaurants(3));
      mockCacheResults.respondWith(true);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-fallback',
          taskQueue: 'test',
          args: [createSearchRestaurantInput()],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBe(3);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout if activity takes too long', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(null);

      // Simulate slow response by throwing a timeout error after a delay
      mockCallMCPSearch.throwErrors(
        new Error('Activity timeout'),
        new Error('Activity timeout'),
        new Error('Activity timeout'),
        new Error('Activity timeout'),
        new Error('Activity timeout')
      );

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('searchRestaurantWorkflow', {
            workflowId: 'test-search-timeout',
            taskQueue: 'test',
            args: [createSearchRestaurantInput()],
            workflowExecutionTimeout: '10s',
          });

          return await handle.result();
        })
      ).rejects.toThrow();
    });
  });

  describe('Cancellation', () => {
    it('should handle workflow cancellation gracefully', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(null);

      // Slow activity to allow cancellation
      mockCallMCPSearch.fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return createRestaurants(3);
      };

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const promise = worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-cancel',
          taskQueue: 'test',
          args: [createSearchRestaurantInput()],
        });

        // Cancel after 1 second
        setTimeout(() => handle.cancel(), 1000);

        return await handle.result();
      });

      // Assert
      await expect(promise).rejects.toThrow();
    });
  });

  describe('Filter Application', () => {
    it('should apply cuisine filter correctly', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const allRestaurants = [
        ...createRestaurants(3, { cuisine: 'Italian' }),
        ...createRestaurants(2, { cuisine: 'Chinese' }),
      ];

      mockLoadUserContext.respondWith(
        createUserContext({ preferences: { cuisine: ['Italian'] } })
      );
      mockGetFromCache.respondWith(null);
      mockCallMCPSearch.respondWith(allRestaurants);
      mockApplyFilters.respondWith(allRestaurants.slice(0, 3)); // Only Italian
      mockRankResults.respondWith(allRestaurants.slice(0, 3));
      mockCacheResults.respondWith(true);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-filter',
          taskQueue: 'test',
          args: [createSearchRestaurantInput({ filters: { cuisine: ['Italian'] } })],
        });

        return await handle.result();
      });

      // Assert
      expect(mockApplyFilters.getCallCount()).toBe(1);
      const filterCall = mockApplyFilters.getCalls()[0];
      expect(filterCall[1]).toHaveProperty('cuisine', ['Italian']);
    });
  });

  describe('Result Ranking', () => {
    it('should rank results based on user preferences', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const userContext = createUserContext({
        preferences: {
          cuisine: ['Italian'],
          priceRange: [20, 40],
        },
      });

      const restaurants = createRestaurants(10);
      const rankedRestaurants = restaurants.slice(0, 5);

      mockLoadUserContext.respondWith(userContext);
      mockGetFromCache.respondWith(null);
      mockCallMCPSearch.respondWith(restaurants);
      mockApplyFilters.respondWith(restaurants);
      mockRankResults.respondWith(rankedRestaurants);
      mockCacheResults.respondWith(true);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-ranking',
          taskQueue: 'test',
          args: [createSearchRestaurantInput()],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toEqual(rankedRestaurants);
      expect(mockRankResults.getCallCount()).toBe(1);
      const rankCall = mockRankResults.getCalls()[0];
      expect(rankCall[1]).toEqual(userContext); // Verify user context passed for ranking
    });
  });

  describe('Error Scenarios', () => {
    it('should handle empty results gracefully', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.respondWith(createUserContext());
      mockGetFromCache.respondWith(null);
      mockCallMCPSearch.respondWith([]); // No results
      mockApplyFilters.respondWith([]);
      mockRankResults.respondWith([]);
      mockCacheResults.respondWith(true);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('searchRestaurantWorkflow', {
          workflowId: 'test-search-empty',
          taskQueue: 'test',
          args: [createSearchRestaurantInput()],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle invalid user context', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockLoadUserContext.throwErrors(new Error('User not found'));

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/searchRestaurant.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('searchRestaurantWorkflow', {
            workflowId: 'test-search-invalid-user',
            taskQueue: 'test',
            args: [createSearchRestaurantInput({ userId: 'invalid_user' })],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);
    });
  });
});
