/**
 * Payment Validator Service
 *
 * Handles validation logic for payment requests including:
 * - Payment method validation
 * - Amount validation
 * - Method-specific field validation (card details, UPI ID)
 * - Card-specific processing and decline simulation
 * - Wallet balance checks
 *
 * Extracted from PaymentGatewayService for file-length compliance.
 */

import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';

import {
  PaymentMethodType,
  PaymentInitiationRequest,
  StoredPayment,
} from './payment-gateway.types';

// ============================================================================
// Constants
// ============================================================================

const VALID_PAYMENT_METHODS: PaymentMethodType[] = [
  'card',
  'upi',
  'wallet',
  'cod',
];

// Mock: Cards that simulate specific failures
const DECLINE_CARD = '4000000000000002';
const INSUFFICIENT_FUNDS_CARD = '4000000000009995';

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class PaymentValidatorService {
  /**
   * Validate a payment initiation request.
   */
  validatePaymentRequest(request: PaymentInitiationRequest): void {
    if (!VALID_PAYMENT_METHODS.includes(request.paymentMethod)) {
      throw new BadRequestException(
        `Invalid payment method: ${request.paymentMethod}. Valid methods: ${VALID_PAYMENT_METHODS.join(', ')}`
      );
    }

    if (request.amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    if (
      request.paymentMethod === 'card' &&
      !request.cardDetails
    ) {
      throw new BadRequestException(
        'Card details are required for card payments'
      );
    }

    if (request.paymentMethod === 'upi' && !request.upiId) {
      throw new BadRequestException(
        'UPI ID is required for UPI payments'
      );
    }
  }

  /**
   * Process method-specific initiation logic.
   */
  async processMethodSpecificInitiation(
    payment: StoredPayment,
    request: PaymentInitiationRequest
  ): Promise<void> {
    switch (request.paymentMethod) {
      case 'card':
        await this.processCardInitiation(payment, request);
        break;
      case 'upi':
        payment.status = 'pending';
        break;
      case 'wallet':
        await this.processWalletInitiation(payment, request);
        break;
      case 'cod':
        payment.status = 'pending';
        break;
    }
  }

  /**
   * Process card-specific initiation with decline simulation.
   */
  private async processCardInitiation(
    payment: StoredPayment,
    request: PaymentInitiationRequest
  ): Promise<void> {
    if (!request.cardDetails) {
      return;
    }

    const cardNumber = request.cardDetails.cardNumber;

    if (cardNumber === DECLINE_CARD) {
      payment.status = 'failed';
      payment.failureReason = 'Card declined by issuer';
      throw new BadRequestException('Payment declined');
    }

    if (cardNumber === INSUFFICIENT_FUNDS_CARD) {
      payment.status = 'failed';
      payment.failureReason = 'Insufficient funds';
      throw new BadRequestException('Insufficient funds');
    }

    if (cardNumber.length < 16) {
      throw new BadRequestException('Invalid card number');
    }

    payment.status = 'pending';
  }

  /**
   * Process wallet-specific initiation with balance check.
   */
  private async processWalletInitiation(
    payment: StoredPayment,
    request: PaymentInitiationRequest
  ): Promise<void> {
    // Simulate insufficient wallet balance for large amounts
    if (request.amount >= 1_000_000) {
      payment.status = 'failed';
      payment.failureReason = 'Insufficient wallet balance';
      throw new BadRequestException('Insufficient wallet balance');
    }

    payment.status = 'pending';
  }
}
