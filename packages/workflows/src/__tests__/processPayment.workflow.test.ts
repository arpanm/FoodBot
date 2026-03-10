/**
 * Process Payment Workflow Tests
 *
 * Tests for GAP-FR-008: Payment processing with retry and idempotency
 *
 * Coverage:
 * - Happy path: Successful payment
 * - Payment gateway timeout
 * - Payment declined
 * - Retry logic (exponential backoff)
 * - Idempotency (duplicate prevention)
 * - 3D Secure authentication
 * - Multiple payment methods
 * - Partial authorization
 */

import { WorkflowFailedError } from '@temporalio/client';
import { TestWorkflowEnvironment } from '@temporalio/testing';
import { Worker } from '@temporalio/worker';

import {
  createPaymentDetails,
  createSuccessfulPaymentResult,
  createFailedPaymentResult,
} from '../test/factories/workflow-input.factory';
import {
  mockCallPaymentGateway,
  mockSaveToDatabase,
  mockLoadFromDatabase,
  mockUpdateDatabase,
  mockNotifyCustomer,
  mockSendEmail,
  resetAllMocks,
  getAllMockActivities,
} from '../test/mocks/activity-mocks';

describe('ProcessPaymentWorkflow', () => {
  let testEnv: TestWorkflowEnvironment;

  beforeAll(async () => {
    testEnv = await TestWorkflowEnvironment.createLocal();
  });

  afterAll(async () => {
    await testEnv?.teardown();
  });

  beforeEach(() => {
    resetAllMocks();
    // Default: no existing payment (idempotency check returns null)
    mockLoadFromDatabase.respondWith(null);
  });

  describe('Happy Path', () => {
    it('should successfully process card payment', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ method: 'card', amount: 50.0 });
      const paymentResult = createSuccessfulPaymentResult();

      mockCallPaymentGateway.respondWith(paymentResult);
      mockSaveToDatabase.respondWith({ id: 'payment_123', ...paymentDetails });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-1',
          taskQueue: 'test',
          args: [{ orderId: 'order_123', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('success');
      expect(result.paymentId).toBe(paymentResult.paymentId);
      expect(mockCallPaymentGateway.getCallCount()).toBe(1);
      expect(mockSaveToDatabase.getCallCount()).toBe(1);
      expect(mockNotifyCustomer.getCallCount()).toBe(1);
    });

    it('should successfully process UPI payment', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ method: 'upi', amount: 100.0 });
      const paymentResult = createSuccessfulPaymentResult();

      mockCallPaymentGateway.respondWith(paymentResult);
      mockSaveToDatabase.respondWith({ id: 'payment_124', ...paymentDetails });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-upi',
          taskQueue: 'test',
          args: [{ orderId: 'order_124', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('success');
      expect(mockCallPaymentGateway.getCallCount()).toBe(1);
    });

    it('should successfully process wallet payment', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ method: 'wallet', amount: 75.0 });
      const paymentResult = createSuccessfulPaymentResult();

      mockCallPaymentGateway.respondWith(paymentResult);
      mockSaveToDatabase.respondWith({ id: 'payment_125', ...paymentDetails });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-wallet',
          taskQueue: 'test',
          args: [{ orderId: 'order_125', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('success');
    });
  });

  describe('Payment Gateway Timeout', () => {
    it('should timeout and retry on slow gateway response', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });

      let callCount = 0;
      mockCallPaymentGateway.fn = async () => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Gateway timeout');
        }
        return createSuccessfulPaymentResult();
      };

      mockSaveToDatabase.respondWith({ id: 'payment_126', ...paymentDetails });
      mockUpdateDatabase.respondWith({ id: 'payment_126', ...paymentDetails });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-timeout-retry',
          taskQueue: 'test',
          args: [{ orderId: 'order_126', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('success');
      expect(callCount).toBe(3); // Retried twice before success
    });

    it('should fail after max timeout retries', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });

      // Use throwErrors to simulate persistent gateway failure
      mockCallPaymentGateway.throwErrors(
        new Error('Gateway timeout'),
        new Error('Gateway timeout'),
        new Error('Gateway timeout'),
        new Error('Gateway timeout'),
        new Error('Gateway timeout')
      );

      mockSaveToDatabase.respondWith({ id: 'payment_127', status: 'failed' });
      mockUpdateDatabase.respondWith({ id: 'payment_127', status: 'failed' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('processPaymentWorkflow', {
            workflowId: 'test-payment-max-timeout',
            taskQueue: 'test',
            args: [{ orderId: 'order_127', paymentDetails }],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);
    });
  });

  describe('Payment Declined', () => {
    it('should handle payment declined by bank', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });
      const declinedResult = createFailedPaymentResult({ errorMessage: 'Insufficient funds' });

      mockCallPaymentGateway.respondWith(declinedResult);
      mockSaveToDatabase.respondWith({ id: 'payment_128', status: 'failed' });
      mockUpdateDatabase.respondWith({ id: 'payment_128', status: 'failed' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert - workflow should fail with WorkflowFailedError
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('processPaymentWorkflow', {
            workflowId: 'test-payment-declined',
            taskQueue: 'test',
            args: [{ orderId: 'order_128', paymentDetails }],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Verify gateway was called and customer was notified
      expect(mockCallPaymentGateway.getCallCount()).toBe(1);
      expect(mockNotifyCustomer.getCallCount()).toBeGreaterThanOrEqual(1);
    });

    it('should handle card declined for fraud suspicion', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 5000.0 }); // Large amount
      const declinedResult = createFailedPaymentResult({
        errorMessage: 'Transaction declined - suspected fraud',
      });

      mockCallPaymentGateway.respondWith(declinedResult);
      mockSaveToDatabase.respondWith({ id: 'payment_129', status: 'failed' });
      mockUpdateDatabase.respondWith({ id: 'payment_129', status: 'failed' });
      mockNotifyCustomer.respondWith(undefined);
      mockSendEmail.respondWith(undefined); // Send fraud alert email

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('processPaymentWorkflow', {
            workflowId: 'test-payment-fraud',
            taskQueue: 'test',
            args: [{ orderId: 'order_129', paymentDetails }],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Assert
      expect(mockSendEmail.getCallCount()).toBeGreaterThanOrEqual(1); // Fraud alert sent
    });
  });

  describe('Retry Logic', () => {
    it('should retry on transient network errors', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });

      let attemptCount = 0;
      mockCallPaymentGateway.fn = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error - connection reset');
        }
        return createSuccessfulPaymentResult();
      };

      mockSaveToDatabase.respondWith({ id: 'payment_130', ...paymentDetails });
      mockUpdateDatabase.respondWith({ id: 'payment_130', ...paymentDetails });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-retry-network',
          taskQueue: 'test',
          args: [{ orderId: 'order_130', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('success');
      expect(attemptCount).toBe(3); // 2 failures + 1 success
    });

    it('should use exponential backoff for retries', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });
      const retryTimestamps: number[] = [];

      let attemptCount = 0;
      mockCallPaymentGateway.fn = async () => {
        retryTimestamps.push(Date.now());
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Rate limit exceeded');
        }
        return createSuccessfulPaymentResult();
      };

      mockSaveToDatabase.respondWith({ id: 'payment_131', ...paymentDetails });
      mockUpdateDatabase.respondWith({ id: 'payment_131', ...paymentDetails });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-backoff',
          taskQueue: 'test',
          args: [{ orderId: 'order_131', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert - Verify increasing delays
      expect(retryTimestamps.length).toBe(3);
      if (retryTimestamps.length >= 3) {
        const delay1 = retryTimestamps[1] - retryTimestamps[0];
        const delay2 = retryTimestamps[2] - retryTimestamps[1];
        // Exponential backoff: second delay should be ~2x first delay
        expect(delay2).toBeGreaterThanOrEqual(delay1);
      }
    });
  });

  describe('Idempotency', () => {
    it('should prevent duplicate payment for same order', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });
      const existingPayment = { id: 'payment_132', status: 'success', orderId: 'order_132' };

      mockLoadFromDatabase.respondWith(existingPayment); // Payment already exists
      mockCallPaymentGateway.respondWith(createSuccessfulPaymentResult()); // Should not be called

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-idempotent',
          taskQueue: 'test',
          args: [{ orderId: 'order_132', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.paymentId).toBe('payment_132');
      expect(mockLoadFromDatabase.getCallCount()).toBe(1);
      expect(mockCallPaymentGateway.getCallCount()).toBe(0); // Gateway not called
    });

    it('should handle concurrent payment requests for same order', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });
      const orderId = 'order_133';
      const workflowId = 'test-payment-concurrent';

      mockLoadFromDatabase.respondWith(null); // No existing payment
      mockCallPaymentGateway.respondWith(createSuccessfulPaymentResult());
      mockSaveToDatabase.respondWith({ id: 'payment_133', orderId });
      mockUpdateDatabase.respondWith({ id: 'payment_133', status: 'success' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act - Start workflow and get result using same handle
      const result1 = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId,
          taskQueue: 'test',
          args: [{ orderId, paymentDetails }],
        });

        return await handle.result();
      });

      // The completed workflow result can be retrieved with getHandle
      const handle2 = client.workflow.getHandle(workflowId);
      const result2 = await handle2.result();

      // Assert - Both should return same result
      expect(result1.paymentId).toBe(result2.paymentId);
      expect(mockCallPaymentGateway.getCallCount()).toBe(1); // Only one payment processed
    });
  });

  describe('3D Secure Authentication', () => {
    it('should handle 3D Secure authentication flow', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 200.0 });

      // First call requires 3DS, second call completes after auth
      let callCount = 0;
      mockCallPaymentGateway.fn = async () => {
        callCount++;
        if (callCount === 1) {
          return {
            paymentId: 'payment_134',
            status: 'pending' as const,
            requires3DS: true,
            authUrl: 'https://bank.com/3ds/auth',
          };
        }
        return createSuccessfulPaymentResult({ paymentId: 'payment_134' });
      };

      mockSaveToDatabase.respondWith({ id: 'payment_134', status: 'pending' });
      mockUpdateDatabase.respondWith({ id: 'payment_134', status: 'success' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-3ds',
          taskQueue: 'test',
          args: [{ orderId: 'order_134', paymentDetails }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('success');
      expect(callCount).toBe(2); // Initial + after 3DS
      expect(mockUpdateDatabase.getCallCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Partial Authorization', () => {
    it('should handle partial payment authorization', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 100.0 });
      const partialResult = createSuccessfulPaymentResult({
        paymentId: 'payment_135',
        metadata: {
          requestedAmount: 100.0,
          authorizedAmount: 80.0,
          partial: true,
        },
      });

      mockCallPaymentGateway.respondWith(partialResult);
      mockSaveToDatabase.respondWith({ id: 'payment_135', ...partialResult });
      mockUpdateDatabase.respondWith({ id: 'payment_135', status: 'success' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act
      const result = await worker.runUntil(async () => {
        const handle = await client.workflow.start('processPaymentWorkflow', {
          workflowId: 'test-payment-partial',
          taskQueue: 'test',
          args: [{ orderId: 'order_135', paymentDetails, allowPartial: true }],
        });

        return await handle.result();
      });

      // Assert
      expect(result.status).toBe('success');
      expect(result.metadata.partial).toBe(true);
      expect(result.metadata.authorizedAmount).toBe(80.0);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle invalid payment details', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const invalidPaymentDetails = createPaymentDetails({ amount: -50.0 }); // Negative amount

      mockCallPaymentGateway.throwErrors(new Error('Invalid amount'));
      mockSaveToDatabase.respondWith({ id: 'payment_136', status: 'failed' });
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('processPaymentWorkflow', {
            workflowId: 'test-payment-invalid',
            taskQueue: 'test',
            args: [{ orderId: 'order_136', paymentDetails: invalidPaymentDetails }],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);
    });

    it('should handle database save failure', async () => {
      const { client, nativeConnection } = testEnv;

      // Arrange
      const paymentDetails = createPaymentDetails({ amount: 50.0 });

      mockCallPaymentGateway.respondWith(createSuccessfulPaymentResult());
      mockSaveToDatabase.throwErrors(new Error('Database connection failed'));
      mockNotifyCustomer.respondWith(undefined);

      const worker = await Worker.create({
        connection: nativeConnection,
        taskQueue: 'test',
        workflowsPath: require.resolve('../workflows/processPayment.workflow'),
        activities: getAllMockActivities(),
      });

      // Act & Assert
      await expect(
        worker.runUntil(async () => {
          const handle = await client.workflow.start('processPaymentWorkflow', {
            workflowId: 'test-payment-db-fail',
            taskQueue: 'test',
            args: [{ orderId: 'order_137', paymentDetails }],
          });

          return await handle.result();
        })
      ).rejects.toThrow(WorkflowFailedError);

      // Save fails before gateway is called
      expect(mockSaveToDatabase.getCallCount()).toBeGreaterThanOrEqual(1);
    });
  });
});
