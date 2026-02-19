/**
 * Temporal Service
 *
 * Gateway API integration with Temporal workflow engine.
 * Provides methods to start, query, and manage workflows from the API layer.
 *
 * This service maintains a single WorkflowClient connection and provides
 * typed methods for each workflow type in the FoodBot system.
 */

import { Connection, Client, WorkflowHandle } from '@temporalio/client';

// ============================================================================
// Types
// ============================================================================

interface SearchRestaurantInput {
  userId: string;
  query: string;
  filters?: {
    cuisine?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: { latitude: number; longitude: number };
    radius?: number;
  };
}

interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: Array<{
    dishId: string;
    quantity: number;
    price: number;
    customizations?: Record<string, unknown>;
  }>;
  paymentDetails: {
    method: 'card' | 'upi' | 'cash' | 'wallet';
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  };
  deliveryAddress: string;
}

interface ProcessPaymentInput {
  orderId: string;
  paymentDetails: {
    method: 'card' | 'upi' | 'cash' | 'wallet';
    amount: number;
    currency: string;
    metadata?: Record<string, unknown>;
  };
  allowPartial?: boolean;
}

interface OrderFulfillmentInput {
  orderId: string;
  restaurantId: string;
  userId: string;
  deliveryAddress: string;
}

interface UserOnboardingInput {
  userId: string;
  email: string;
  name: string;
}

interface RestaurantOnboardingInput {
  restaurantId: string;
  ownerEmail: string;
  restaurantName: string;
}

interface WorkflowStatus {
  workflowId: string;
  runId: string;
  status: string;
  result?: unknown;
  error?: string;
}

// ============================================================================
// Task Queue Constants
// ============================================================================

const TASK_QUEUES = {
  MAIN: 'foodbot-main-queue',
  ORDERS: 'foodbot-orders-queue',
  PAYMENTS: 'foodbot-payments-queue',
  NOTIFICATIONS: 'foodbot-notifications-queue',
  ONBOARDING: 'foodbot-onboarding-queue',
} as const;

// ============================================================================
// Temporal Service
// ============================================================================

export class TemporalService {
  private client: Client | null = null;
  private connection: Connection | null = null;
  private readonly address: string;
  private readonly namespace: string;

  constructor(
    address?: string,
    namespace?: string
  ) {
    this.address = address ?? process.env.TEMPORAL_ADDRESS ?? 'localhost:7233';
    this.namespace = namespace ?? process.env.TEMPORAL_NAMESPACE ?? 'default';
  }

  /**
   * Initialize the Temporal client connection.
   * Must be called before using any workflow methods.
   */
  async connect(): Promise<void> {
    if (this.client) {
      return;
    }

    this.connection = await Connection.connect({
      address: this.address,
    });

    this.client = new Client({
      connection: this.connection,
      namespace: this.namespace,
    });

    console.info(`[TemporalService] Connected to ${this.address} (namespace: ${this.namespace})`);
  }

  /**
   * Close the Temporal client connection.
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
      this.client = null;
      console.info('[TemporalService] Disconnected');
    }
  }

  /**
   * Check if the service is connected to Temporal.
   */
  isConnected(): boolean {
    return this.client !== null;
  }

  // ============================================================================
  // Search Workflows
  // ============================================================================

  /**
   * Execute a restaurant search workflow.
   *
   * @param input - Search parameters
   * @returns Search results (list of restaurants)
   */
  async executeSearchWorkflow(input: SearchRestaurantInput): Promise<unknown> {
    const client = this.getClient();
    const workflowId = `search-${input.userId}-${Date.now()}`;

    const handle = await client.workflow.start('searchRestaurantWorkflow', {
      args: [input],
      taskQueue: TASK_QUEUES.MAIN,
      workflowId,
      workflowExecutionTimeout: '2m',
    });

    return handle.result();
  }

  // ============================================================================
  // Order Workflows
  // ============================================================================

  /**
   * Execute an order placement workflow.
   *
   * @param input - Order details
   * @returns Order result with ID and status
   */
  async executeOrderWorkflow(input: PlaceOrderInput): Promise<unknown> {
    const client = this.getClient();
    const workflowId = `order-${input.userId}-${Date.now()}`;

    const handle = await client.workflow.start('placeOrderWorkflow', {
      args: [input],
      taskQueue: TASK_QUEUES.ORDERS,
      workflowId,
      workflowExecutionTimeout: '5m',
    });

    return handle.result();
  }

