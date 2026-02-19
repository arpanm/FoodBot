/**
 * Provider interface types.
 * All providers (Swiggy, Zomato, Internal, Mock) implement the Provider interface.
 */

import type {
  GeoLocation,
  PriceRange,
  CurrencyCode,
  ProviderName,
  OperatingHours,
  OfferInfo,
  NutritionalInfo,
  Customization,
  ResponseMetadata,
  PaginationParams,
} from './common.types.js';

// ============================================
// Core Domain Models
// ============================================

export interface Restaurant {
  id: string;
  externalId: string;
  provider: ProviderName;
  name: string;
  imageUrl: string;
  address: string;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  distanceKm: number;
  priceRange: PriceRange;
  isOpen: boolean;
  isAvailable: boolean;
  offers: OfferInfo[];
  operatingHours: OperatingHours | null;
  location: GeoLocation;
}

export interface RestaurantDetails extends Restaurant {
  description: string;
  phone: string;
  email: string;
  website: string;
  menuCategories: MenuCategory[];
  photos: string[];
  reviews: Review[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description: string;
  sortOrder: number;
  dishes: Dish[];
}

export interface Dish {
  id: string;
  externalId: string;
  provider: ProviderName;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  currency: CurrencyCode;
  rating: number;
  reviewCount: number;
  isVegetarian: boolean;
  isAvailable: boolean;
  customizations: Customization[];
  nutritionalInfo: NutritionalInfo | null;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  text: string;
  date: string;
  helpful: number;
}

export interface Menu {
  restaurantId: string;
  restaurantName: string;
  categories: MenuCategory[];
  lastUpdated: string;
}

// ============================================
// Search and Query Types
// ============================================

export interface SearchQuery {
  query: string;
  location: GeoLocation;
  radiusKm: number;
  cuisines?: string[];
  priceRange?: PriceRange[];
  minRating?: number;
  isVegetarian?: boolean;
  sortBy?: SortOption;
  pagination: PaginationParams;
  userId?: string;
}

export type SortOption =
  | 'relevance'
  | 'rating'
  | 'delivery_time'
  | 'distance'
  | 'price_low_to_high'
  | 'price_high_to_low'
  | 'popularity';

export interface AvailabilityStatus {
  restaurantId: string;
  isOpen: boolean;
  isAcceptingOrders: boolean;
  estimatedDeliveryMinutes: number;
  nextOpenTime: string | null;
  message: string;
}

// ============================================
// Order Types
// ============================================

export interface OrderRequest {
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  notes: string;
  couponCode?: string;
}

export interface OrderItem {
  dishId: string;
  quantity: number;
  customizations: SelectedCustomization[];
  specialInstructions: string;
}

export interface SelectedCustomization {
  customizationId: string;
  optionIds: string[];
}

export interface DeliveryAddress {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  location: GeoLocation;
  label: string;
}

export type PaymentMethod = 'card' | 'upi' | 'cash' | 'wallet' | 'netbanking';

export interface OrderResponse {
  orderId: string;
  status: OrderStatus;
  estimatedDeliveryMinutes: number;
  totalAmount: number;
  currency: CurrencyCode;
  trackingUrl: string;
  message: string;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

// ============================================
// Search Result Types
// ============================================

export interface SearchResult {
  restaurants: Restaurant[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  metadata: ResponseMetadata;
}

// ============================================
// Provider Interface
// ============================================

export interface Provider {
  readonly name: ProviderName;

  /**
   * Check if this provider is currently enabled and configured.
   */
  isEnabled(): boolean;

  /**
   * Health check for this provider.
   */
  healthCheck(): Promise<ProviderHealth>;

  /**
   * Search restaurants by query, location, and filters.
   */
  searchRestaurants(query: SearchQuery): Promise<SearchResult>;

  /**
   * Get detailed restaurant information by ID.
   */
  getRestaurantDetails(id: string): Promise<RestaurantDetails | null>;

  /**
   * Get the full menu for a restaurant.
   */
  getMenu(restaurantId: string): Promise<Menu | null>;

  /**
   * Get details for a specific dish.
   */
  getDishDetails(dishId: string): Promise<Dish | null>;

  /**
   * Check availability and delivery status for a restaurant.
   */
  checkAvailability(restaurantId: string): Promise<AvailabilityStatus>;

  /**
   * Place an order through this provider.
   */
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
}

export interface ProviderHealth {
  provider: ProviderName;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: string;
  details: string;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}
