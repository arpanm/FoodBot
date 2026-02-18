/**
 * Test data factory for users
 */

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  avatar?: string;
  addresses: Address[];
  paymentMethods: PaymentMethod[];
  preferences: UserPreferences;
  orderHistory: string[];
  favoriteRestaurants: string[];
  favoriteDishes: string[];
  createdAt: Date;
  lastLoginAt: Date;
}

export interface Address {
  id: string;
  label: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  isDefault: boolean;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'upi' | 'wallet';
  label: string;
  lastFourDigits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
}

export interface UserPreferences {
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
    nutAllergy: boolean;
  };
  cuisines: string[];
  priceRange: {
    min: number;
    max: number;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    orderUpdates: boolean;
    promotions: boolean;
  };
  defaultDeliveryTime: string;
  preferredPaymentMethod?: string;
}

let userIdCounter = 1;

/**
 * Generates a mock user
 * @param overrides - Partial user to override defaults
 * @returns Mock user object
 */
export function mockUser(overrides: Partial<User> = {}): User {
  const id = `user-${userIdCounter++}`;
  return {
    id,
    email: `user${userIdCounter}@example.com`,
    name: `Test User ${userIdCounter}`,
    phone: '+1 (555) 123-4567',
    avatar: `https://example.com/avatar-${id}.jpg`,
    addresses: [
      {
        id: 'addr-1',
        label: 'Home',
        address: '123 Main Street, Apt 4B',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94102',
        phone: '+1 (555) 123-4567',
        isDefault: true,
        coordinates: {
          latitude: 37.7749,
          longitude: -122.4194,
        },
      },
      {
        id: 'addr-2',
        label: 'Work',
        address: '456 Market Street, Suite 200',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94103',
        phone: '+1 (555) 123-4567',
        isDefault: false,
        coordinates: {
          latitude: 37.7849,
          longitude: -122.4094,
        },
      },
    ],
    paymentMethods: [
      {
        id: 'pm-1',
        type: 'card',
        label: 'Visa ending in 1234',
        lastFourDigits: '1234',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true,
      },
      {
        id: 'pm-2',
        type: 'card',
        label: 'Mastercard ending in 5678',
        lastFourDigits: '5678',
        expiryMonth: 6,
        expiryYear: 2026,
        isDefault: false,
      },
    ],
    preferences: {
      dietary: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false,
        nutAllergy: false,
      },
      cuisines: ['Italian', 'Mexican', 'Chinese'],
      priceRange: {
        min: 0,
        max: 50,
      },
      notifications: {
        email: true,
        sms: true,
        push: true,
        orderUpdates: true,
        promotions: false,
      },
      defaultDeliveryTime: 'ASAP',
      preferredPaymentMethod: 'pm-1',
    },
    orderHistory: ['order-1', 'order-2', 'order-3'],
    favoriteRestaurants: ['rest-1', 'rest-2'],
    favoriteDishes: ['dish-1', 'dish-3', 'dish-5'],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date(),
    ...overrides,
  };
}

/**
 * Generates multiple mock users
 * @param count - Number of users to generate
 * @param overrides - Partial user to override defaults
 * @returns Array of mock users
 */
export function mockUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, (_, index) =>
    mockUser({
      id: `user-${index + 1}`,
      email: `user${index + 1}@example.com`,
      name: `Test User ${index + 1}`,
      ...overrides,
    })
  );
}

/**
 * Generates a vegetarian user
 * @param overrides - Partial user to override defaults
 * @returns Mock vegetarian user
 */
export function mockVegetarianUser(overrides: Partial<User> = {}): User {
  return mockUser({
    preferences: {
      dietary: {
        vegetarian: true,
        vegan: false,
        glutenFree: false,
        dairyFree: false,
        nutAllergy: false,
      },
      cuisines: ['Indian', 'Mediterranean', 'Thai'],
      priceRange: { min: 0, max: 50 },
      notifications: {
        email: true,
        sms: true,
        push: true,
        orderUpdates: true,
        promotions: false,
      },
      defaultDeliveryTime: 'ASAP',
    },
    ...overrides,
  });
}

/**
 * Generates a vegan user
 * @param overrides - Partial user to override defaults
 * @returns Mock vegan user
 */
export function mockVeganUser(overrides: Partial<User> = {}): User {
  return mockUser({
    preferences: {
      dietary: {
        vegetarian: true,
        vegan: true,
        glutenFree: false,
        dairyFree: true,
        nutAllergy: false,
      },
      cuisines: ['Vegan', 'Mediterranean', 'Thai'],
      priceRange: { min: 0, max: 50 },
      notifications: {
        email: true,
        sms: true,
        push: true,
        orderUpdates: true,
        promotions: false,
      },
      defaultDeliveryTime: 'ASAP',
    },
    ...overrides,
  });
}

/**
 * Generates a user with no addresses
 * @param overrides - Partial user to override defaults
 * @returns Mock user without addresses
 */
export function mockUserWithoutAddresses(overrides: Partial<User> = {}): User {
  return mockUser({
    addresses: [],
    ...overrides,
  });
}

/**
 * Generates a user with no payment methods
 * @param overrides - Partial user to override defaults
 * @returns Mock user without payment methods
 */
export function mockUserWithoutPaymentMethods(overrides: Partial<User> = {}): User {
  return mockUser({
    paymentMethods: [],
    ...overrides,
  });
}

/**
 * Generates a new user with minimal data
 * @param overrides - Partial user to override defaults
 * @returns Mock new user
 */
export function mockNewUser(overrides: Partial<User> = {}): User {
  return mockUser({
    addresses: [],
    paymentMethods: [],
    orderHistory: [],
    favoriteRestaurants: [],
    favoriteDishes: [],
    createdAt: new Date(),
    ...overrides,
  });
}

/**
 * Resets the user ID counter
 */
export function resetUserIdCounter(): void {
  userIdCounter = 1;
}
