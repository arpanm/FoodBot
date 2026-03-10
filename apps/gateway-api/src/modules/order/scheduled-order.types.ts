/**
 * Scheduled Order Types
 *
 * Type definitions for the scheduled order service including:
 * - Order status enum
 * - Order item interface
 * - Scheduled order model
 * - Validation result
 * - Modification record
 *
 * Extracted from scheduled-order.service.ts for file-length compliance.
 *
 * Implements FR-CA-ORDER-001.
 */

// ============================================================================
// Status Types
// ============================================================================

export type ScheduledOrderStatus =
  | 'scheduled'
  | 'pending_validation'
  | 'validated'
  | 'placing'
  | 'placed'
  | 'failed'
  | 'cancelled'
  | 'modified';

// ============================================================================
// Data Interfaces
// ============================================================================

export interface ScheduledOrderItem {
  dishId: string;
  dishName?: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface ScheduledOrder {
  id: string;
  userId: string;
  restaurantId: string;
  items: ScheduledOrderItem[];
  deliveryAddress: Record<string, unknown>;
  paymentMethod: string;
  specialInstructions?: string;
  scheduledTime: Date;
  status: ScheduledOrderStatus;
  placedOrderId?: string;
  validationResult?: ValidationResult;
  modificationHistory: ModificationRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ValidationResult {
  isValid: boolean;
  unavailableItems: string[];
  priceChanges: Array<{
    dishId: string;
    oldPrice: number;
    newPrice: number;
  }>;
  restaurantAvailable: boolean;
  validatedAt: Date;
}

export interface ModificationRecord {
  modifiedAt: Date;
  changes: Record<string, unknown>;
  previousValues: Record<string, unknown>;
}
