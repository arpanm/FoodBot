/**
 * Redux State Types
 * Types for Redux store state and actions
 */

import type {
  Message,
  Restaurant,
  Dish,
  Order,
  CartItem,
  User,
  Address,
  UserPreferences,
  RestaurantFilters,
} from './models';

import type { AccountLinkingState } from '../store/slices/accountLinkingSlice';
export type { AccountLinkingState } from '../store/slices/accountLinkingSlice';

// ==================== Root State ====================

export interface RootState {
  chat: ChatState;
  restaurant: RestaurantState;
  dish: DishState;
  order: OrderState;
  cart: CartState;
  user: UserState;
  accountLinking: AccountLinkingState;
}

// ==================== Chat State ====================

export interface ChatState {
  messages: Message[];
  loading: boolean;
  error: string | null;
  jobId: string | null;
  sessionId: string | null;
  isPolling: boolean;
}

// ==================== Restaurant State ====================

export interface RestaurantState {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  loading: boolean;
  error: string | null;
  filters: RestaurantFilters;
  searchQuery: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ==================== Dish State ====================

export interface DishState {
  dishes: Dish[];
  selectedDish: Dish | null;
  loading: boolean;
  error: string | null;
  categoryFilter: string | null;
  sortBy: 'rating' | 'price' | 'name' | null;
}

// ==================== Order State ====================

export interface OrderState {
  orders: Order[];
  activeOrder: Order | null;
  loading: boolean;
  error: string | null;
  tracking: {
    orderId: string | null;
    isPolling: boolean;
  };
}

// ==================== Cart State ====================

export interface CartState {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  total: number;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  loading: boolean;
  error: string | null;
}

// ==================== User State ====================

export interface UserState {
  currentUser: User | null;
  preferences: UserPreferences;
  addresses: Address[];
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

// ==================== Async Thunk Return Types ====================

export interface ThunkApiConfig {
  state: RootState;
  rejectValue: string;
}

// ==================== Action Payload Types ====================

export interface UpdateOrderStatusPayload {
  id: string;
  status: Order['status'];
}

export interface UpdateQuantityPayload {
  id: string;
  quantity: number;
}

export interface SetFiltersPayload {
  cuisine?: string[];
  priceRange?: number[];
  rating?: number;
  deliveryTime?: string;
  dietary?: string[];
  sortBy?: 'rating' | 'deliveryTime' | 'price' | 'distance';
  isOpen?: boolean;
}
