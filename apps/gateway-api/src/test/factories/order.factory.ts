import { faker } from '@faker-js/faker';

export interface MockOrder {
  id: string;
  userId: string;
  restaurantId: string;
  items: MockOrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: DeliveryAddress;
  deliveryInstructions?: string;
  scheduledTime?: Date;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  trackingUpdates: TrackingUpdate[];
  feedback?: OrderFeedback;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockOrderItem {
  id: string;
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'card' | 'cash' | 'upi' | 'wallet';

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
}

export interface TrackingUpdate {
  status: OrderStatus;
  message: string;
  timestamp: Date;
}

export interface OrderFeedback {
  rating: number;
  comment?: string;
  foodQuality: number;
  deliverySpeed: number;
  packaging: number;
}

/**
 * Factory for creating mock order data
 */
export class OrderFactory {
  /**
   * Creates a mock order with default values
   */
  static create(overrides?: Partial<MockOrder>): MockOrder {
    const items = overrides?.items || this.createOrderItems(3);
    const subtotal =
      overrides?.subtotal ||
      items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee =
      overrides?.deliveryFee ||
      faker.number.float({ min: 2, max: 8, fractionDigits: 2 });
    const tax =
      overrides?.tax ||
      faker.number.float({ min: subtotal * 0.05, max: subtotal * 0.1, fractionDigits: 2 });
    const discount = overrides?.discount || 0;
    const total = subtotal + deliveryFee + tax - discount;

    const defaultOrder: MockOrder = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      restaurantId: faker.string.uuid(),
      items,
      subtotal,
      deliveryFee,
      tax,
      discount,
      total,
      status: 'pending',
      paymentMethod: faker.helpers.arrayElement([
        'card',
        'cash',
        'upi',
        'wallet',
      ] as const),
      paymentStatus: 'pending',
      deliveryAddress: this.createDeliveryAddress(),
      estimatedDeliveryTime: faker.date.future({ years: 0.01 }),
      trackingUpdates: [
        {
          status: 'pending',
          message: 'Order placed successfully',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { ...defaultOrder, ...overrides };
  }

  /**
   * Creates multiple mock orders
   */
  static createMany(count: number, overrides?: Partial<MockOrder>): MockOrder[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Creates mock order items
   */
  static createOrderItems(count: number): MockOrderItem[] {
    return Array.from({ length: count }, () => ({
      id: faker.string.uuid(),
      dishId: faker.string.uuid(),
      dishName: faker.food.dish(),
      quantity: faker.number.int({ min: 1, max: 5 }),
      price: faker.number.float({ min: 5, max: 30, fractionDigits: 2 }),
      specialInstructions: faker.datatype.boolean()
        ? faker.lorem.sentence()
        : undefined,
    }));
  }

  /**
   * Creates a delivery address
   */
  static createDeliveryAddress(): DeliveryAddress {
    return {
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: 'United States',
      latitude: parseFloat(faker.location.latitude().toString()),
      longitude: parseFloat(faker.location.longitude().toString()),
      phoneNumber: faker.phone.number({ style: 'national' }),
    };
  }

  /**
   * Creates an order with specific status
   */
  static createWithStatus(
    status: OrderStatus,
    overrides?: Partial<MockOrder>
  ): MockOrder {
    const trackingUpdates: TrackingUpdate[] = [
      {
        status: 'pending',
        message: 'Order placed successfully',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
      },
    ];

    if (status !== 'pending') {
      trackingUpdates.push({
        status,
        message: `Order status updated to ${status}`,
        timestamp: new Date(),
      });
    }

    return this.create({
      status,
      trackingUpdates,
      ...overrides,
    });
  }

  /**
   * Creates a confirmed order
   */
  static createConfirmed(overrides?: Partial<MockOrder>): MockOrder {
    return this.createWithStatus('confirmed', {
      paymentStatus: 'completed',
      ...overrides,
    });
  }

  /**
   * Creates a delivered order
   */
  static createDelivered(overrides?: Partial<MockOrder>): MockOrder {
    return this.createWithStatus('delivered', {
      paymentStatus: 'completed',
      actualDeliveryTime: new Date(),
      ...overrides,
    });
  }

  /**
   * Creates a cancelled order
   */
  static createCancelled(overrides?: Partial<MockOrder>): MockOrder {
    return this.createWithStatus('cancelled', {
      paymentStatus: 'refunded',
      ...overrides,
    });
  }

  /**
   * Creates orders for a specific user
   */
  static createManyForUser(
    userId: string,
    count: number,
    overrides?: Partial<MockOrder>
  ): MockOrder[] {
    return Array.from({ length: count }, () =>
      this.create({ userId, ...overrides })
    );
  }

  /**
   * Creates order creation data
   */
  static createOrderData(
    overrides?: Partial<{
      restaurantId: string;
      items: MockOrderItem[];
      deliveryAddress: DeliveryAddress;
      paymentMethod: PaymentMethod;
      deliveryInstructions: string;
      scheduledTime: Date;
    }>
  ) {
    return {
      restaurantId: faker.string.uuid(),
      items: this.createOrderItems(2),
      deliveryAddress: this.createDeliveryAddress(),
      paymentMethod: faker.helpers.arrayElement([
        'card',
        'cash',
        'upi',
        'wallet',
      ] as const),
      ...overrides,
    };
  }

  /**
   * Creates order feedback
   */
  static createFeedback(overrides?: Partial<OrderFeedback>): OrderFeedback {
    return {
      rating: faker.number.int({ min: 3, max: 5 }),
      comment: faker.lorem.sentence(),
      foodQuality: faker.number.int({ min: 3, max: 5 }),
      deliverySpeed: faker.number.int({ min: 3, max: 5 }),
      packaging: faker.number.int({ min: 3, max: 5 }),
      ...overrides,
    };
  }
}

/**
 * Helper function to create a mock order
 */
export function createMockOrder(overrides?: Partial<MockOrder>): MockOrder {
  return OrderFactory.create(overrides);
}
