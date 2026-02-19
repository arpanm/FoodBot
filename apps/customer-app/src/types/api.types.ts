/**
 * API Request and Response Types
 * Types for API communication with the backend
 */

import type {
  Message,
  JobStatus,
  Restaurant,
  Dish,
  Order,
  CartItem,
  User,
  Address,
  UserPreferences,
  Review,
  PaymentMethod,
  PaginatedResponse} from './models';
import {
  OrderItem
} from './models';

// ==================== Common API Types ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface ApiPaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ==================== Auth API Types ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ==================== Chat API Types ====================

export interface SendMessageRequest {
  message: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface SendMessageResponse {
  jobId: string;
  message: Message;
  sessionId: string;
}

export interface JobStatusResponse {
  status: JobStatus;
  result?: Message;
  error?: string;
  progress?: number;
}

// ==================== Job API Types ====================

export interface CreateJobRequest {
  action: string;
  platform: string;
  payload: Record<string, unknown>;
}

export interface CreateJobResponse {
  id: string;
  action: string;
  platform: string;
  status: JobStatus;
  createdAt: string;
}

export interface GetJobStatusRequest {
  jobId: string;
}

export interface GetJobStatusResponse<T = unknown> {
  id: string;
  action: string;
  platform: string;
  status: JobStatus;
  result?: T;
  error?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ChatHistoryResponse {
  messages: Message[];
  sessionId: string;
  hasMore: boolean;
}

// ==================== Restaurant API Types ====================

export interface SearchRestaurantsRequest {
  query?: string;
  cuisine?: string[];
  priceRange?: number[];
  rating?: number;
  deliveryTime?: string;
  dietary?: string[];
  sortBy?: 'rating' | 'deliveryTime' | 'price' | 'distance';
  isOpen?: boolean;
  latitude?: number;
  longitude?: number;
  page?: number;
  limit?: number;
}

export type SearchRestaurantsResponse = PaginatedResponse<Restaurant>;

export interface RestaurantDetailResponse {
  restaurant: Restaurant;
  menu: Dish[];
  reviews: Review[];
}

export interface RestaurantReviewsRequest {
  restaurantId: string;
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'rating' | 'helpful';
}

export type RestaurantReviewsResponse = PaginatedResponse<Review>;

// ==================== Dish API Types ====================

export interface SearchDishesRequest {
  query?: string;
  restaurantId?: string;
  category?: string[];
  priceRange?: number[];
  dietary?: string[];
  spiceLevel?: number[];
  sortBy?: 'rating' | 'price' | 'name';
  page?: number;
  limit?: number;
}

export type SearchDishesResponse = PaginatedResponse<Dish>;

export interface DishDetailResponse {
  dish: Dish;
  similarDishes?: Dish[];
  reviews?: Review[];
}

// ==================== Cart API Types ====================

export interface GetCartResponse {
  items: CartItem[];
  restaurantId?: string;
  restaurantName?: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
}

export interface AddCartItemRequest {
  dishId: string;
  quantity: number;
  customizations?: Array<{
    customizationId: string;
    optionId: string;
  }>;
  specialInstructions?: string;
}

export interface AddCartItemResponse {
  item: CartItem;
  cart: GetCartResponse;
}

export interface UpdateCartItemRequest {
  quantity?: number;
  customizations?: Array<{
    customizationId: string;
    optionId: string;
  }>;
  specialInstructions?: string;
}

export interface UpdateCartItemResponse {
  item: CartItem;
  cart: GetCartResponse;
}

// ==================== Order API Types ====================

export interface CreateOrderRequest {
  restaurantId: string;
  items: Array<{
    dishId: string;
    quantity: number;
    customizations?: Array<{
      customizationId: string;
      optionId: string;
    }>;
    specialInstructions?: string;
  }>;
  deliveryAddressId: string;
  paymentMethod: PaymentMethod;
  specialInstructions?: string;
  scheduledFor?: string;
  couponCode?: string;
}

export interface CreateOrderResponse {
  order: Order;
  paymentUrl?: string;
}

export interface OrderListResponse {
  orders: Order[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface OrderDetailResponse {
  order: Order;
  tracking: Order['trackingInfo'];
}

export interface TrackOrderResponse {
  orderId: string;
  status: Order['status'];
  trackingInfo: Order['trackingInfo'];
  estimatedDeliveryTime: string;
  updates: Array<{
    status: Order['status'];
    timestamp: Date;
    message?: string;
  }>;
}

export interface CancelOrderRequest {
  orderId: string;
  reason: string;
}

export interface CancelOrderResponse {
  success: boolean;
  message: string;
  refundAmount?: number;
  refundEta?: string;
}

// ==================== User API Types ====================

export interface GetUserResponse {
  user: User;
}

export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
  avatar?: string;
}

export interface UpdateProfileResponse {
  user: User;
}

export interface UpdatePreferencesRequest {
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
  language?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface UpdatePreferencesResponse {
  preferences: UserPreferences;
}

export interface GetAddressesResponse {
  addresses: Address[];
}

export interface CreateAddressRequest {
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault?: boolean;
}

export interface CreateAddressResponse {
  address: Address;
}

export interface UpdateAddressRequest extends Partial<CreateAddressRequest> {
  addressId: string;
}

export interface UpdateAddressResponse {
  address: Address;
}

// ==================== Payment API Types ====================

export interface InitiatePaymentRequest {
  orderId: string;
  paymentMethod: PaymentMethod;
  amount: number;
}

export interface InitiatePaymentResponse {
  paymentId: string;
  paymentUrl?: string;
  qrCode?: string;
  status: 'PENDING' | 'PROCESSING';
}

export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  status: Order['paymentStatus'];
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  timestamp: Date;
}

// ==================== Feedback/Review API Types ====================

export interface CreateReviewRequest {
  orderId: string;
  restaurantId: string;
  rating: number;
  comment: string;
  images?: string[];
  dishReviews?: Array<{
    dishId: string;
    rating: number;
    comment?: string;
  }>;
}

export interface CreateReviewResponse {
  review: Review;
  message: string;
}

// ==================== Notification API Types ====================

export interface Notification {
  id: string;
  type: 'ORDER_UPDATE' | 'PROMOTION' | 'DELIVERY' | 'PAYMENT' | 'GENERAL';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

export interface GetNotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

export interface MarkNotificationReadRequest {
  notificationId: string;
}

// ==================== Search Suggestions API Types ====================

export interface SearchSuggestionsRequest {
  query: string;
  type?: 'restaurant' | 'dish' | 'all';
  limit?: number;
}

export interface SearchSuggestionsResponse {
  restaurants: Array<{
    id: string;
    name: string;
    cuisine: string[];
    logo: string;
  }>;
  dishes: Array<{
    id: string;
    name: string;
    restaurantName: string;
    image: string;
    price: number;
  }>;
}
