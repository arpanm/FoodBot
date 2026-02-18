/**
 * Workflow Input Factories
 *
 * Factory functions for generating test data for workflow inputs
 */

import type {
  UserContext,
  Restaurant,
  Dish,
  CartItem,
  Order,
  PaymentDetails,
  PaymentResult,
  RecommendationContext,
  Recommendation,
  Intent,
  WorkflowDefinition,
  Notification,
} from '../mocks/activity-mocks';

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

// ============================================================================
// User Context Factories
// ============================================================================

export function createUserContext(overrides?: Partial<UserContext>): UserContext {
  return {
    userId: generateId('user'),
    preferences: {
      cuisine: ['Italian', 'Chinese'],
      priceRange: [10, 50],
      dietaryRestrictions: [],
    },
    location: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    orderHistory: [],
    ...overrides,
  };
}

// ============================================================================
// Restaurant Factories
// ============================================================================

export function createRestaurant(overrides?: Partial<Restaurant>): Restaurant {
  const cuisines = ['Italian', 'Chinese', 'Indian', 'Mexican', 'Japanese', 'Thai'];

  return {
    id: generateId('rest'),
    name: `Restaurant ${randomInt(1, 999)}`,
    cuisine: randomChoice(cuisines),
    rating: 4.0 + Math.random(),
    priceRange: randomInt(1, 4),
    location: {
      latitude: 40.7128 + (Math.random() - 0.5) * 0.1,
      longitude: -74.006 + (Math.random() - 0.5) * 0.1,
    },
    availability: true,
    ...overrides,
  };
}

export function createRestaurants(count: number, overrides?: Partial<Restaurant>): Restaurant[] {
  return Array.from({ length: count }, () => createRestaurant(overrides));
}

// ============================================================================
// Dish Factories
// ============================================================================

export function createDish(overrides?: Partial<Dish>): Dish {
  const categories = ['Appetizer', 'Main Course', 'Dessert', 'Beverage', 'Side'];
  const dietaryTags = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal'];

  return {
    id: generateId('dish'),
    restaurantId: generateId('rest'),
    name: `Dish ${randomInt(1, 999)}`,
    description: 'Delicious food item',
    price: randomInt(5, 50),
    category: randomChoice(categories),
    availability: true,
    dietaryTags: [randomChoice(dietaryTags)],
    ...overrides,
  };
}

export function createDishes(count: number, overrides?: Partial<Dish>): Dish[] {
  return Array.from({ length: count }, () => createDish(overrides));
}

// ============================================================================
// Cart and Order Factories
// ============================================================================

export function createCartItem(overrides?: Partial<CartItem>): CartItem {
  return {
    dishId: generateId('dish'),
    quantity: randomInt(1, 5),
    price: randomInt(10, 50),
    customizations: {},
    ...overrides,
  };
}

export function createCartItems(count: number, overrides?: Partial<CartItem>): CartItem[] {
  return Array.from({ length: count }, () => createCartItem(overrides));
}

