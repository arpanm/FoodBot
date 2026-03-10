/**
 * Order Routing Types
 *
 * Type definitions for the order routing service including:
 * - Provider type and health status enums
 * - Provider health model
 * - Order input/item interfaces
 * - Sub-order and routing result types
 * - Restaurant-to-provider mapping
 *
 * Extracted from order-routing.service.ts for file-length compliance.
 *
 * Implements FR-CA-ORDER-001: MCP-based order routing.
 */

// ============================================================================
// Provider Types
// ============================================================================

export type ProviderType = 'internal' | 'swiggy' | 'zomato' | 'ondc';

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface ProviderHealth {
  provider: ProviderType;
  status: ProviderHealthStatus;
  latencyMs: number;
  lastChecked: Date;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}

// ============================================================================
// Order Types
// ============================================================================

export interface OrderItem {
  dishId: string;
  dishName?: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface OrderInput {
  userId: string;
  restaurantId: string;
  items: OrderItem[];
  deliveryAddress: Record<string, unknown>;
  paymentMethod: string;
  specialInstructions?: string;
}

export interface SubOrder {
  subOrderId: string;
  restaurantId: string;
  provider: ProviderType;
  items: OrderItem[];
  subtotal: number;
}

// ============================================================================
// Routing Types
// ============================================================================

export interface RoutingResult {
  success: boolean;
  subOrders: SubOrder[];
  primaryProvider: ProviderType;
  fallbackUsed: boolean;
  routingMetadata: {
    routedAt: Date;
    totalSubOrders: number;
    providerBreakdown: Record<ProviderType, number>;
  };
}

export interface RestaurantProviderMapping {
  restaurantId: string;
  provider: ProviderType;
  fallbackProviders: ProviderType[];
}
