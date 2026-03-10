/**
 * Payment Gateway Service
 *
 * Extended payment handling supporting multiple payment methods,
 * payment initiation with timeout, verification/polling,
 * automatic refund on cancellation, and split payments.
 *
 * Supported methods: Card, UPI, Wallet, COD
 *
 * Implements FR-CA-ORDER-001: Payment processing for order placement.
 *
 * Type definitions: see payment-gateway.types.ts
 * Validation logic: see payment-validator.service.ts
 * Refund logic: see payment-refund.service.ts
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PaymentValidatorService } from './payment-validator.service';
import { PaymentRefundService } from './payment-refund.service';

// Re-export all types so existing consumers still work
export type {
  PaymentMethodType,
  PaymentGatewayStatus,
  CardDetails,
  RawCardInput,
  PaymentInitiationRequest,
  PaymentInitiationResult,
  PaymentVerificationResult,
  RefundRequest,
  RefundResult,
  SplitPaymentRequest,
  SplitPaymentResult,
  StoredPayment,
} from './payment-gateway.types';
export { maskCardToDetails } from './payment-gateway.types';

import type {
  PaymentInitiationRequest,
  PaymentInitiationResult,
  PaymentVerificationResult,
  RefundRequest,
  RefundResult,
  SplitPaymentRequest,
  SplitPaymentResult,
  StoredPayment,
} from './payment-gateway.types';

// ============================================================================
// Constants
// ============================================================================

const PAYMENT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  private readonly payments: Map<string, StoredPayment> = new Map();

  constructor(
    private readonly paymentValidator: PaymentValidatorService,
    private readonly paymentRefundService: PaymentRefundService
  ) {}

  /**
   * Initiate a payment with timeout.
   */
  async initiatePayment(
    request: PaymentInitiationRequest
  ): Promise<PaymentInitiationResult> {
    this.paymentValidator.validatePaymentRequest(request);

    const paymentId = `pgw_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const confirmationToken = `tok_${Math.random().toString(36).substring(2, 15)}`;

    const payment: StoredPayment = {
      paymentId,
      orderId: request.orderId,
      userId: request.userId,
      amount: request.amount,
      paymentMethod: request.paymentMethod,
      status: 'initiated',
      confirmationToken,
      expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MS),
      createdAt: new Date(),
      refundedAmount: 0,
      metadata: request.metadata ?? {},
    };

    this.payments.set(paymentId, payment);

    await this.paymentValidator.processMethodSpecificInitiation(
      payment,
      request
    );

    this.logger.log(
      `Payment ${paymentId} initiated for order ${request.orderId}, method: ${request.paymentMethod}`
    );

    return {
      paymentId,
      status: payment.status,
      confirmationToken:
        request.paymentMethod !== 'cod'
          ? confirmationToken
          : undefined,
      redirectUrl:
        request.paymentMethod === 'upi'
          ? `upi://pay?paymentId=${paymentId}`
          : undefined,
      expiresAt: payment.expiresAt,
    };
  }

  /**
   * Verify a payment's current status.
   */
  async verifyPayment(
    paymentId: string
  ): Promise<PaymentVerificationResult> {
    const payment = this.getPayment(paymentId);

    if (
      payment.status === 'initiated' &&
      payment.expiresAt.getTime() < Date.now()
    ) {
      payment.status = 'expired';
      payment.failureReason = 'Payment session expired';
    }

    return {
      paymentId: payment.paymentId,
      status: payment.status,
      transactionId: payment.transactionId,
      amount: payment.amount,
      completedAt: payment.completedAt,
      failureReason: payment.failureReason,
    };
  }

  /**
   * Confirm a payment with the confirmation token.
   */
  async confirmPayment(
    paymentId: string,
    confirmationToken: string
  ): Promise<PaymentVerificationResult> {
    const payment = this.getPayment(paymentId);

    if (payment.confirmationToken !== confirmationToken) {
      throw new BadRequestException('Invalid confirmation token');
    }

    if (payment.status === 'completed') {
      throw new BadRequestException('Payment already completed');
    }

    if (payment.expiresAt.getTime() < Date.now()) {
      payment.status = 'expired';
      payment.failureReason = 'Payment session expired';
      throw new BadRequestException('Payment session has expired');
    }

    payment.status = 'completed';
    payment.transactionId = `txn_${Date.now()}`;
    payment.completedAt = new Date();

    this.logger.log(`Payment ${paymentId} confirmed`);

    return {
      paymentId: payment.paymentId,
      status: payment.status,
      transactionId: payment.transactionId,
      amount: payment.amount,
      completedAt: payment.completedAt,
    };
  }

  /**
   * Process an automatic refund (delegates to PaymentRefundService).
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const payment = this.getPayment(request.paymentId);
    return this.paymentRefundService.processRefund(request, payment);
  }

  /**
   * Process split payment for multi-restaurant orders.
   */
  async processSplitPayment(
    request: SplitPaymentRequest
  ): Promise<SplitPaymentResult> {
    if (!request.splits || request.splits.length === 0) {
      throw new BadRequestException('At least one split is required');
    }

    const totalAmount = request.splits.reduce(
      (sum, split) => sum + split.amount,
      0
    );

    const masterPaymentId = `pgw_master_${Date.now()}`;
    const splitResults: SplitPaymentResult['splits'] = [];

    for (const split of request.splits) {
      const result = await this.initiatePayment({
        orderId: `${request.orderId}_${split.subOrderId}`,
        userId: request.userId,
        amount: split.amount,
        paymentMethod: request.paymentMethod,
        cardDetails: request.cardDetails,
        upiId: request.upiId,
      });

      splitResults.push({
        subOrderId: split.subOrderId,
        paymentId: result.paymentId,
        status: result.status,
        amount: split.amount,
      });
    }

    const allInitiated = splitResults.every(
      (r) => r.status === 'initiated' || r.status === 'pending'
    );

    return {
      masterPaymentId,
      splits: splitResults,
      totalAmount,
      status: allInitiated ? 'initiated' : 'failed',
    };
  }

  /**
   * Get payment details by ID.
   */
  getPaymentDetails(paymentId: string): StoredPayment {
    return this.getPayment(paymentId);
  }

  /**
   * Get all payments for an order.
   */
  getPaymentsForOrder(orderId: string): StoredPayment[] {
    const payments: StoredPayment[] = [];
    for (const payment of this.payments.values()) {
      if (
        payment.orderId === orderId ||
        payment.orderId.startsWith(`${orderId}_`)
      ) {
        payments.push(payment);
      }
    }
    return payments;
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private getPayment(paymentId: string): StoredPayment {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new NotFoundException(
        `Payment ${paymentId} not found`
      );
    }
    return payment;
  }
}
