/**
 * Order Routing Service
 *
 * Determines the appropriate provider for each restaurant in an order,
 * splits multi-restaurant orders into sub-orders per provider,
 * and implements fallback logic when providers are unhealthy.
 *
 * Type definitions: see order-routing.types.ts
 * Health checking logic: see provider-health.service.ts
 *
 * Implements FR-CA-ORDER-001: MCP-based order routing.
 */

import { Injectable, Logger } from '@nestjs/common';

import { ProviderHealthService } from './provider-health.service';

// Re-export all types so existing consumers still work
export type {
  ProviderType,
  ProviderHealthStatus,
  ProviderHealth,
  OrderItem,
  OrderInput,
  SubOrder,
  RoutingResult,
  RestaurantProviderMapping,
} from './order-routing.types';

import type {
  ProviderType,
  ProviderHealthStatus,
  OrderItem,
  OrderInput,
  SubOrder,
  RoutingResult,
  RestaurantProviderMapping,
} from './order-routing.types';

// ============================================================================
// Constants
// ============================================================================

const FALLBACK_ORDER: ProviderType[] = ['internal', 'swiggy', 'zomato', 'ondc'];

// ============================================================================
// Service
// ============================================================================

@Injectable()
export class OrderRoutingService {
  private readonly logger = new Logger(OrderRoutingService.name);

  private readonly restaurantProviderMap: Map<string, RestaurantProviderMapping> =
    new Map();

  constructor(
    private readonly providerHealthService: ProviderHealthService
  ) {}

  /**
   * Route an order to the appropriate provider(s).
   */
  async routeOrder(order: OrderInput): Promise<RoutingResult> {
    this.logger.log(
      `Routing order for user ${order.userId}, restaurant ${order.restaurantId}`
    );

    const mapping = await this.getProviderMapping(order.restaurantId);
    const primaryProvider = mapping.provider;

    const isHealthy = await this.providerHealthService.isProviderHealthy(primaryProvider);
    let selectedProvider = primaryProvider;
    let fallbackUsed = false;

    if (!isHealthy) {
      this.logger.warn(
        `Primary provider ${primaryProvider} unhealthy for restaurant ${order.restaurantId}`
      );

      const fallbackProvider = await this.providerHealthService.findHealthyFallback(
        mapping.fallbackProviders
      );

      if (fallbackProvider) {
        selectedProvider = fallbackProvider;
        fallbackUsed = true;
        this.logger.log(
          `Using fallback provider ${fallbackProvider} for restaurant ${order.restaurantId}`
        );
      } else {
        this.logger.error(
          `No healthy provider available for restaurant ${order.restaurantId}`
        );
        return {
          success: false, subOrders: [], primaryProvider, fallbackUsed: false,
          routingMetadata: {
            routedAt: new Date(), totalSubOrders: 0,
            providerBreakdown: {} as Record<ProviderType, number>,
          },
        };
      }
    }

    const subOrders = this.buildSubOrders(order, selectedProvider);
    const providerBreakdown: Record<string, number> = {};
    for (const sub of subOrders) {
      providerBreakdown[sub.provider] = (providerBreakdown[sub.provider] ?? 0) + 1;
    }

    return {
      success: true, subOrders, primaryProvider: selectedProvider, fallbackUsed,
      routingMetadata: {
        routedAt: new Date(), totalSubOrders: subOrders.length,
        providerBreakdown: providerBreakdown as Record<ProviderType, number>,
      },
    };
  }

  /**
   * Route a multi-restaurant order by splitting items per restaurant.
   */
  async routeMultiRestaurantOrder(
    userId: string,
    restaurantItems: Map<string, OrderItem[]>,
    deliveryAddress: Record<string, unknown>,
    paymentMethod: string
  ): Promise<RoutingResult> {
    this.logger.log(
      `Routing multi-restaurant order for user ${userId} across ${restaurantItems.size} restaurants`
    );

    const allSubOrders: SubOrder[] = [];
    const providerBreakdown: Record<string, number> = {};
    let fallbackUsed = false;

    for (const [restaurantId, items] of restaurantItems) {
      const mapping = await this.getProviderMapping(restaurantId);
      let selectedProvider = mapping.provider;

      const isHealthy = await this.providerHealthService.isProviderHealthy(selectedProvider);

      if (!isHealthy) {
        const fallback = await this.providerHealthService.findHealthyFallback(
          mapping.fallbackProviders
        );
        if (fallback) {
          selectedProvider = fallback;
          fallbackUsed = true;
        } else {
          this.logger.error(
            `No healthy provider for restaurant ${restaurantId}, skipping`
          );
          continue;
        }
      }

      const subtotal = items.reduce(
        (sum, item) => sum + item.price * item.quantity, 0
      );

      allSubOrders.push({
        subOrderId: `sub_${restaurantId}_${Date.now()}`,
        restaurantId, provider: selectedProvider, items, subtotal,
      });

      providerBreakdown[selectedProvider] =
        (providerBreakdown[selectedProvider] ?? 0) + 1;
    }

    return {
      success: allSubOrders.length > 0, subOrders: allSubOrders,
      primaryProvider: allSubOrders[0]?.provider ?? 'internal', fallbackUsed,
      routingMetadata: {
        routedAt: new Date(), totalSubOrders: allSubOrders.length,
        providerBreakdown: providerBreakdown as Record<ProviderType, number>,
      },
    };
  }

  /**
   * Get provider mapping for a restaurant.
   */
  async getProviderMapping(restaurantId: string): Promise<RestaurantProviderMapping> {
    const cached = this.restaurantProviderMap.get(restaurantId);
    if (cached) {
      return cached;
    }

    const provider = this.inferProvider(restaurantId);
    const fallbacks = FALLBACK_ORDER.filter((p) => p !== provider);

    const mapping: RestaurantProviderMapping = {
      restaurantId, provider, fallbackProviders: fallbacks,
    };

    this.restaurantProviderMap.set(restaurantId, mapping);
    return mapping;
  }

  /** Update the health status of a provider (delegates to ProviderHealthService). */
  updateProviderHealth(
    provider: ProviderType, status: ProviderHealthStatus, latencyMs: number
  ): void {
    this.providerHealthService.updateProviderHealth(provider, status, latencyMs);
  }

  /** Register a restaurant-to-provider mapping. */
  registerRestaurantProvider(
    restaurantId: string, provider: ProviderType, fallbackProviders?: ProviderType[]
  ): void {
    this.restaurantProviderMap.set(restaurantId, {
      restaurantId, provider,
      fallbackProviders: fallbackProviders ?? FALLBACK_ORDER.filter((p) => p !== provider),
    });
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private inferProvider(restaurantId: string): ProviderType {
    if (restaurantId.startsWith('swiggy_')) return 'swiggy';
    if (restaurantId.startsWith('zomato_')) return 'zomato';
    if (restaurantId.startsWith('ondc_')) return 'ondc';
    return 'internal';
  }

  private buildSubOrders(order: OrderInput, provider: ProviderType): SubOrder[] {
    const subtotal = order.items.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );
    return [{
      subOrderId: `sub_${order.restaurantId}_${Date.now()}`,
      restaurantId: order.restaurantId, provider, items: order.items, subtotal,
    }];
  }
}
