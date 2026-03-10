/**
 * Order Saga Service
 *
 * Implements the saga pattern for distributed order transactions.
 * Manages multi-step order placement with compensation on failure.
 *
 * Steps: validateOrder -> reserveItems -> processPayment -> placeWithProvider -> confirmOrder
 *
 * Type definitions: see order-saga.types.ts
 * Compensation logic: see saga-compensation.service.ts
 *
 * Implements FR-CA-ORDER-001, FR-WORKFLOW-EXEC-001-EXP.
 */

import { Injectable, Logger } from '@nestjs/common';

import { OrderRoutingService, SubOrder } from './order-routing.service';
import {
  SagaCompensationService,
  CompensationFn,
} from './saga-compensation.service';

// Re-export all types so existing consumers still work
export type {
  SagaStepName,
  SagaStatus,
  SagaStep,
  SagaState,
  SagaOrderInput,
  SagaResult,
  SubOrderResult,
} from './order-saga.types';

import type {
  SagaStepName,
  SagaState,
  SagaOrderInput,
  SagaResult,
  SubOrderResult,
} from './order-saga.types';

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class OrderSagaService {
  private readonly logger = new Logger(OrderSagaService.name);

  private readonly sagaStore: Map<string, SagaState> = new Map();

  constructor(
    private readonly orderRoutingService: OrderRoutingService,
    private readonly compensationService: SagaCompensationService
  ) {}

  /**
   * Execute the order placement saga.
   */
  async executeSaga(input: SagaOrderInput): Promise<SagaResult> {
    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const state = this.initializeSagaState(sagaId, orderId, input.userId);
    this.sagaStore.set(sagaId, state);

    const compensations: CompensationFn[] = [];
    let paymentId: string | undefined;
    let subOrders: SubOrder[] = [];
    const subOrderResults: SubOrderResult[] = [];

    try {
      // Step 1: Validate Order
      await this.executeStep(state, 'validate_order', async () => {
        this.validateOrder(input);
        return { validated: true };
      });

      // Step 2: Reserve Items
      await this.executeStep(state, 'reserve_items', async () => {
        const reservationId = await this.reserveItems(
          input.restaurantId,
          input.items
        );

        compensations.push(
          this.compensationService.createReleaseItemsCompensation(reservationId)
        );

        return { reservationId };
      });

      // Step 3: Process Payment
      await this.executeStep(state, 'process_payment', async () => {
        const subtotal = input.items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        const deliveryFee = 3.99;
        const tax = Math.round(subtotal * 0.08 * 100) / 100;
        const total = subtotal + deliveryFee + tax;

        paymentId = await this.processPayment(
          orderId,
          input.userId,
          total,
          input.paymentMethod
        );

        compensations.push(
          this.compensationService.createRefundPaymentCompensation(paymentId)
        );

        return { paymentId, total };
      });

      // Step 4: Place with Provider(s)
      await this.executeStep(state, 'place_with_provider', async () => {
        const routingResult = await this.orderRoutingService.routeOrder({
          userId: input.userId,
          restaurantId: input.restaurantId,
          items: input.items,
          deliveryAddress: input.deliveryAddress,
          paymentMethod: input.paymentMethod,
        });

        if (!routingResult.success) {
          throw new Error('Failed to route order to any provider');
        }

        subOrders = routingResult.subOrders;

        for (const subOrder of subOrders) {
          const result = await this.placeWithProvider(subOrder);
          subOrderResults.push(result);

          if (result.status === 'placed') {
            compensations.push(
              this.compensationService.createCancelProviderOrderCompensation(
                subOrder.provider,
                result.externalOrderId ?? result.subOrderId
              )
            );
          }
        }

        const failedSubOrders = subOrderResults.filter(
          (r) => r.status === 'failed'
        );

        if (failedSubOrders.length === subOrderResults.length) {
          throw new Error('All sub-orders failed placement');
        }

        return {
          subOrderResults,
          partialFailure: failedSubOrders.length > 0,
        };
      });

      // Step 5: Confirm Order
      await this.executeStep(state, 'confirm_order', async () => {
        await this.confirmOrder(orderId, input.userId);
        return { confirmed: true };
      });

      state.status = 'completed';
      state.updatedAt = new Date();

      return {
        sagaId, orderId, status: 'completed',
        steps: state.steps, subOrders, paymentId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown saga error';
      this.logger.error(
        `Saga ${sagaId} failed at step ${state.currentStep}: ${errorMessage}`
      );

      state.status = 'compensating';
      state.updatedAt = new Date();

      await this.compensationService.executeCompensations(state, compensations);

      state.status = 'compensated';
      state.updatedAt = new Date();

      return {
        sagaId, orderId, status: 'compensated',
        steps: state.steps, subOrders, paymentId, error: errorMessage,
      };
    }
  }

  /**
   * Get saga state by ID.
   */
  getSagaState(sagaId: string): SagaState | undefined {
    return this.sagaStore.get(sagaId);
  }

  // ============================================================================
  // Step implementations & Saga infrastructure
  // ============================================================================

  private validateOrder(input: SagaOrderInput): void {
    if (!input.items || input.items.length === 0) throw new Error('Order must contain at least one item');
    if (!input.restaurantId) throw new Error('Restaurant ID is required');
    if (!input.deliveryAddress) throw new Error('Delivery address is required');
    const validPaymentMethods = ['card', 'cash', 'upi', 'wallet'];
    if (!validPaymentMethods.includes(input.paymentMethod)) {
      throw new Error(`Invalid payment method: ${input.paymentMethod}`);
    }
    for (const item of input.items) {
      if (item.quantity <= 0) throw new Error(`Invalid quantity for dish ${item.dishId}`);
      if (item.price < 0) throw new Error(`Invalid price for dish ${item.dishId}`);
    }
  }

  private async reserveItems(
    restaurantId: string, items: Array<{ dishId: string; quantity: number }>
  ): Promise<string> {
    this.logger.log(`Reserving ${items.length} items from restaurant ${restaurantId}`);
    return `res_${restaurantId}_${Date.now()}`;
  }

  private async processPayment(
    orderId: string, userId: string, amount: number, paymentMethod: string
  ): Promise<string> {
    this.logger.log(`Processing payment of ${amount} via ${paymentMethod} for order ${orderId}`);
    return `pay_${orderId}_${Date.now()}`;
  }

  private async placeWithProvider(subOrder: SubOrder): Promise<SubOrderResult> {
    this.logger.log(`Placing sub-order ${subOrder.subOrderId} with provider ${subOrder.provider}`);
    return {
      subOrderId: subOrder.subOrderId, restaurantId: subOrder.restaurantId,
      provider: subOrder.provider, status: 'placed',
      externalOrderId: `ext_${subOrder.provider}_${Date.now()}`,
    };
  }

  private async confirmOrder(orderId: string, userId: string): Promise<void> {
    this.logger.log(`Confirming order ${orderId} for user ${userId}`);
  }

  private initializeSagaState(
    sagaId: string, orderId: string, userId: string
  ): SagaState {
    const stepNames: SagaStepName[] = [
      'validate_order', 'reserve_items', 'process_payment',
      'place_with_provider', 'confirm_order',
    ];
    return {
      sagaId, orderId, userId, status: 'pending',
      currentStep: 'validate_order',
      steps: stepNames.map((name) => ({ name, status: 'pending' as const })),
      compensationsExecuted: [],
      createdAt: new Date(), updatedAt: new Date(), metadata: {},
    };
  }

  private async executeStep(
    state: SagaState, stepName: SagaStepName,
    execute: () => Promise<Record<string, unknown>>
  ): Promise<void> {
    const step = state.steps.find((s) => s.name === stepName);
    if (!step) {
      throw new Error(`Unknown saga step: ${stepName}`);
    }

    state.currentStep = stepName;
    state.status = 'in_progress';
    step.status = 'in_progress';
    step.startedAt = new Date();
    state.updatedAt = new Date();

    try {
      const result = await execute();
      step.status = 'completed';
      step.completedAt = new Date();
      step.result = result;
      state.updatedAt = new Date();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Step execution failed';
      step.status = 'failed';
      step.completedAt = new Date();
      step.error = errorMessage;
      state.updatedAt = new Date();
      throw error;
    }
  }
}
