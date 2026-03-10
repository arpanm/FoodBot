/**
 * Order Saga Types
 *
 * Type definitions for the order saga pattern including:
 * - Saga step names and status enums
 * - Saga state and step tracking
 * - Saga input/output interfaces
 * - Sub-order result types
 *
 * Extracted from order-saga.service.ts for file-length compliance.
 *
 * Implements FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP.
 */

import { ProviderType, SubOrder } from './order-routing.types';

// ============================================================================
// Saga Step & Status Types
// ============================================================================

export type SagaStepName =
  | 'validate_order'
  | 'reserve_items'
  | 'process_payment'
  | 'place_with_provider'
  | 'confirm_order';

export type SagaStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'compensating'
  | 'compensated';

// ============================================================================
// Saga State & Step Interfaces
// ============================================================================

export interface SagaStep {
  name: SagaStepName;
  status: SagaStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: Record<string, unknown>;
}

export interface SagaState {
  sagaId: string;
  orderId: string;
  userId: string;
  status: SagaStatus;
  currentStep: SagaStepName;
  steps: SagaStep[];
  compensationsExecuted: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

// ============================================================================
// Input/Output Interfaces
// ============================================================================

export interface SagaOrderInput {
  userId: string;
  restaurantId: string;
  items: Array<{
    dishId: string;
    dishName?: string;
    quantity: number;
    price: number;
    specialInstructions?: string;
  }>;
  deliveryAddress: Record<string, unknown>;
  paymentMethod: string;
  specialInstructions?: string;
}

export interface SagaResult {
  sagaId: string;
  orderId: string;
  status: SagaStatus;
  steps: SagaStep[];
  subOrders: SubOrder[];
  paymentId?: string;
  error?: string;
}

export interface SubOrderResult {
  subOrderId: string;
  restaurantId: string;
  provider: ProviderType;
  status: 'placed' | 'failed';
  externalOrderId?: string;
  error?: string;
}
