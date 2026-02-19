/**
 * Workflow Error Definitions
 *
 * Custom error types for workflow and activity error handling.
 * These errors carry structured context for better debugging and monitoring.
 */

// ============================================================================
// Base Error Classes
// ============================================================================

/**
 * Base error for all FoodBot workflow errors.
 * Carries an error code, technical message, and optional user-facing message.
 */
export class WorkflowError extends Error {
  public readonly code: string;
  public readonly technicalMessage: string;
  public readonly userMessage: string;
  public readonly context: Record<string, unknown>;
  public readonly isRetryable: boolean;

  constructor(params: {
    code: string;
    technicalMessage: string;
    userMessage?: string;
    context?: Record<string, unknown>;
    isRetryable?: boolean;
  }) {
    super(params.technicalMessage);
    this.name = 'WorkflowError';
    this.code = params.code;
    this.technicalMessage = params.technicalMessage;
    this.userMessage = params.userMessage ?? 'An unexpected error occurred. Please try again.';
    this.context = params.context ?? {};
    this.isRetryable = params.isRetryable ?? false;
  }
}

// ============================================================================
// Payment Errors
// ============================================================================

export class PaymentError extends WorkflowError {
  constructor(params: {
    code: string;
    technicalMessage: string;
    userMessage?: string;
    context?: Record<string, unknown>;
    isRetryable?: boolean;
  }) {
    super({ ...params, code: `PAYMENT_${params.code}` });
    this.name = 'PaymentError';
  }
}

export class PaymentDeclinedError extends PaymentError {
  constructor(reason: string, context?: Record<string, unknown>) {
    super({
      code: 'DECLINED',
      technicalMessage: `Payment declined: ${reason}`,
      userMessage: 'Your payment was declined. Please check your payment method and try again.',
      context,
      isRetryable: false,
    });
  }
}

export class PaymentTimeoutError extends PaymentError {
  constructor(context?: Record<string, unknown>) {
    super({
      code: 'TIMEOUT',
      technicalMessage: 'Payment gateway timed out',
      userMessage: 'Payment processing is taking longer than expected. Please try again.',
      context,
      isRetryable: true,
    });
  }
}

export class PaymentGatewayError extends PaymentError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      code: 'GATEWAY_ERROR',
      technicalMessage: `Payment gateway error: ${message}`,
      userMessage: 'Payment service is temporarily unavailable. Please try again shortly.',
      context,
      isRetryable: true,
    });
  }
}

export class PaymentFraudError extends PaymentError {
  constructor(context?: Record<string, unknown>) {
    super({
      code: 'FRAUD_DETECTED',
      technicalMessage: 'Payment flagged for potential fraud',
      userMessage: 'This transaction could not be completed. Please contact support.',
      context,
      isRetryable: false,
    });
  }
}

// ============================================================================
// Order Errors
// ============================================================================

export class OrderError extends WorkflowError {
  constructor(params: {
    code: string;
    technicalMessage: string;
    userMessage?: string;
    context?: Record<string, unknown>;
    isRetryable?: boolean;
  }) {
    super({ ...params, code: `ORDER_${params.code}` });
    this.name = 'OrderError';
  }
}

export class OrderNotFoundError extends OrderError {
  constructor(orderId: string) {
    super({
      code: 'NOT_FOUND',
      technicalMessage: `Order ${orderId} not found`,
      userMessage: 'The order could not be found. Please check the order ID.',
      context: { orderId },
      isRetryable: false,
    });
  }
}

export class InventoryUnavailableError extends OrderError {
  constructor(items: string[], context?: Record<string, unknown>) {
    super({
      code: 'INVENTORY_UNAVAILABLE',
      technicalMessage: `Items not available: ${items.join(', ')}`,
      userMessage: 'Some items in your cart are no longer available. Please update your order.',
      context: { ...context, unavailableItems: items },
      isRetryable: false,
    });
  }
}

export class InvalidCartError extends OrderError {
  constructor(reason: string) {
    super({
      code: 'INVALID_CART',
      technicalMessage: `Invalid cart: ${reason}`,
      userMessage: 'Your cart contains invalid items. Please review and try again.',
      context: { reason },
      isRetryable: false,
    });
  }
}

