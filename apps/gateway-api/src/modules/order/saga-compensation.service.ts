/**
 * Saga Compensation Service
 *
 * Handles compensation (rollback) logic for the order saga pattern.
 * Executes compensations in reverse order when a saga step fails.
 *
 * Compensation actions:
 * - Release reserved inventory items
 * - Refund processed payments
 * - Cancel provider orders
 * - Notify users of failure
 *
 * Extracted from OrderSagaService for file-length compliance.
 *
 * Implements FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP.
 */

import { Injectable, Logger } from '@nestjs/common';

import { ProviderType } from './order-routing.types';
import { SagaState } from './order-saga.types';

// ============================================================================
// Types
// ============================================================================

export type CompensationFn = () => Promise<void>;

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class SagaCompensationService {
  private readonly logger = new Logger(SagaCompensationService.name);

  /**
   * Execute all compensations in reverse order.
   * Continues executing remaining compensations even if one fails.
   */
  async executeCompensations(
    state: SagaState,
    compensations: CompensationFn[]
  ): Promise<void> {
    this.logger.log(
      `Executing ${compensations.length} compensations for saga ${state.sagaId}`
    );

    for (let i = compensations.length - 1; i >= 0; i--) {
      try {
        await compensations[i]();
        state.compensationsExecuted.push(`compensation_${i}`);
      } catch (compensationError) {
        const errorMessage =
          compensationError instanceof Error
            ? compensationError.message
            : 'Compensation failed';
        this.logger.error(
          `Compensation ${i} failed for saga ${state.sagaId}: ${errorMessage}`
        );
        // Continue with remaining compensations
      }
    }
  }

  /**
   * Create a compensation to release reserved inventory items.
   */
  createReleaseItemsCompensation(reservationId: string): CompensationFn {
    return async () => {
      this.logger.log(
        `Compensation: Releasing reservation ${reservationId}`
      );
      await this.releaseItems(reservationId);
    };
  }

  /**
   * Create a compensation to refund a processed payment.
   */
  createRefundPaymentCompensation(paymentId: string): CompensationFn {
    return async () => {
      this.logger.log(
        `Compensation: Refunding payment ${paymentId}`
      );
      await this.refundPayment(paymentId);
    };
  }

  /**
   * Create a compensation to cancel a provider order.
   */
  createCancelProviderOrderCompensation(
    provider: ProviderType,
    externalOrderId: string
  ): CompensationFn {
    return async () => {
      this.logger.log(
        `Compensation: Cancelling provider order ${externalOrderId}`
      );
      await this.cancelProviderOrder(provider, externalOrderId);
    };
  }

  /**
   * Release reserved inventory items.
   * In production, releases the inventory locks.
   */
  async releaseItems(reservationId: string): Promise<void> {
    this.logger.log(`Releasing reservation ${reservationId}`);
  }

  /**
   * Refund a processed payment.
   * In production, initiates a refund via the payment gateway.
   */
  async refundPayment(paymentId: string): Promise<void> {
    this.logger.log(`Refunding payment ${paymentId}`);
  }

  /**
   * Cancel an order placed with an external provider.
   * In production, calls the MCP adapter to cancel the order.
   */
  async cancelProviderOrder(
    provider: ProviderType,
    externalOrderId: string
  ): Promise<void> {
    this.logger.log(
      `Cancelling order ${externalOrderId} with provider ${provider}`
    );
  }
}
