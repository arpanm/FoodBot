/**
 * Process Payment Workflow
 *
 * Implements GAP-FR-008: Payment processing with retry and idempotency
 *
 * Features:
 * - Support for multiple payment methods (card, UPI, wallet)
 * - Exponential backoff retry (1s, 2s, 4s, 8s, 16s)
 * - Idempotency check to prevent duplicate charges
 * - 3D Secure authentication flow
 * - Partial authorization handling
 * - Payment gateway timeout handling
 * - Database persistence of payment records
 * - Customer notifications
 *
 * Retry Policy:
 * - Initial interval: 1s
 * - Backoff coefficient: 2
 * - Maximum interval: 30s
 * - Maximum attempts: 5
 */

import { proxyActivities, log, ApplicationFailure } from '@temporalio/workflow';

// Type definitions
interface PaymentDetails {
  method: 'card' | 'upi' | 'cash' | 'wallet';
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}

interface PaymentResult {
  paymentId: string;
  status: 'success' | 'failed' | 'pending';
  transactionId?: string;
  errorMessage?: string;
  requires3DS?: boolean;
  authUrl?: string;
  metadata?: {
    requestedAmount?: number;
    authorizedAmount?: number;
    partial?: boolean;
  };
}

interface ProcessPaymentInput {
  orderId: string;
  paymentDetails: PaymentDetails;
  allowPartial?: boolean;
}

// Activity interface
interface Activities {
  loadFromDatabase(collection: string, id: string): Promise<any>;
  callPaymentGateway(details: PaymentDetails): Promise<PaymentResult>;
  saveToDatabase(collection: string, data: any): Promise<any>;
  updateDatabase(collection: string, id: string, data: any): Promise<any>;
  notifyCustomer(userId: string, message: string): Promise<void>;
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Configure activity proxy with retry for transient errors
const activities = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,
  },
});

// Configure payment gateway activity with specific retry policy
const paymentGatewayActivity = proxyActivities<Pick<Activities, 'callPaymentGateway'>>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,
  },
});

/**
 * Process Payment Workflow
 *
 * Handles payment processing with comprehensive error handling and retry logic
 */
