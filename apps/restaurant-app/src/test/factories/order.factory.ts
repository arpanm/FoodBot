/**
 * Order test data factory
 */

import type { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '../../types/models';

let orderCounter = 0;

export class OrderFactory {
  static build(overrides?: Partial<Order>): Order {
    orderCounter++;
    return {
      id: `order-${orderCounter}-${Date.now()}`,
      orderNumber: `ORD-${String(orderCounter).padStart(5, '0')}`,
      userId: `user-${orderCounter}`,
      customerName: `Customer ${orderCounter}`,
      customerPhone: '+1-555-0100',
      restaurantId: 'restaurant-1',
      items: [OrderFactory.buildItem()],
      subtotal: 25.0,
      deliveryFee: 3.99,
      tax: 2.5,
      discount: 0,
      total: 31.49,
      status: 'PENDING' as OrderStatus,
      paymentMethod: 'CREDIT_CARD' as PaymentMethod,
      paymentStatus: 'COMPLETED' as PaymentStatus,
      deliveryAddress: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
      },
      estimatedDeliveryTime: '30-45 min',
      placedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  static buildItem(overrides?: Partial<OrderItem>): OrderItem {
    return {
      dishId: `dish-${orderCounter}`,
      dishName: `Dish ${orderCounter}`,
      quantity: 2,
      price: 12.5,
      customizations: [],
      subtotal: 25.0,
      ...overrides,
    };
  }

  static buildMany(count: number, overrides?: Partial<Order>): Order[] {
    return Array.from({ length: count }, () => OrderFactory.build(overrides));
  }
}
