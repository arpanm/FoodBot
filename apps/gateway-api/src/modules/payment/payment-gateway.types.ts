/**
 * Payment Gateway Types
 *
 * Type definitions for payment gateway services including:
 * - Payment method types and status enums
 * - Request/response interfaces
 * - Card details and masking
 * - Split payment types
 * - Internal stored payment model
 *
 * Extracted from payment-gateway.service.ts for file-length compliance.
 */

// ============================================================================
// Payment Method & Status Types
// ============================================================================

export type PaymentMethodType = 'card' | 'upi' | 'wallet' | 'cod';

export type PaymentGatewayStatus =
  | 'initiated'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'expired';

// ============================================================================
// Card Types
// ============================================================================

export interface CardDetails {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardHolderName: string;
}

/**
 * Raw card input used only during payment initiation.
 * Must be masked to CardDetails (lastFourDigits only) before any persistence.
 */
export interface RawCardInput {
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
}

export function maskCardToDetails(raw: RawCardInput): CardDetails {
  return {
    lastFourDigits: raw.cardNumber.slice(-4),
    expiryMonth: raw.expiryMonth,
    expiryYear: raw.expiryYear,
    cardHolderName: raw.cardHolderName,
  };
}

// ============================================================================
// Request/Response Interfaces
// ============================================================================

export interface PaymentInitiationRequest {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  currency?: string;
  cardDetails?: RawCardInput;
  upiId?: string;
  walletId?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitiationResult {
  paymentId: string;
  status: PaymentGatewayStatus;
  confirmationToken?: string;
  redirectUrl?: string;
  expiresAt: Date;
}

export interface PaymentVerificationResult {
  paymentId: string;
  status: PaymentGatewayStatus;
  transactionId?: string;
  amount: number;
  completedAt?: Date;
  failureReason?: string;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

export interface RefundResult {
  refundId: string;
  paymentId: string;
  status: 'initiated' | 'completed' | 'failed';
  amount: number;
  reason: string;
  processedAt: Date;
}

// ============================================================================
// Split Payment Types
// ============================================================================

export interface SplitPaymentRequest {
  orderId: string;
  userId: string;
  paymentMethod: PaymentMethodType;
  splits: Array<{
    restaurantId: string;
    amount: number;
    subOrderId: string;
  }>;
  cardDetails?: RawCardInput;
  upiId?: string;
}

export interface SplitPaymentResult {
  masterPaymentId: string;
  splits: Array<{
    subOrderId: string;
    paymentId: string;
    status: PaymentGatewayStatus;
    amount: number;
  }>;
  totalAmount: number;
  status: PaymentGatewayStatus;
}

// ============================================================================
// Internal Storage Type
// ============================================================================

export interface StoredPayment {
  paymentId: string;
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethodType;
  status: PaymentGatewayStatus;
  confirmationToken: string;
  transactionId?: string;
  expiresAt: Date;
  createdAt: Date;
  completedAt?: Date;
  failureReason?: string;
  refundedAmount: number;
  metadata: Record<string, unknown>;
}
