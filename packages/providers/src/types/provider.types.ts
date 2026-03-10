export type ProviderName = 'swiggy' | 'zomato' | 'ondc';

export type ProviderStatus = 'active' | 'degraded' | 'down';

export interface ProviderConfig {
  name: ProviderName;
  baseUrl: string;
  apiKey: string;
  rateLimit: number;
  enabled: boolean;
  priority: number;
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface ProviderRestaurant {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;
  deliveryTime: number;
  minimumOrder: number;
  isOpen: boolean;
  location: Location;
}

export interface ProviderMenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isVeg: boolean;
  isAvailable: boolean;
}

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
}

export interface DeliveryDetails {
  address: string;
  location: Location;
  contactNumber: string;
  instructions?: string;
}

export interface ProviderOrder {
  id: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  estimatedDelivery: number;
  trackingUrl: string;
}

export interface CancelResult {
  success: boolean;
  orderId: string;
  refundAmount: number;
  reason?: string;
}

export interface AggregatedResults {
  restaurants: AggregatedRestaurant[];
  totalResults: number;
  providers: ProviderName[];
}

export interface AggregatedRestaurant extends ProviderRestaurant {
  providerName: ProviderName;
}

export interface InternalOrder extends ProviderOrder {
  providerName: ProviderName;
  createdAt: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitorWindowMs: number;
}

export interface RateLimiterConfig {
  maxTokens: number;
  refillRate: number;
  refillIntervalMs: number;
}
