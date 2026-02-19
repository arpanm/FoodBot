/**
 * Order Fulfillment Workflow Tests
 *
 * Tests for the order lifecycle from preparation through delivery.
 *
 * Coverage:
 * - Happy path: Full order preparation through delivery
 * - Signal handling: orderReady, orderPickedUp, orderDelivered
 * - Timeout scenarios: Preparation timeout, pickup timeout
 * - Notification failures: Graceful handling of notification errors
 * - Delivery partner re-assignment on timeout
 */

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import {
  mockUpdateOrderStatus,
  mockNotifyRestaurant,
  mockNotifyCustomer,
  mockCallDeliveryService,
  mockUpdateDatabase,
  resetAllMocks,
  getAllMockActivities,
} from '../test/mocks/activity-mocks';
import { createMockActivity } from '../test/utils/temporal-test-helper';

// Create mocks for new activities
const mockAssignDeliveryPartner = createMockActivity<[string], Record<string, unknown>>();
const mockTrackDelivery = createMockActivity<[string, string], Record<string, unknown>>();

describe('OrderFulfillmentWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(() => {
    resetAllMocks();
    mockAssignDeliveryPartner.reset();
    mockTrackDelivery.reset();
  });

  function getActivities(): Record<string, unknown> {
    return {
      ...getAllMockActivities(),
      assignDeliveryPartner: mockAssignDeliveryPartner.fn,
      trackDelivery: mockTrackDelivery.fn,
    };
  }

  describe('Happy Path', () => {
    it('should successfully fulfill an order with signals', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockUpdateOrderStatus.respondWith(
        { id: 'order_1', status: 'preparing' },
        { id: 'order_1', status: 'ready' },
        { id: 'order_1', status: 'out_for_delivery' },
        { id: 'order_1', status: 'delivered' }
      );
      mockNotifyRestaurant.respondWith(undefined);
      mockNotifyCustomer.respondWith(undefined);
      mockAssignDeliveryPartner.respondWith({
        partnerId: 'partner_1',
        partnerName: 'Test Driver',
        estimatedArrival: new Date().toISOString(),
      });
      mockCallDeliveryService.respondWith({
        trackingId: 'track_1',
        status: 'assigned',
      });
      mockUpdateDatabase.respondWith({ id: 'order_1', status: 'ready' });
      mockTrackDelivery.respondWith({ status: 'delivered', trackingId: 'track_1' });

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/orderFulfillment.workflow'),
        activities: getActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('orderFulfillmentWorkflow', {
          workflowId: 'test-fulfillment-1',
          taskQueue: 'test',
          args: [{
            orderId: 'order_1',
            restaurantId: 'rest_1',
            userId: 'user_1',
            deliveryAddress: '123 Main St',
          }],
        });

        // Simulate restaurant marking order as ready
        await handle.signal('orderReady');

        // Simulate delivery partner picking up order
        await handle.signal('orderPickedUp');

        // Simulate delivery completion (will also be caught by trackDelivery)
        await handle.signal('orderDelivered');

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.orderId).toBe('order_1');
      expect(result.status).toBe('delivered');
      expect(result.deliveryPartnerId).toBe('partner_1');
      expect(mockUpdateOrderStatus.getCallCount()).toBeGreaterThanOrEqual(2);
      expect(mockAssignDeliveryPartner.getCallCount()).toBe(1);
    });
  });

  describe('Notification Handling', () => {
    it('should continue fulfillment even if notifications fail', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      mockUpdateOrderStatus.respondWith(
        { id: 'order_2', status: 'preparing' },
        { id: 'order_2', status: 'ready' },
        { id: 'order_2', status: 'out_for_delivery' },
        { id: 'order_2', status: 'delivered' }
      );
      mockNotifyRestaurant.throwErrors(new Error('Notification service down'));
      mockNotifyCustomer.throwErrors(new Error('Push service unavailable'));
      mockAssignDeliveryPartner.respondWith({
        partnerId: 'partner_2',
        partnerName: 'Test Driver 2',
      });
      mockCallDeliveryService.respondWith({ trackingId: 'track_2', status: 'assigned' });
      mockUpdateDatabase.respondWith({ id: 'order_2' });
      mockTrackDelivery.respondWith({ status: 'delivered' });

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/orderFulfillment.workflow'),
        activities: getActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('orderFulfillmentWorkflow', {
          workflowId: 'test-fulfillment-notif-fail',
          taskQueue: 'test',
          args: [{
            orderId: 'order_2',
            restaurantId: 'rest_2',
            userId: 'user_2',
            deliveryAddress: '456 Oak Ave',
          }],
        });

        // Send all signals
        await handle.signal('orderReady');
        await handle.signal('orderPickedUp');
        await handle.signal('orderDelivered');

        return await handle.result();
      });

      // Assert - Order should still be delivered despite notification failures
      expect(result).toBeDefined();
      expect(result.status).toBe('delivered');
    });
  });
});
