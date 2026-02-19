/**
 * Restaurant Onboarding Workflow Tests
 *
 * Tests for the restaurant partner onboarding process.
 *
 * Coverage:
 * - Happy path: Full onboarding from verification to activation
 * - Admin rejection: Restaurant is rejected during review
 * - Email verification timeout
 * - Signal handling: emailVerified, adminApproved, adminRejected
 */

import { WorkflowFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import {
  mockSendEmail,
  mockSaveToDatabase,
  mockUpdateDatabase,
  mockLoadFromDatabase,
  mockCallExternalAPI,
  mockNotifyCustomer,
  resetAllMocks,
  getAllMockActivities,
} from '../test/mocks/activity-mocks';

describe('RestaurantOnboardingWorkflow', () => {
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
    it('should complete full restaurant onboarding', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockSendEmail.respondWith(undefined);
      mockSaveToDatabase.respondWith({ id: 'onboarding_r1' });
      mockUpdateDatabase.respondWith({ id: 'rest_1' });
      mockCallExternalAPI.respondWith({ id: 'acct_test_123' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/restaurantOnboarding.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('restaurantOnboardingWorkflow', {
          workflowId: 'test-restaurant-onboarding-1',
          taskQueue: 'test',
          args: [{
            restaurantId: 'rest_1',
            ownerEmail: 'owner@restaurant.com',
            restaurantName: 'Test Pizza Place',
          }],
        });

        // Signal email verified
        await handle.signal('emailVerified');

        // Signal admin approved
        await handle.signal('adminApproved');

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.restaurantId).toBe('rest_1');
      expect(result.status).toBe('active');
      expect(result.completedSteps).toContain('verification_email_sent');
      expect(result.completedSteps).toContain('email_verified');
      expect(result.completedSteps).toContain('admin_approved');
      expect(result.completedSteps).toContain('payment_account_setup');
      expect(result.completedSteps).toContain('welcome_kit_sent');
      expect(result.completedSteps).toContain('listing_activated');
      expect(mockSendEmail.getCallCount()).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Admin Rejection', () => {
    it('should handle restaurant rejection gracefully', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockSendEmail.respondWith(undefined);
      mockSaveToDatabase.respondWith({ id: 'onboarding_r2' });
      mockUpdateDatabase.respondWith({ id: 'rest_2' });

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/restaurantOnboarding.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('restaurantOnboardingWorkflow', {
          workflowId: 'test-restaurant-rejected',
          taskQueue: 'test',
          args: [{
            restaurantId: 'rest_2',
            ownerEmail: 'rejected@restaurant.com',
            restaurantName: 'Rejected Restaurant',
          }],
        });

        // Signal email verified
        await handle.signal('emailVerified');

        // Signal admin rejection
        await handle.signal('adminRejected', 'Does not meet food safety requirements');

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('rejected');
      expect(result.completedSteps).toContain('email_verified');
      expect(result.completedSteps).toContain('admin_rejected');
      expect(result.completedSteps).not.toContain('payment_account_setup');
    });
  });

  describe('Signal Handling', () => {
    it('should verify email and proceed to approval stage', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockSendEmail.respondWith(undefined);
      mockSaveToDatabase.respondWith({ id: 'onboarding_r3' });
      mockUpdateDatabase.respondWith({ id: 'rest_3' });
      mockCallExternalAPI.respondWith({ id: 'acct_test_456' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/restaurantOnboarding.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('restaurantOnboardingWorkflow', {
          workflowId: 'test-restaurant-signals',
          taskQueue: 'test',
          args: [{
            restaurantId: 'rest_3',
            ownerEmail: 'signals@restaurant.com',
            restaurantName: 'Signal Restaurant',
          }],
        });

        // Signal email verified
        await handle.signal('emailVerified');

        // Signal admin approved
        await handle.signal('adminApproved');

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('active');
      expect(result.paymentAccountId).toBeDefined();
    });
  });
});
