import { z } from 'zod';

import { createEventSchema } from './base-event';

// --- Enums ---

export const OrderStatusEnum = z.enum([
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'out_for_delivery',
  'delivered',
  'cancelled',
]);

export type OrderStatus = z.infer<typeof OrderStatusEnum>;

// --- Data Schemas ---

const OrderItemSchema = z.object({
  dishId: z.string().uuid(),
  dishName: z.string(),
  quantity: z.number().int().positive(),
  price: z.number().min(0),
  specialInstructions: z.string().optional(),
});

const OrderCreatedDataSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  items: z.array(OrderItemSchema),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  tax: z.number().min(0),
  discount: z.number().min(0),
  total: z.number().min(0),
  paymentMethod: z.string(),
  deliveryAddress: z.record(z.unknown()),
  specialInstructions: z.string().optional(),
  estimatedDeliveryTime: z.string().datetime(),
});

const OrderStatusChangedDataSchema = z.object({
  orderId: z.string().uuid(),
  userId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  oldStatus: OrderStatusEnum,
  newStatus: OrderStatusEnum,
  reason: z.string().optional(),
});

// --- Event Schemas ---

export const OrderCreatedEventSchema = createEventSchema(
  'order.created',
  OrderCreatedDataSchema,
);

export const OrderStatusChangedEventSchema = createEventSchema(
  'order.status.changed',
  OrderStatusChangedDataSchema,
);

// --- Type Exports ---

export type OrderCreatedEvent = z.infer<typeof OrderCreatedEventSchema>;
export type OrderStatusChangedEvent = z.infer<typeof OrderStatusChangedEventSchema>;

export type OrderEvent = OrderCreatedEvent | OrderStatusChangedEvent;