// ============================================================================
// External Service Errors
// ============================================================================

export class ExternalServiceError extends WorkflowError {
  constructor(params: {
    service: string;
    technicalMessage: string;
    context?: Record<string, unknown>;
    isRetryable?: boolean;
  }) {
    super({
      code: `EXTERNAL_${params.service.toUpperCase()}_ERROR`,
      technicalMessage: params.technicalMessage,
      userMessage: 'A service is temporarily unavailable. Please try again shortly.',
      context: { service: params.service, ...params.context },
      isRetryable: params.isRetryable ?? true,
    });
    this.name = 'ExternalServiceError';
  }
}

export class MCPSearchError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      service: 'MCP_SEARCH',
      technicalMessage: `MCP search failed: ${message}`,
      context,
      isRetryable: true,
    });
  }
}

export class DeliveryServiceError extends ExternalServiceError {
  constructor(message: string, context?: Record<string, unknown>) {
    super({
      service: 'DELIVERY',
      technicalMessage: `Delivery service error: ${message}`,
      context,
      isRetryable: true,
    });
  }
}

// ============================================================================
// Database Errors
// ============================================================================

export class DatabaseError extends WorkflowError {
  constructor(params: {
    operation: string;
    technicalMessage: string;
    context?: Record<string, unknown>;
  }) {
    super({
      code: `DB_${params.operation.toUpperCase()}_ERROR`,
      technicalMessage: params.technicalMessage,
      userMessage: 'A temporary issue occurred. Please try again.',
      context: { operation: params.operation, ...params.context },
      isRetryable: true,
    });
    this.name = 'DatabaseError';
  }
}

// ============================================================================
// Notification Errors
// ============================================================================

export class NotificationError extends WorkflowError {
  constructor(params: {
    channel: string;
    technicalMessage: string;
    context?: Record<string, unknown>;
  }) {
    super({
      code: `NOTIFICATION_${params.channel.toUpperCase()}_ERROR`,
      technicalMessage: params.technicalMessage,
      context: { channel: params.channel, ...params.context },
      isRetryable: true,
    });
    this.name = 'NotificationError';
  }
}

// ============================================================================
// Retry Policy Definitions
// ============================================================================

export const RETRY_POLICIES = {
  /**
   * Default retry policy for most activities.
   */
  DEFAULT: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },

  /**
   * Aggressive retry for payment operations.
   */
  PAYMENT: {
    initialInterval: '1s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 5,
  },

  /**
   * Conservative retry for external APIs.
   */
  EXTERNAL_API: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 5,
  },

  /**
   * Single attempt for non-retryable operations.
   */
  NO_RETRY: {
    maximumAttempts: 1,
  },

  /**
   * Generous retry for notification delivery.
   */
  NOTIFICATION: {
    initialInterval: '5s',
    backoffCoefficient: 2,
    maximumInterval: '120s',
    maximumAttempts: 10,
  },

  /**
   * Fast retry for cache operations.
   */
  CACHE: {
    initialInterval: '500ms',
    backoffCoefficient: 1.5,
    maximumInterval: '5s',
    maximumAttempts: 3,
  },
} as const;

// ============================================================================
// Error Classification Helpers
// ============================================================================

/**
 * Determine if an error is retryable based on its type.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof WorkflowError) {
    return error.isRetryable;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/transient errors are retryable
    if (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('temporarily unavailable') ||
      message.includes('rate limit') ||
      message.includes('econnrefused') ||
      message.includes('econnreset')
    ) {
      return true;
    }

    // Business logic errors are not retryable
    if (
      message.includes('invalid') ||
      message.includes('not found') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('fraud')
    ) {
      return false;
    }
  }

  // Default: treat unknown errors as retryable
  return true;
}

/**
 * Extract a user-friendly message from an error.
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof WorkflowError) {
    return error.userMessage;
  }

  return 'An unexpected error occurred. Please try again later.';
}
