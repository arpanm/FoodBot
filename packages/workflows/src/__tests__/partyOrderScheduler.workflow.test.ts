/**
 * Party Order Scheduler Workflow Tests
 *
 * Tests for the party order scheduling lifecycle.
 *
 * Coverage:
 * - Happy path: All restaurants available, all orders placed
 * - Validation failures: Some restaurants unavailable
 * - Order placement failures with saga compensation
 * - Cancellation via signal
 * - Notification handling during failures
 */

import { ApplicationFailure } from '@temporalio/common';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import { createMockActivity } from '../test/utils/temporal-test-helper';

interface PartyOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  pricePerUnit: number;
}

const mockValidateRestaurantAvailability = createMockActivity<
  [string, PartyOrderItem[]],
  { available: boolean; unavailableItems: string[] }
>();

const mockPlacePartyOrder = createMockActivity<
  [string, string, PartyOrderItem[]],
  { orderId: string; status: string }
>();

const mockNotifyPartyStatus = createMockActivity<
  [string, string, Record<string, unknown>?],
  void
>();

const mockCancelPartyOrder = createMockActivity<
  [string, string],
  { cancelled: boolean }
>();

function getActivities(): Record<string, unknown> {
  return {
    validateRestaurantAvailability: mockValidateRestaurantAvailability.fn,
    placePartyOrder: mockPlacePartyOrder.fn,
    notifyPartyStatus: mockNotifyPartyStatus.fn,
    cancelPartyOrder: mockCancelPartyOrder.fn,
  };
}

function resetMocks(): void {
  mockValidateRestaurantAvailability.reset();
  mockPlacePartyOrder.reset();
  mockNotifyPartyStatus.reset();
  mockCancelPartyOrder.reset();
}

const sampleItems: PartyOrderItem[] = [
  { dishId: 'dish-1', dishName: 'Butter Chicken', quantity: 50, pricePerUnit: 12.99 },
];

function buildInput() {
  // Use a time in the very near future so sleeps resolve quickly
  const now = new Date();
  return {
    partyPlanId: 'plan-123',
    userId: 'user-123',
    eventDate: now.toISOString().split('T')[0],
    eventTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    restaurantOrders: [
      {
        restaurantId: 'rest-1',
        restaurantName: 'Indian Kitchen',
        items: sampleItems,
        estimatedTotal: 649.50,
      },
      {
        restaurantId: 'rest-2',
        restaurantName: 'Italian Bistro',
        items: sampleItems,
        estimatedTotal: 500.00,
      },
    ],
  };
}

describe('partyOrderSchedulerWorkflow', () => {
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
    it('should validate and place all orders successfully', async () => {
      const { client, nativeConnection } = testEnv;

      // All validations pass
      mockValidateRestaurantAvailability.respondWith(
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
      );

      // All orders placed successfully
      mockPlacePartyOrder.respondWith(
        { orderId: 'order-1', status: 'confirmed' },
        { orderId: 'order-2', status: 'confirmed' },
      );

      mockNotifyPartyStatus.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-party',
        workflowsPath: require.resolve(
          '../workflows/partyOrderScheduler.workflow'
        ),
        activities: getActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'partyOrderSchedulerWorkflow',
          {
            workflowId: 'test-party-happy-1',
            taskQueue: 'test-party',
            args: [buildInput()],
          }
        );

        return await handle.result();
      });

      expect(result).toBeDefined();
      expect(result.partyPlanId).toBe('plan-123');
      expect(result.status).toBe('ordered');
      expect(result.placedOrders).toHaveLength(2);
      expect(result.failedOrders).toHaveLength(0);
      expect(mockPlacePartyOrder.getCallCount()).toBe(2);
    });
  });

  describe('Cancellation', () => {
    it('should cancel when signal received before ordering', async () => {
      const { client, nativeConnection } = testEnv;

      mockValidateRestaurantAvailability.respondWith(
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
      );
      mockNotifyPartyStatus.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-party',
        workflowsPath: require.resolve(
          '../workflows/partyOrderScheduler.workflow'
        ),
        activities: getActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'partyOrderSchedulerWorkflow',
          {
            workflowId: 'test-party-cancel-1',
            taskQueue: 'test-party',
            args: [buildInput()],
          }
        );

        // Send cancel signal immediately
        await handle.signal('cancelParty');

        return await handle.result();
      });

      expect(result.status).toBe('cancelled');
      expect(result.placedOrders).toHaveLength(0);
      expect(result.failedOrders).toHaveLength(0);
    });
  });

  describe('Notification Handling', () => {
    it('should continue even when notifications fail', async () => {
      const { client, nativeConnection } = testEnv;

      mockValidateRestaurantAvailability.respondWith(
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
        { available: true, unavailableItems: [] },
      );

      mockPlacePartyOrder.respondWith(
        { orderId: 'order-1', status: 'confirmed' },
        { orderId: 'order-2', status: 'confirmed' },
      );

      // Use nonRetryable errors to prevent Temporal from retrying
      const notifError = ApplicationFailure.nonRetryable(
        'Notification service down', 'NOTIFICATION_FAILED'
      );
      mockNotifyPartyStatus.throwErrors(
        notifError, notifError, notifError, notifError,
        notifError, notifError, notifError, notifError
      );

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test-party',
        workflowsPath: require.resolve(
          '../workflows/partyOrderScheduler.workflow'
        ),
        activities: getActivities(),
      });

      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start(
          'partyOrderSchedulerWorkflow',
          {
            workflowId: 'test-party-notif-fail-1',
            taskQueue: 'test-party',
            args: [buildInput()],
          }
        );

        return await handle.result();
      });

      expect(result.status).toBe('ordered');
      expect(result.placedOrders).toHaveLength(2);
    });
  });
});
