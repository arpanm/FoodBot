/**
 * Order Response DTOs
 *
 * Typed response formats for order API endpoints.
 * Follows FR-CA-ORDER-001: Order placement and tracking.
 */

export interface OrderItemResponseDto {
  id: string;
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface SubOrderResponseDto {
  subOrderId: string;
  restaurantId: string;
  provider: string;
  status: string;
  items: OrderItemResponseDto[];
  subtotal: number;
}

export interface OrderResponseDto {
  id: string;
  userId: string;
  restaurantId: string;
  items: OrderItemResponseDto[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  deliveryAddress: Record<string, unknown>;
  specialInstructions?: string;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  subOrders?: SubOrderResponseDto[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedOrderResponseDto {
  orders: OrderResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ScheduledOrderResponseDto extends OrderResponseDto {
  scheduledTime: string;
  modificationDeadline: string;
  cancellationDeadline: string;
  isModifiable: boolean;
}