export function createOrder(overrides?: Partial<Order>): Order {
  const statuses: Order['status'][] = [
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'cancelled',
  ];

  return {
    id: generateId('order'),
    userId: generateId('user'),
    restaurantId: generateId('rest'),
    items: createCartItems(randomInt(1, 5)),
    total: randomInt(20, 100),
    status: randomChoice(statuses),
    paymentId: generateId('payment'),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ============================================================================
// Payment Factories
// ============================================================================

export function createPaymentDetails(overrides?: Partial<PaymentDetails>): PaymentDetails {
  const methods: PaymentDetails['method'][] = ['card', 'upi', 'cash', 'wallet'];

  return {
    method: randomChoice(methods),
    amount: randomInt(10, 100),
    currency: 'USD',
    metadata: {},
    ...overrides,
  };
}

export function createPaymentResult(overrides?: Partial<PaymentResult>): PaymentResult {
  const statuses: PaymentResult['status'][] = ['success', 'failed', 'pending'];

  return {
    paymentId: generateId('payment'),
    status: randomChoice(statuses),
    transactionId: generateId('txn'),
    ...overrides,
  };
}

export function createSuccessfulPaymentResult(
  overrides?: Partial<PaymentResult>
): PaymentResult {
  return createPaymentResult({
    status: 'success',
    transactionId: generateId('txn'),
    ...overrides,
  });
}

export function createFailedPaymentResult(overrides?: Partial<PaymentResult>): PaymentResult {
  return createPaymentResult({
    status: 'failed',
    errorMessage: 'Payment declined',
    ...overrides,
  });
}

// ============================================================================
// Recommendation Factories
// ============================================================================

export function createRecommendationContext(
  overrides?: Partial<RecommendationContext>
): RecommendationContext {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timesOfDay = ['morning', 'afternoon', 'evening', 'night'];

  return {
    userId: generateId('user'),
    sessionId: generateId('session'),
    currentLocation: {
      latitude: 40.7128,
      longitude: -74.006,
    },
    timeOfDay: randomChoice(timesOfDay),
    dayOfWeek: randomChoice(daysOfWeek),
    orderHistory: [],
    preferences: {},
    ...overrides,
  };
}

export function createRecommendation(overrides?: Partial<Recommendation>): Recommendation {
  const types: Recommendation['type'][] = ['restaurant', 'dish'];

  return {
    type: randomChoice(types),
    id: generateId('rec'),
    name: `Recommendation ${randomInt(1, 999)}`,
    reason: 'Based on your preferences',
    score: Math.random(),
    metadata: {},
    ...overrides,
  };
}

export function createRecommendations(
  count: number,
  overrides?: Partial<Recommendation>
): Recommendation[] {
  return Array.from({ length: count }, () => createRecommendation(overrides));
}

// ============================================================================
// LLM Intent Factories
// ============================================================================

export function createIntent(overrides?: Partial<Intent>): Intent {
  const types = [
    'search_restaurant',
    'search_dish',
    'place_order',
    'track_order',
    'cancel_order',
    'get_recommendations',
  ];

  return {
    type: randomChoice(types),
    confidence: 0.8 + Math.random() * 0.2,
    entities: {},
    originalQuery: 'User query text',
    ...overrides,
  };
}

export function createSearchRestaurantIntent(overrides?: Partial<Intent>): Intent {
  return createIntent({
    type: 'search_restaurant',
    entities: {
      cuisine: 'Italian',
      location: 'Manhattan',
      priceRange: [10, 50],
    },
    originalQuery: 'Find Italian restaurants in Manhattan',
    ...overrides,
  });
}

export function createPlaceOrderIntent(overrides?: Partial<Intent>): Intent {
  return createIntent({
    type: 'place_order',
    entities: {
      restaurantId: generateId('rest'),
      items: createCartItems(2),
    },
    originalQuery: 'I want to order pizza',
    ...overrides,
  });
}

// ============================================================================
// Workflow Definition Factories
// ============================================================================

export function createWorkflowDefinition(
  overrides?: Partial<WorkflowDefinition>
): WorkflowDefinition {
  return {
    id: generateId('workflow'),
    steps: [
      {
        id: 'step1',
        type: 'activity',
        activityName: 'loadUserContext',
        input: {},
        dependencies: [],
        timeout: '30s',
      },
    ],
    errorHandling: {
      retryPolicy: {
        maximumAttempts: 3,
        initialInterval: '1s',
      },
    },
    retryPolicy: {
      maximumAttempts: 3,
      initialInterval: '1s',
      backoffCoefficient: 2,
    },
    ...overrides,
  };
}

// ============================================================================
// Notification Factories
// ============================================================================

export function createNotification(overrides?: Partial<Notification>): Notification {
  const types: Notification['type'][] = ['email', 'sms', 'push', 'in-app'];

  return {
    userId: generateId('user'),
    type: randomChoice(types),
    title: 'Notification Title',
    body: 'Notification message',
    data: {},
    ...overrides,
  };
}

// ============================================================================
// Search Query Factories
// ============================================================================

export interface SearchRestaurantInput {
  userId: string;
  query: string;
  filters?: {
    cuisine?: string[];
    priceRange?: [number, number];
    rating?: number;
    location?: { latitude: number; longitude: number };
    radius?: number;
  };
}

export function createSearchRestaurantInput(
  overrides?: Partial<SearchRestaurantInput>
): SearchRestaurantInput {
  return {
    userId: generateId('user'),
    query: 'pizza',
    filters: {
      cuisine: ['Italian'],
      priceRange: [10, 50],
      rating: 4.0,
    },
    ...overrides,
  };
}

export interface SearchDishInput {
  userId: string;
  query: string;
  restaurantId?: string;
  filters?: {
    category?: string[];
    priceRange?: [number, number];
    dietaryTags?: string[];
  };
}

export function createSearchDishInput(overrides?: Partial<SearchDishInput>): SearchDishInput {
  return {
    userId: generateId('user'),
    query: 'pasta',
    restaurantId: generateId('rest'),
    filters: {
      category: ['Main Course'],
      priceRange: [10, 30],
    },
    ...overrides,
  };
}

// ============================================================================
// Order Management Input Factories
// ============================================================================

export interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: CartItem[];
  paymentDetails: PaymentDetails;
  deliveryAddress: string;
}

export function createPlaceOrderInput(overrides?: Partial<PlaceOrderInput>): PlaceOrderInput {
  return {
    userId: generateId('user'),
    restaurantId: generateId('rest'),
    items: createCartItems(randomInt(1, 3)),
    paymentDetails: createPaymentDetails(),
    deliveryAddress: '123 Main St, City, State 12345',
    ...overrides,
  };
}

export interface CancelOrderInput {
  orderId: string;
  userId: string;
  reason?: string;
}

export function createCancelOrderInput(overrides?: Partial<CancelOrderInput>): CancelOrderInput {
  return {
    orderId: generateId('order'),
    userId: generateId('user'),
    reason: 'Changed my mind',
    ...overrides,
  };
}
