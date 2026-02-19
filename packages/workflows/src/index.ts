/**
 * FoodBot Workflows Package
 *
 * Temporal workflow and activity definitions for the FoodBot platform.
 *
 * Workflows:
 * - searchRestaurantWorkflow: Restaurant discovery with caching and personalization
 * - placeOrderWorkflow: Order placement with saga pattern compensation
 * - processPaymentWorkflow: Payment processing with retry and idempotency
 * - orderFulfillmentWorkflow: Order lifecycle from preparation to delivery
 * - userOnboardingWorkflow: Multi-day user engagement sequence
 * - restaurantOnboardingWorkflow: Restaurant partner onboarding with approval
 *
 * Activities organized by domain:
 * - database.activities: CRUD operations, order management
 * - payment.activities: Payment processing, refunds, cart validation
 * - notification.activities: Email, SMS, push, in-app notifications
 * - external.activities: MCP search, delivery, cache, inventory
 * - llm.activities: Intent extraction, recommendations, context loading
 */

// Export all workflows
export * from './workflows';

// Export all activities
export * as activities from './activities';

// Export types
export type {
  UserContext,
  Restaurant,
  CartItem,
  PaymentDetails,
  PaymentResult,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  SearchRestaurantInput,
  PlaceOrderInput,
  PlaceOrderResult,
  ProcessPaymentInput,
  OrderFulfillmentInput,
  UserOnboardingInput,
  RestaurantOnboardingInput,
  TemporalConfig,
  TaskQueue,
  EmailPayload,
  SMSPayload,
  PushNotificationPayload,
  DeliveryPartner,
  DeliveryAssignment,
} from './types';

// Export constants
export { TASK_QUEUES } from './types';

// Export errors
export {
  WorkflowError,
  PaymentError,
  PaymentDeclinedError,
  PaymentTimeoutError,
  PaymentGatewayError,
  PaymentFraudError,
  OrderError,
  OrderNotFoundError,
  InventoryUnavailableError,
  InvalidCartError,
  ExternalServiceError,
  MCPSearchError,
  DeliveryServiceError,
  DatabaseError,
  NotificationError,
  RETRY_POLICIES,
  isRetryableError,
  getUserFriendlyMessage,
} from './errors';

// Export worker manager
export { WorkerManager } from './workers/worker-manager';
