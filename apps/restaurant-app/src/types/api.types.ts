/**
 * API Request and Response Types
 * Types for API communication with the gateway-api backend
 */

import type {
  Restaurant,
  Dish,
  Order,
  OrderStatus,
  RestaurantOwner,
  DishCategory,
  AnalyticsSummary,
  OnboardingProgress,
  PaginatedResponse,
  OperatingHours,
  DeliverySettings,
  ContactInfo,
  DietaryInfo,
  Customization,
  NutritionalInfo,
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

// ==================== Auth API Types ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: RestaurantOwner;
  expiresIn: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'restaurant_owner';
}

export interface RegisterResponse {
  user: RestaurantOwner;
  message: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ==================== Restaurant API Types ====================

export interface CreateRestaurantRequest {
  name: string;
  description: string;
  cuisine: string[];
  logo?: string;
  images?: string[];
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  contactInfo: ContactInfo;
  priceRange: number;
  minimumOrder: number;
}

export interface UpdateRestaurantRequest {
  name?: string;
  description?: string;
  cuisine?: string[];
  logo?: string;
  images?: string[];
  contactInfo?: ContactInfo;
  priceRange?: number;
  minimumOrder?: number;
  isOpen?: boolean;
}

export interface UpdateOperatingHoursRequest {
  hours: OperatingHours;
}

export interface UpdateDeliverySettingsRequest {
  settings: DeliverySettings;
}

export interface RestaurantDetailResponse {
  restaurant: Restaurant;
}

// ==================== Dish API Types ====================

export interface CreateDishRequest {
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  images?: string[];
  category: string;
  tags?: string[];
  dietary?: Partial<DietaryInfo>;
  ingredients?: string[];
  allergens?: string[];
  customizations?: Customization[];
  nutritionalInfo?: NutritionalInfo;
  preparationTime: number;
  spiceLevel?: number;
  isAvailable?: boolean;
}

export interface UpdateDishRequest extends Partial<CreateDishRequest> {
  sortOrder?: number;
}

export interface ToggleAvailabilityRequest {
  isAvailable: boolean;
}

export interface DishListResponse {
  dishes: Dish[];
  categories: DishCategory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ==================== Order API Types ====================

export interface OrderListRequest {
  status?: OrderStatus;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'placedAt' | 'total' | 'status';
  sortOrder?: 'asc' | 'desc';
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

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
  estimatedTime?: string;
  notes?: string;
}

export interface OrderDetailResponse {
  order: Order;
}

// ==================== Analytics API Types ====================

export interface AnalyticsRequest {
  period: 'today' | 'week' | 'month' | 'year' | 'custom';
  dateFrom?: string;
  dateTo?: string;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
}

// ==================== Onboarding API Types ====================

export interface StartOnboardingRequest {
  restaurantName: string;
  ownerEmail: string;
  restaurantId: string;
}

export interface OnboardingStatusResponse {
  progress: OnboardingProgress;
}

export interface UploadDocumentRequest {
  type: 'business_license' | 'food_safety' | 'tax_id' | 'identity';
  file: File;
}

export interface UploadDocumentResponse {
  documentId: string;
  status: 'uploaded' | 'pending_review';
}

// ==================== WebSocket Event Types ====================

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

export type WebSocketEventType =
  | 'order.new'
  | 'order.status.changed'
  | 'order.cancelled'
  | 'dish.availability.changed'
  | 'restaurant.updated'
  | 'notification';
