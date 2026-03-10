/**
 * Party Order Scheduler Workflow Types
 *
 * Type definitions for the party order scheduling workflow.
 */

export interface PartyOrderInput {
  partyPlanId: string;
  userId: string;
  eventDate: string;
  eventTime: string;
  restaurantOrders: RestaurantOrder[];
}

export interface RestaurantOrder {
  restaurantId: string;
  restaurantName: string;
  items: PartyOrderItem[];
  estimatedTotal: number;
}

export interface PartyOrderItem {
  dishId: string;
  dishName: string;
  quantity: number;
  pricePerUnit: number;
}

export interface PartyOrderResult {
  partyPlanId: string;
  status: string;
  placedOrders: PlacedOrder[];
  failedOrders: FailedOrder[];
}

export interface PlacedOrder {
  restaurantId: string;
  orderId: string;
  status: string;
}

export interface FailedOrder {
  restaurantId: string;
  reason: string;
}

export interface PartyActivities {
  validateRestaurantAvailability(
    restaurantId: string,
    items: PartyOrderItem[]
  ): Promise<{ available: boolean; unavailableItems: string[] }>;
  placePartyOrder(
    restaurantId: string,
    userId: string,
    items: PartyOrderItem[]
  ): Promise<{ orderId: string; status: string }>;
  notifyPartyStatus(
    userId: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void>;
  cancelPartyOrder(
    orderId: string,
    reason: string
  ): Promise<{ cancelled: boolean }>;
}
