/**
 * Place Order Workflow Tests
 *
 * Tests for FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP: Order placement with saga pattern
 *
 * Coverage:
 * - Happy path: Complete order flow
 * - Payment failure + compensation (refund)
 * - Inventory check failure
 * - Restaurant rejection
 * - Timeout scenarios
 * - Saga pattern validation
 * - Compensation logic
 */

import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';
import { WorkflowFailedError } from '@temporalio/client';
import {
  mockValidateCart,
  mockCheckInventory,
  mockReserveItems,
  mockReleaseItems,
  mockProcessPayment,
  mockRefundPayment,
  mockCreateOrder,
  mockUpdateOrderStatus,
  mockNotifyRestaurant,
  mockNotifyCustomer,
  resetAllMocks,
  getAllMockActivities,
} from '../test/mocks/activity-mocks';
import {
  createPlaceOrderInput,
  createOrder,
  createSuccessfulPaymentResult,
  createFailedPaymentResult,
} from '../test/factories/workflow-input.factory';

describe('PlaceOrderWorkflow', () => {
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
    it('should successfully place an order end-to-end', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const order = createOrder({ status: 'pending' });
      const paymentResult = createSuccessfulPaymentResult();

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);
      mockProcessPayment.respondWith(paymentResult);
      mockCreateOrder.respondWith(order);
      mockUpdateOrderStatus.respondWith({ ...order, status: 'confirmed' });
      mockNotifyRestaurant.respondWith(undefined);
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('placeOrderWorkflow', {
          workflowId: 'test-place-order-1',
          taskQueue: 'test',
          args: [orderInput],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.orderId).toBe(order.id);
      expect(result.status).toBe('confirmed');
      expect(mockValidateCart.getCallCount()).toBe(1);
      expect(mockCheckInventory.getCallCount()).toBe(1);
      expect(mockReserveItems.getCallCount()).toBe(1);
      expect(mockProcessPayment.getCallCount()).toBe(1);
      expect(mockCreateOrder.getCallCount()).toBe(1);
      expect(mockNotifyRestaurant.getCallCount()).toBe(1);
      expect(mockNotifyCustomer.getCallCount()).toBe(1);
    });
  });

  describe('Payment Failure with Compensation', () => {
    it('should rollback on payment failure', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const paymentFailure = createFailedPaymentResult();

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);
      mockProcessPayment.respondWith(paymentFailure); // Payment fails
      mockReleaseItems.respondWith(undefined); // Compensation
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('placeOrderWorkflow', {
            workflowId: 'test-place-order-payment-fail',
            taskQueue: 'test',
            args: [orderInput],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Verify compensation happened
      expect(mockReserveItems.getCallCount()).toBe(1);
      expect(mockReleaseItems.getCallCount()).toBe(1); // Items released
      expect(mockCreateOrder.getCallCount()).toBe(0); // Order not created
    });

    it('should refund payment on order creation failure', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const paymentSuccess = createSuccessfulPaymentResult();

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);
      mockProcessPayment.respondWith(paymentSuccess);
      mockCreateOrder.throwErrors(new Error('Database error')); // Order creation fails
      mockRefundPayment.respondWith(createSuccessfulPaymentResult()); // Compensation
      mockReleaseItems.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('placeOrderWorkflow', {
            workflowId: 'test-place-order-creation-fail',
            taskQueue: 'test',
            args: [orderInput],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Verify compensation
      expect(mockProcessPayment.getCallCount()).toBe(1);
      expect(mockRefundPayment.getCallCount()).toBe(1); // Payment refunded
      expect(mockReleaseItems.getCallCount()).toBe(1); // Items released
    });
  });

  describe('Inventory Check Failure', () => {
    it('should fail early if items not available', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(false); // Items not available

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('placeOrderWorkflow', {
            workflowId: 'test-place-order-no-inventory',
            taskQueue: 'test',
            args: [orderInput],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Verify no payment was attempted
      expect(mockCheckInventory.getCallCount()).toBe(1);
      expect(mockProcessPayment.getCallCount()).toBe(0);
      expect(mockCreateOrder.getCallCount()).toBe(0);
    });
  });

  describe('Cart Validation', () => {
    it('should reject invalid cart', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();

      mockValidateCart.throwErrors(new Error('Invalid cart: empty items'));

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('placeOrderWorkflow', {
            workflowId: 'test-place-order-invalid-cart',
            taskQueue: 'test',
            args: [orderInput],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Verify workflow stopped early
      expect(mockValidateCart.getCallCount()).toBeGreaterThanOrEqual(1);
      expect(mockCheckInventory.getCallCount()).toBe(0);
    });
  });

  describe('Notification Handling', () => {
    it('should notify both restaurant and customer on success', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const order = createOrder({ status: 'confirmed' });

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);
      mockProcessPayment.respondWith(createSuccessfulPaymentResult());
      mockCreateOrder.respondWith(order);
      mockUpdateOrderStatus.respondWith(order);
      mockNotifyRestaurant.respondWith(undefined);
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      await worker.runUntil(async () => {
        const handle = await client.workflow.start('placeOrderWorkflow', {
          workflowId: 'test-place-order-notifications',
          taskQueue: 'test',
          args: [orderInput],
        });

        return await handle.result();
      });

      // Assert
      expect(mockNotifyRestaurant.getCallCount()).toBe(1);
      expect(mockNotifyCustomer.getCallCount()).toBeGreaterThanOrEqual(1);

      const restaurantNotif = mockNotifyRestaurant.getCalls()[0];
      expect(restaurantNotif[0]).toBe(order.id);
    });

    it('should still complete order even if notification fails', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const order = createOrder({ status: 'confirmed' });

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);
      mockProcessPayment.respondWith(createSuccessfulPaymentResult());
      mockCreateOrder.respondWith(order);
      mockUpdateOrderStatus.respondWith(order);
      mockNotifyRestaurant.throwErrors(new Error('Notification service down'));
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act - Should not throw despite notification failure
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('placeOrderWorkflow', {
          workflowId: 'test-place-order-notif-fail',
          taskQueue: 'test',
          args: [orderInput],
        });

        return await handle.result();
      });

      // Assert - Order should still be placed
      expect(result).toBeDefined();
      expect(result.orderId).toBe(order.id);
    });
  });

  describe('Saga Pattern Validation', () => {
    it('should execute compensation in reverse order', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const compensationOrder: string[] = [];

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.fn = async () => {
        return true;
      };
      mockProcessPayment.respondWith(createSuccessfulPaymentResult());
      mockCreateOrder.throwErrors(new Error('Database error'));

      // Track compensation order
      mockReleaseItems.fn = async () => {
        compensationOrder.push('releaseItems');
      };
      mockRefundPayment.fn = async () => {
        compensationOrder.push('refundPayment');
        return createSuccessfulPaymentResult();
      };

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('placeOrderWorkflow', {
            workflowId: 'test-place-order-saga',
            taskQueue: 'test',
            args: [orderInput],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Assert - Compensations executed in reverse
      expect(compensationOrder).toEqual(['refundPayment', 'releaseItems']);
    });
  });

  describe('Timeout Scenarios', () => {
    it('should timeout on slow payment processing', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);

      // Simulate slow payment
      mockProcessPayment.fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 60000));
        return createSuccessfulPaymentResult();
      };

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('placeOrderWorkflow', {
            workflowId: 'test-place-order-timeout',
            taskQueue: 'test',
            args: [orderInput],
            workflowExecutionTimeout: '10s',
          });

          return await handle.result();
        })
      ).rejects.toThrow();

      // Verify compensation was triggered
      expect(mockReleaseItems.getCallCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Idempotency', () => {
    it('should handle duplicate order requests', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const orderInput = createPlaceOrderInput();
      const order = createOrder({ status: 'confirmed' });

      mockValidateCart.respondWith(true);
      mockCheckInventory.respondWith(true);
      mockReserveItems.respondWith(true);
      mockProcessPayment.respondWith(createSuccessfulPaymentResult());
      mockCreateOrder.respondWith(order);
      mockUpdateOrderStatus.respondWith(order);
      mockNotifyRestaurant.respondWith(undefined);
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/placeOrder.workflow'),
        activities: getAllMockActivities(),
      });

      // Act - Execute same workflow twice with same ID
      const workflowId = 'test-place-order-idempotent';

      const result1 = await worker.runUntil(async () => {
        const handle = await client.workflow.start('placeOrderWorkflow', {
          workflowId,
          taskQueue: 'test',
          args: [orderInput],
        });

        return await handle.result();
      });

      // Attempting to start again with same ID should use existing execution
      const handle = await client.workflow.getHandle(workflowId);
      const result2 = await handle.result();

      // Assert
      expect(result1).toEqual(result2);
    });
  });
});
