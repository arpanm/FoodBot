// ============================================================================
// Core Domain Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: string;
  address: string;
  imageUrl?: string;
  distance?: number;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  category: string;
}

export interface Order {
  id: string;
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  deliveryAddress: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  userId: string;
  messages: ChatMessage[];
  context?: ChatContext;
  createdAt: string;
  updatedAt: string;
}

export interface ChatContext {
  currentRestaurant?: Restaurant;
  currentOrder?: Partial<Order>;
  userPreferences?: UserPreferences;
}

export interface UserPreferences {
  dietaryRestrictions?: string[];
  favoriteCuisines?: string[];
  defaultDeliveryAddress?: string;
}

// ============================================================================
// Authentication Types
// ============================================================================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface OAuthConfig {
  provider: 'google' | 'facebook' | 'apple';
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  tokens: AuthTokens | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// API Types
// ============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Navigation Types
// ============================================================================

export type RootStackParamList = {
  Login: undefined;
  OAuthCallback: {code: string; state: string};
  Main: undefined;
  Chat: {sessionId?: string};
  RestaurantSearch: {query?: string};
  RestaurantDetail: {restaurantId: string};
  OrderSummary: {orderId: string};
  OrderTracking: {orderId: string};
};

// ============================================================================
// Store Types
// ============================================================================

export interface RootState {
  auth: AuthState;
  chat: ChatState;
  restaurants: RestaurantState;
  orders: OrderState;
}

export interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  loading: boolean;
  error: string | null;
}

export interface RestaurantState {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
}

export interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Result<T, E = Error> =
  | {success: true; data: T}
  | {success: false; error: E};

export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
