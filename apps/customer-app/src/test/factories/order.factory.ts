/**
 * Test data factory for orders
 */

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: DeliveryAddress;
  specialInstructions?: string;
  estimatedDeliveryTime: string;
  placedAt: Date;
  confirmedAt?: Date;
  preparingAt?: Date;
  outForDeliveryAt?: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  trackingInfo?: TrackingInfo;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'card' | 'cash' | 'upi' | 'wallet';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  dishId: string;
  dishName: string;
  quantity: number;
  price: number;
  customizations: OrderCustomization[];
  specialInstructions?: string;
  subtotal: number;
}

export interface OrderCustomization {
  customizationId: string;
  optionId: string;
  optionName: string;
  priceModifier: number;
}

export interface DeliveryAddress {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface TrackingInfo {
  currentStage: string;
  stages: TrackingStage[];
  estimatedArrival: Date;
  driverInfo?: DriverInfo;
}

export interface TrackingStage {
  name: string;
  completed: boolean;
  completedAt?: Date;
}

export interface DriverInfo {
  name: string;
  phone: string;
  vehicleNumber: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
}

let orderIdCounter = 1;

/**
 * Generates a mock order
 * @param overrides - Partial order to override defaults
 * @returns Mock order object
 */
export function mockOrder(overrides: Partial<Order> = {}): Order {
  const id = `order-${orderIdCounter++}`;
  const subtotal = 25.99;
  const deliveryFee = 5.99;
  const tax = 2.6;
  const discount = 0;

  return {
    id,
    userId: 'user-1',
    restaurantId: 'rest-1',
    restaurantName: 'Test Restaurant',
    items: [
      {
        id: 'item-1',
        dishId: 'dish-1',
        dishName: 'Margherita Pizza',
        quantity: 1,
        price: 12.99,
        customizations: [
          {
            customizationId: 'size',
            optionId: 'large',
            optionName: 'Large',
            priceModifier: 3,
          },
        ],
        subtotal: 15.99,
      },
      {
        id: 'item-2',
        dishId: 'dish-2',
        dishName: 'Caesar Salad',
        quantity: 1,
        price: 10,
        customizations: [],
        subtotal: 10,
      },
    ],
    subtotal,
    deliveryFee,
    tax,
    discount,
    total: subtotal + deliveryFee + tax - discount,
    status: 'pending',
    paymentMethod: 'card',
    paymentStatus: 'pending',
    deliveryAddress: {
      id: 'addr-1',
      label: 'Home',
      address: '123 Main Street, Apt 4B',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      phone: '+1 (555) 123-4567',
      coordinates: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
    },
    estimatedDeliveryTime: '30-45 min',
    placedAt: new Date('2024-01-01T12:00:00Z'),
    ...overrides,
  };
}

/**
 * Generates multiple mock orders
 * @param count - Number of orders to generate
 * @param overrides - Partial order to override defaults
 * @returns Array of mock orders
 */
export function mockOrders(count: number, overrides: Partial<Order> = {}): Order[] {
  return Array.from({ length: count }, (_, index) =>
    mockOrder({
      id: `order-${index + 1}`,
      placedAt: new Date(Date.now() - (count - index) * 86400000),
      ...overrides,
    })
  );
}

/**
 * Generates an order with specific status
 * @param status - Order status
 * @param overrides - Partial order to override defaults
 * @returns Mock order with specified status
 */
export function mockOrderWithStatus(
  status: OrderStatus,
  overrides: Partial<Order> = {}
): Order {
  const now = new Date();
  const baseOrder = mockOrder({ status, ...overrides });

  const timestamps: Partial<Order> = {
    placedAt: new Date(now.getTime() - 3600000),
  };

  if (['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].includes(status)) {
    timestamps.confirmedAt = new Date(now.getTime() - 3000000);
  }

  if (['preparing', 'ready', 'out_for_delivery', 'delivered'].includes(status)) {
    timestamps.preparingAt = new Date(now.getTime() - 2400000);
  }

  if (['out_for_delivery', 'delivered'].includes(status)) {
    timestamps.outForDeliveryAt = new Date(now.getTime() - 1200000);
  }

  if (status === 'delivered') {
    timestamps.deliveredAt = now;
  }

  if (status === 'cancelled') {
    timestamps.cancelledAt = now;
  }

  return {
    ...baseOrder,
    ...timestamps,
  };
}

/**
 * Generates an order with tracking information
 * @param overrides - Partial order to override defaults
 * @returns Mock order with tracking
 */
export function mockOrderWithTracking(overrides: Partial<Order> = {}): Order {
  return mockOrder({
    status: 'out_for_delivery',
    trackingInfo: {
      currentStage: 'out_for_delivery',
      stages: [
        { name: 'pending', completed: true, completedAt: new Date('2024-01-01T12:00:00Z') },
        { name: 'confirmed', completed: true, completedAt: new Date('2024-01-01T12:05:00Z') },
        { name: 'preparing', completed: true, completedAt: new Date('2024-01-01T12:10:00Z') },
        { name: 'ready', completed: true, completedAt: new Date('2024-01-01T12:25:00Z') },
        { name: 'out_for_delivery', completed: true, completedAt: new Date('2024-01-01T12:30:00Z') },
        { name: 'delivered', completed: false },
      ],
      estimatedArrival: new Date(Date.now() + 900000),
      driverInfo: {
        name: 'John Doe',
        phone: '+1 (555) 987-6543',
        vehicleNumber: 'ABC 1234',
        currentLocation: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      },
    },
    ...overrides,
  });
}

/**
 * Generates a paid order
 * @param overrides - Partial order to override defaults
 * @returns Mock paid order
 */
export function mockPaidOrder(overrides: Partial<Order> = {}): Order {
  return mockOrder({
    paymentStatus: 'paid',
    status: 'confirmed',
    ...overrides,
  });
}

/**
 * Generates a cancelled order
 * @param overrides - Partial order to override defaults
 * @returns Mock cancelled order
 */
export function mockCancelledOrder(overrides: Partial<Order> = {}): Order {
  return mockOrder({
    status: 'cancelled',
    cancelledAt: new Date(),
    ...overrides,
  });
}

/**
 * Generates a delivered order
 * @param overrides - Partial order to override defaults
 * @returns Mock delivered order
 */
export function mockDeliveredOrder(overrides: Partial<Order> = {}): Order {
  return mockOrderWithStatus('delivered', overrides);
}

/**
 * Resets the order ID counter
 */
export function resetOrderIdCounter(): void {
  orderIdCounter = 1;
}
