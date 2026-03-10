/**
 * User Onboarding Workflow Tests
 *
 * Tests for the multi-day user onboarding sequence.
 *
 * Coverage:
 * - Happy path: Full onboarding sequence with discount
 * - User places order before discount: Discount skipped
 * - Email send failures
 * - Signal handling for first order
 */

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import {
  mockSendEmail,
  mockLoadFromDatabase,
  mockSaveToDatabase,
  mockUpdateDatabase,
  mockNotifyCustomer,
  resetAllMocks,
  getAllMockActivities,
} from '../test/mocks/activity-mocks';

describe('UserOnboardingWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createTimeSkipping();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Happy Path', () => {
    it('should complete full onboarding with discount code', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockSendEmail.respondWith(undefined);
      mockSaveToDatabase.respondWith({ id: 'onboarding_1' });
      mockUpdateDatabase.respondWith({ id: 'onboarding_1' });
      mockLoadFromDatabase.respondWith(null); // No orders placed
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/userOnboarding.workflow'),
        activities: getAllMockActivities(),
      });

      // Act - Use time skipping to fast-forward through sleeps
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('userOnboardingWorkflow', {
          workflowId: 'test-onboarding-1',
          taskQueue: 'test',
          args: [{
            userId: 'user_1',
            email: 'test@example.com',
            name: 'Test User',
          }],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.userId).toBe('user_1');
      expect(result.completedSteps).toContain('welcome_email');
      expect(result.completedSteps).toContain('getting_started_guide');
      expect(result.completedSteps).toContain('feedback_request');
      expect(mockSendEmail.getCallCount()).toBeGreaterThanOrEqual(3); // welcome + guide + discount/feedback
    });
  });

  describe('User Places Order', () => {
    it('should skip discount if user has placed an order', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockSendEmail.respondWith(undefined);
      mockSaveToDatabase.respondWith({ id: 'onboarding_2' });
      mockUpdateDatabase.respondWith({ id: 'onboarding_2' });
      mockLoadFromDatabase.respondWith({ id: 'order_1', status: 'delivered' }); // User has ordered
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/userOnboarding.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('userOnboardingWorkflow', {
          workflowId: 'test-onboarding-order-placed',
          taskQueue: 'test',
          args: [{
            userId: 'user_2',
            email: 'ordered@example.com',
            name: 'Ordered User',
          }],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.firstOrderPlaced).toBe(true);
      expect(result.discountSent).toBe(false);
      expect(result.completedSteps).toContain('discount_skipped_order_placed');
    });
  });

  describe('Signal Handling', () => {
    it('should handle orderPlaced signal during onboarding', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockSendEmail.respondWith(undefined);
      mockSaveToDatabase.respondWith({ id: 'onboarding_3' });
      mockUpdateDatabase.respondWith({ id: 'onboarding_3' });
      mockLoadFromDatabase.respondWith(null);
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/userOnboarding.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('userOnboardingWorkflow', {
          workflowId: 'test-onboarding-signal',
          taskQueue: 'test',
          args: [{
            userId: 'user_3',
            email: 'signal@example.com',
            name: 'Signal User',
          }],
        });

        // Signal that user placed an order
        await handle.signal('orderPlaced', 'order_123');

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.firstOrderPlaced).toBe(true);
    });
  });
});