  /**
   * Execute an order fulfillment workflow.
   * This is a long-running workflow that tracks the order through delivery.
   *
   * @param input - Fulfillment details
   * @returns Workflow handle for status tracking
   */
  async startOrderFulfillmentWorkflow(
    input: OrderFulfillmentInput
  ): Promise<{ workflowId: string; runId: string }> {
    const client = this.getClient();
    const workflowId = `fulfillment-${input.orderId}-${Date.now()}`;

    const handle = await client.workflow.start('orderFulfillmentWorkflow', {
      args: [input],
      taskQueue: TASK_QUEUES.ORDERS,
      workflowId,
      workflowExecutionTimeout: '3h',
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  }

  /**
   * Signal an order fulfillment workflow that the order is ready.
   *
   * @param workflowId - The workflow ID
   */
  async signalOrderReady(workflowId: string): Promise<void> {
    const client = this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('orderReady');
  }

  /**
   * Signal an order fulfillment workflow that the order has been picked up.
   *
   * @param workflowId - The workflow ID
   */
  async signalOrderPickedUp(workflowId: string): Promise<void> {
    const client = this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('orderPickedUp');
  }

  /**
   * Signal an order fulfillment workflow that the order has been delivered.
   *
   * @param workflowId - The workflow ID
   */
  async signalOrderDelivered(workflowId: string): Promise<void> {
    const client = this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('orderDelivered');
  }

  // ============================================================================
  // Payment Workflows
  // ============================================================================

  /**
   * Execute a payment processing workflow.
   *
   * @param input - Payment details
   * @returns Payment result
   */
  async executePaymentWorkflow(input: ProcessPaymentInput): Promise<unknown> {
    const client = this.getClient();
    const workflowId = `payment-${input.orderId}-${Date.now()}`;

    const handle = await client.workflow.start('processPaymentWorkflow', {
      args: [input],
      taskQueue: TASK_QUEUES.PAYMENTS,
      workflowId,
      workflowExecutionTimeout: '5m',
    });

    return handle.result();
  }

  // ============================================================================
  // Onboarding Workflows
  // ============================================================================

  /**
   * Start a user onboarding workflow.
   * This is a long-running workflow (up to 11 days).
   *
   * @param input - User details
   * @returns Workflow handle info
   */
  async startUserOnboardingWorkflow(
    input: UserOnboardingInput
  ): Promise<{ workflowId: string; runId: string }> {
    const client = this.getClient();
    const workflowId = `user-onboarding-${input.userId}`;

    const handle = await client.workflow.start('userOnboardingWorkflow', {
      args: [input],
      taskQueue: TASK_QUEUES.ONBOARDING,
      workflowId,
      workflowExecutionTimeout: '15 days',
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  }

  /**
   * Signal a user onboarding workflow that the user placed their first order.
   *
   * @param userId - The user ID (used to locate the workflow)
   * @param orderId - The order ID
   */
  async signalUserOrderPlaced(userId: string, orderId: string): Promise<void> {
    const client = this.getClient();
    const workflowId = `user-onboarding-${userId}`;

    try {
      const handle = client.workflow.getHandle(workflowId);
      await handle.signal('orderPlaced', orderId);
    } catch (error) {
      // Workflow may have already completed or not exist
      console.warn(`[TemporalService] Could not signal onboarding workflow for user ${userId}:`, error);
    }
  }

  /**
   * Start a restaurant onboarding workflow.
   *
   * @param input - Restaurant details
   * @returns Workflow handle info
   */
  async startRestaurantOnboardingWorkflow(
    input: RestaurantOnboardingInput
  ): Promise<{ workflowId: string; runId: string }> {
    const client = this.getClient();
    const workflowId = `restaurant-onboarding-${input.restaurantId}`;

    const handle = await client.workflow.start('restaurantOnboardingWorkflow', {
      args: [input],
      taskQueue: TASK_QUEUES.ONBOARDING,
      workflowId,
      workflowExecutionTimeout: '30 days',
    });

    return {
      workflowId: handle.workflowId,
      runId: handle.firstExecutionRunId,
    };
  }

  /**
   * Signal restaurant email verification.
   *
   * @param restaurantId - The restaurant ID
   */
  async signalRestaurantEmailVerified(restaurantId: string): Promise<void> {
    const client = this.getClient();
    const workflowId = `restaurant-onboarding-${restaurantId}`;
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('emailVerified');
  }

  /**
   * Signal restaurant admin approval.
   *
   * @param restaurantId - The restaurant ID
   */
  async signalRestaurantApproved(restaurantId: string): Promise<void> {
    const client = this.getClient();
    const workflowId = `restaurant-onboarding-${restaurantId}`;
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('adminApproved');
  }

  /**
   * Signal restaurant admin rejection.
   *
   * @param restaurantId - The restaurant ID
   * @param reason - Rejection reason
   */
  async signalRestaurantRejected(restaurantId: string, reason: string): Promise<void> {
    const client = this.getClient();
    const workflowId = `restaurant-onboarding-${restaurantId}`;
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal('adminRejected', reason);
  }

  // ============================================================================
  // Workflow Management
  // ============================================================================

  /**
   * Get the status of a workflow.
   *
   * @param workflowId - The workflow ID
   * @returns Workflow status information
   */
  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    const client = this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    const description = await handle.describe();

    return {
      workflowId: description.workflowId,
      runId: description.runId,
      status: description.status.name,
    };
  }

  /**
   * Cancel a running workflow.
   *
   * @param workflowId - The workflow ID
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const client = this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.cancel();
  }

  /**
   * Terminate a workflow immediately.
   *
   * @param workflowId - The workflow ID
   * @param reason - Termination reason
   */
  async terminateWorkflow(workflowId: string, reason: string): Promise<void> {
    const client = this.getClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.terminate(reason);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getClient(): Client {
    if (!this.client) {
      throw new Error(
        'Temporal client not initialized. Call connect() first.'
      );
    }
    return this.client;
  }
}
