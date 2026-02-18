/**
 * Test utility types for TypeScript type safety in tests
 */

/**
 * Creates a mock type with all methods as jest.Mock
 */
export type MockType<T> = {
  [P in keyof T]?: jest.Mock;
};

/**
 * Makes all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Mock Express Request type
 */
export interface MockRequest<T = unknown> {
  user?: unknown;
  body?: T;
  params?: Record<string, string>;
  query?: Record<string, string>;
  headers?: Record<string, string>;
}

/**
 * Mock Express Response type
 */
export interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
}

/**
 * Generic test entity with common fields
 */
export interface TestEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  [key: string]: unknown;
}

/**
 * User entity for testing
 */
export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'restaurant_owner' | 'admin';
  phoneNumber?: string;
}

/**
 * Restaurant entity for testing
 */
export interface TestRestaurant {
  id: string;
  name: string;
  description: string;
  cuisineTypes: string[];
  rating: number;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude: number;
    longitude: number;
  };
  operatingHours?: Record<string, unknown>;
  isApproved: boolean;
  isActive: boolean;
  ownerId: string;
}

/**
 * Dish entity for testing
 */
export interface TestDish {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  restaurantId: string;
  isVegetarian: boolean;
  isAvailable: boolean;
}

/**
 * Order entity for testing
 */
export interface TestOrder {
  id: string;
  userId: string;
  restaurantId: string;
  items: Array<{
    dishId: string;
    quantity: number;
    price: number;
  }>;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total: number;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

/**
 * Cart item for testing
 */
export interface TestCartItem {
  id: string;
  dishId: string;
  quantity: number;
  specialInstructions?: string;
}
