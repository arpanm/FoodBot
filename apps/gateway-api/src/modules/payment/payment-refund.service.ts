/**
 * Payment Refund Service
 *
 * Handles refund processing for completed payments including:
 * - Full refunds
 * - Partial refunds
 * - Refund validation (status, COD exclusion, amount limits)
 *
 * Extracted from PaymentGatewayService for file-length compliance.
 */

import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import {
  RefundRequest,
  RefundResult,
  StoredPayment,
} from './payment-gateway.types';

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PaymentRefundService {
  private readonly logger = new Logger(PaymentRefundService.name);

  /**
   * Process an automatic refund.
   */
  async processRefund(
    request: RefundRequest,
    payment: StoredPayment
  ): Promise<RefundResult> {
    if (
      payment.status !== 'completed' &&
      payment.status !== 'partially_refunded'
    ) {
      throw new BadRequestException(
        `Cannot refund payment in status ${payment.status}`
      );
    }

    if (payment.paymentMethod === 'cod') {
      throw new BadRequestException(
        'COD payments cannot be refunded through payment gateway'
      );
    }

    const refundAmount = request.amount ?? payment.amount;
    const availableForRefund =
      payment.amount - payment.refundedAmount;

    if (refundAmount > availableForRefund) {
      throw new BadRequestException(
        `Refund amount ${refundAmount} exceeds available amount ${availableForRefund}`
      );
    }

    payment.refundedAmount += refundAmount;

    if (payment.refundedAmount >= payment.amount) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partially_refunded';
    }

    const refundId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    this.logger.log(
      `Refund ${refundId} processed for payment ${request.paymentId}: ${refundAmount}`
    );

    return {
      refundId,
      paymentId: request.paymentId,
      status: 'completed',
      amount: refundAmount,
      reason: request.reason,
      processedAt: new Date(),
    };
  }
}
