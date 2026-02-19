/**
 * Shared Type Definitions for FoodBot Workflows
 *
 * Central type definitions used across activities, workflows, and the gateway API.
 */

// ============================================================================
// User & Context Types
// ============================================================================

export interface UserContext {
  userId: string;
  preferences: {
    cuisine: string[];
    priceRange?: [number, number];
    dietaryRestrictions?: string[];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  orderHistory?: string[];
}

// ============================================================================
// Restaurant & Dish Types
// ============================================================================

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: number;
  location: {
    latitude: number;
    longitude: number;
  };
  availability: boolean;
}

export interface Dish {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  availability: boolean;
  dietaryTags: string[];
}

// ============================================================================
// Cart & Order Types
// ============================================================================

export interface CartItem {
  dishId: string;
  quantity: number;
  price: number;
  customizations?: Record<string, unknown>;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentId?: string;
  deliveryAddress?: string;
  deliveryPartnerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Payment Types
// ============================================================================

export type PaymentMethod = 'card' | 'upi' | 'cash' | 'wallet';

export interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}

export type PaymentStatus = 'success' | 'failed' | 'pending';

export interface PaymentResult {
  paymentId: string;
  status: PaymentStatus;
  transactionId?: string;
  errorMessage?: string;
  requires3DS?: boolean;
  authUrl?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Notification Types
// ============================================================================

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

export interface SMSPayload {
  phone: string;
  message: string;
}

export interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// Delivery Types
// ============================================================================

export interface DeliveryPartner {
  id: string;
  name: string;
  phone: string;
  location: {
    latitude: number;
    longitude: number;
  };
  available: boolean;
}

export interface DeliveryAssignment {
  orderId: string;
  partnerId: string;
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered';
}

// ============================================================================
// Workflow Input Types
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

export interface PlaceOrderInput {
  userId: string;
  restaurantId: string;
  items: CartItem[];
  paymentDetails: PaymentDetails;
  deliveryAddress: string;
}

export interface PlaceOrderResult {
  orderId: string;
  status: string;
  paymentId?: string;
}

export interface ProcessPaymentInput {
  orderId: string;
  paymentDetails: PaymentDetails;
  allowPartial?: boolean;
}

export interface OrderFulfillmentInput {
  orderId: string;
  restaurantId: string;
  userId: string;
  deliveryAddress: string;
}

export interface UserOnboardingInput {
  userId: string;
  email: string;
  name: string;
}

export interface RestaurantOnboardingInput {
  restaurantId: string;
  ownerEmail: string;
  restaurantName: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface WorkflowError {
  code: string;
  message: string;
  technicalMessage: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface TemporalConfig {
  address: string;
  namespace: string;
  taskQueue: string;
  workerCount: number;
  connectionTimeoutMs: number;
}

export const TASK_QUEUES = {
  MAIN: 'foodbot-main-queue',
  ORDERS: 'foodbot-orders-queue',
  PAYMENTS: 'foodbot-payments-queue',
  NOTIFICATIONS: 'foodbot-notifications-queue',
  ONBOARDING: 'foodbot-onboarding-queue',
} as const;

export type TaskQueue = (typeof TASK_QUEUES)[keyof typeof TASK_QUEUES];