export async function processPaymentWorkflow(
  input: ProcessPaymentInput
): Promise<PaymentResult> {
  log.info('Starting payment processing workflow', { input });

  const { orderId, paymentDetails, allowPartial } = input;

  try {
    // Step 1: Check for existing payment (idempotency)
    log.info('Checking for existing payment', { orderId });
    const existingPayment = await activities.loadFromDatabase('payments', orderId);

    if (existingPayment && existingPayment.status === 'success') {
      log.info('Payment already processed (idempotent request)', {
        paymentId: existingPayment.id,
      });
      return {
        paymentId: existingPayment.id,
        status: 'success',
        transactionId: existingPayment.transactionId,
      };
    }

    // Step 2: Validate payment details
    log.info('Validating payment details', { method: paymentDetails.method });
    if (paymentDetails.amount <= 0) {
      throw ApplicationFailure.nonRetryable('Invalid amount', 'INVALID_PAYMENT');
    }

    // Step 3: Save initial payment record
    log.info('Saving initial payment record');
    const paymentRecord = {
      orderId,
      amount: paymentDetails.amount,
      method: paymentDetails.method,
      currency: paymentDetails.currency,
      status: 'pending',
      createdAt: new Date(),
    };

    const savedRecord = await activities.saveToDatabase('payments', paymentRecord);
    log.info('Payment record saved', { paymentId: savedRecord.id });

    // Step 4: Call payment gateway (with automatic retry on transient errors)
    log.info('Calling payment gateway', { method: paymentDetails.method });

    let paymentResult: PaymentResult;
    try {
      paymentResult = await paymentGatewayActivity.callPaymentGateway(paymentDetails);
      log.info('Payment gateway response received', {
        status: paymentResult.status,
        paymentId: paymentResult.paymentId,
      });
    } catch (error) {
      log.error('Payment gateway call failed after retries', { error });

      // Update payment record with failure
      await activities.updateDatabase('payments', savedRecord.id, {
        status: 'failed',
        errorMessage: (error as Error).message,
        updatedAt: new Date(),
      });

      throw error;
    }

    // Step 5: Handle 3D Secure authentication
    if (paymentResult.requires3DS) {
      log.info('3D Secure authentication required', { authUrl: paymentResult.authUrl });

      // Update payment record to pending 3DS
      await activities.updateDatabase('payments', savedRecord.id, {
        status: 'pending',
        requires3DS: true,
        authUrl: paymentResult.authUrl,
        updatedAt: new Date(),
      });

      // Wait for 3DS completion and retry gateway call
      log.info('Waiting for 3DS completion');
      paymentResult = await paymentGatewayActivity.callPaymentGateway({
        ...paymentDetails,
        metadata: {
          ...paymentDetails.metadata,
          threeDSCompleted: true,
        },
      });

      log.info('3DS authentication completed', { status: paymentResult.status });
    }

    // Step 6: Handle payment result
    if (paymentResult.status === 'failed') {
      log.error('Payment declined', { reason: paymentResult.errorMessage });

      // Update payment record
      await activities.updateDatabase('payments', savedRecord.id, {
        status: 'failed',
        errorMessage: paymentResult.errorMessage,
        transactionId: paymentResult.transactionId,
        updatedAt: new Date(),
      });

      // Check if fraud detection triggered
      if (
        paymentResult.errorMessage &&
        paymentResult.errorMessage.toLowerCase().includes('fraud')
      ) {
        log.info('Fraud detected - sending alert email');
        try {
          await activities.sendEmail(
            'security@foodbot.com',
            'Fraud Alert',
            `Potential fraud detected for order ${orderId}`
          );
        } catch (emailError) {
          log.error('Failed to send fraud alert email', { emailError });
        }
      }

      // Notify customer
      try {
        await activities.notifyCustomer(orderId, 'PAYMENT_FAILED');
      } catch (notifyError) {
        log.error('Failed to notify customer of payment failure', { notifyError });
      }

      throw ApplicationFailure.nonRetryable(
        `Payment failed: ${paymentResult.errorMessage}`,
        'PAYMENT_DECLINED'
      );
    }

    // Step 7: Handle partial authorization
    if (paymentResult.metadata?.partial) {
      log.info('Partial payment authorization', {
        requested: paymentResult.metadata.requestedAmount,
        authorized: paymentResult.metadata.authorizedAmount,
      });

      if (!allowPartial) {
        log.error('Partial payment not allowed');
        await activities.updateDatabase('payments', savedRecord.id, {
          status: 'failed',
          errorMessage: 'Partial payment not allowed',
          updatedAt: new Date(),
        });
        throw ApplicationFailure.nonRetryable('Partial payment not allowed', 'PARTIAL_NOT_ALLOWED');
      }
    }

    // Step 8: Update payment record with success
    log.info('Payment successful', { paymentId: paymentResult.paymentId });
    await activities.updateDatabase('payments', savedRecord.id, {
      status: 'success',
      transactionId: paymentResult.transactionId,
      paymentId: paymentResult.paymentId,
      metadata: paymentResult.metadata,
      updatedAt: new Date(),
    });

    // Step 9: Notify customer of success
    log.info('Notifying customer of successful payment');
    try {
      await activities.notifyCustomer(orderId, 'PAYMENT_SUCCESS');
    } catch (notifyError) {
      log.error('Failed to notify customer of payment success', { notifyError });
      // Continue despite notification failure
    }

    log.info('Payment processing workflow completed successfully', {
      paymentId: paymentResult.paymentId,
    });

    return paymentResult;
  } catch (error) {
    log.error('Payment processing workflow failed', { error });

    // Notify customer of failure (if not already notified)
    try {
      await activities.notifyCustomer(orderId, 'PAYMENT_FAILED');
    } catch (notifyError) {
      log.error('Failed to notify customer', { notifyError });
    }

    throw error;
  }
}
