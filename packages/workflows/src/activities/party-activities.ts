/**
 * Party Planner Activities
 *
 * Activity implementations for the party order scheduler workflow.
 * Handles restaurant validation, order placement, notifications,
 * and order cancellation for party plans.
 */

interface PartyOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  pricePerUnit: number;
}

interface AvailabilityResult {
  available: boolean;
  unavailableItems: string[];
}

interface PlaceOrderResult {
  orderId: string;
  status: string;
}

interface CancelOrderResult {
  cancelled: boolean;
}

// ============================================================================
// Service Interfaces (injected at worker startup)
// ============================================================================

interface OrderService {
  placeOrder(
    restaurantId: string,
    userId: string,
    items: PartyOrderItem[]
  ): Promise<PlaceOrderResult>;
  cancelOrder(orderId: string, reason: string): Promise<CancelOrderResult>;
}

interface RestaurantService {
  checkAvailability(
    restaurantId: string,
    items: PartyOrderItem[]
  ): Promise<AvailabilityResult>;
}

interface NotificationService {
  send(
    userId: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void>;
}

let orderService: OrderService | null = null;
let restaurantService: RestaurantService | null = null;
let notificationService: NotificationService | null = null;

/**
 * Initialize party activity services.
 * Called during worker startup with actual service instances.
 */
export function initializePartyServices(services: {
  order?: OrderService;
  restaurant?: RestaurantService;
  notification?: NotificationService;
}): void {
  if (services.order) orderService = services.order;
  if (services.restaurant) restaurantService = services.restaurant;
  if (services.notification) notificationService = services.notification;
}

// ============================================================================
// Restaurant Validation
// ============================================================================

/**
 * Validate that a restaurant can fulfill the party order items.
 */
export async function validateRestaurantAvailability(
  restaurantId: string,
  items: PartyOrderItem[]
): Promise<AvailabilityResult> {
  if (!restaurantId || !items || items.length === 0) {
    throw new Error('Restaurant ID and items are required');
  }

  if (restaurantService) {
    return restaurantService.checkAvailability(restaurantId, items);
  }

  // Fallback: mock validation (development mode)
  return { available: true, unavailableItems: [] };
}

// ============================================================================
// Order Placement
// ============================================================================

/**
 * Place a party order with a specific restaurant.
 */
export async function placePartyOrder(
  restaurantId: string,
  userId: string,
  items: PartyOrderItem[]
): Promise<PlaceOrderResult> {
  if (!restaurantId || !userId || !items || items.length === 0) {
    throw new Error('Restaurant ID, user ID, and items are required');
  }

  if (orderService) {
    return orderService.placeOrder(restaurantId, userId, items);
  }

  // Fallback: mock order placement (development mode)
  return {
    orderId: `party-order-${restaurantId}-${Date.now()}`,
    status: 'confirmed',
  };
}

// ============================================================================
// Notifications
// ============================================================================

/**
 * Notify the user about party order status changes.
 */
export async function notifyPartyStatus(
  userId: string,
  message: string,
  data?: Record<string, unknown>
): Promise<void> {
  if (!userId || !message) {
    throw new Error('User ID and message are required');
  }

  if (notificationService) {
    await notificationService.send(userId, message, data);
    return;
  }

  // Fallback: log notification (development mode)
}

// ============================================================================
// Order Cancellation
// ============================================================================

/**
 * Cancel a previously placed party order.
 */
export async function cancelPartyOrder(
  orderId: string,
  reason: string
): Promise<CancelOrderResult> {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  if (orderService) {
    return orderService.cancelOrder(orderId, reason);
  }

  // Fallback: mock cancellation (development mode)
  return { cancelled: true };
}
