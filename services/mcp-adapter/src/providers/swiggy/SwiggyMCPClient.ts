/**
 * Swiggy MCP Client - Implementation of MCP protocol for Swiggy food delivery
 * Supports Swiggy MCP server at https://mcp.swiggy.com
 */

import { MCPClient } from '../../mcp/MCPClient.js';
import type {
  Restaurant,
  Menu,
  OrderRequest,
  OrderResponse,
  RestaurantDetails,
} from '../../types/provider.types.js';
import type { GeoLocation } from '../../types/common.types.js';

export interface SwiggySearchParams {
  query: string;
  location: GeoLocation;
  limit?: number;
  offset?: number;
  filters?: {
    cuisines?: string[];
    isVegetarian?: boolean;
    minRating?: number;
    maxDeliveryTime?: number;
  };
}

export interface SwiggyProduct {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
}

export interface SwiggyDineoutRestaurant {
  id: string;
  name: string;
  address: string;
  cuisines: string[];
  rating: number;
  priceRange: number;
  imageUrl: string;
  bookingAvailable: boolean;
}

/**
 * Swiggy MCP Client
 * Implements MCP protocol for Swiggy's multi-service platform
 */
export class SwiggyMCPClient extends MCPClient {
  constructor(apiKey: string, baseUrl?: string) {
    super({
      baseUrl: baseUrl ?? 'https://mcp.swiggy.com',
      apiKey,
      timeout: 8000,
      maxRetries: 3,
      provider: 'swiggy',
    });
  }

  /**
   * Search for food delivery restaurants
   * Uses Swiggy Food MCP tool
   */
  async searchFood(params: SwiggySearchParams): Promise<Restaurant[]> {
    const mcpParams: Record<string, unknown> = {
      query: params.query,
      latitude: params.location.lat,
      longitude: params.location.lng,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };

    if (params.filters) {
      if (params.filters.cuisines) {
        mcpParams.cuisines = params.filters.cuisines;
      }
      if (params.filters.isVegetarian !== undefined) {
        mcpParams.isVegetarian = params.filters.isVegetarian;
      }
      if (params.filters.minRating !== undefined) {
        mcpParams.minRating = params.filters.minRating;
      }
      if (params.filters.maxDeliveryTime !== undefined) {
        mcpParams.maxDeliveryTime = params.filters.maxDeliveryTime;
      }
    }

    return this.call<Restaurant[]>('tools/searchFood', mcpParams);
  }

  /**
   * Search Swiggy Instamart for groceries and essentials
   * Uses Swiggy Instamart MCP tool
   */
  async searchInstamart(params: {
    query: string;
    location: GeoLocation;
    limit?: number;
    category?: string;
  }): Promise<SwiggyProduct[]> {
    return this.call<SwiggyProduct[]>('tools/searchInstamart', {
      query: params.query,
      latitude: params.location.lat,
      longitude: params.location.lng,
      limit: params.limit ?? 30,
      category: params.category,
    });
  }

  /**
   * Search Swiggy Dineout for restaurant reservations
   * Uses Swiggy Dineout MCP tool
   */
  async dineoutSearch(params: {
    query: string;
    location: GeoLocation;
    date?: string;
    partySize?: number;
    cuisines?: string[];
  }): Promise<SwiggyDineoutRestaurant[]> {
    return this.call<SwiggyDineoutRestaurant[]>('tools/dineoutSearch', {
      query: params.query,
      latitude: params.location.lat,
      longitude: params.location.lng,
      date: params.date,
      partySize: params.partySize,
      cuisines: params.cuisines,
    });
  }

  /**
   * Get restaurant details including full menu
   * Uses Swiggy Food MCP tool
   */
  async getRestaurantWithMenu(restaurantId: string): Promise<RestaurantDetails> {
    return this.call<RestaurantDetails>('tools/getRestaurantDetails', {
      restaurantId,
      includeMenu: true,
    });
  }

  /**
   * Get offers and promotions for a restaurant
   * Uses Swiggy Food MCP tool
   */
  async getRestaurantOffers(restaurantId: string): Promise<{
    offers: Array<{
      id: string;
      title: string;
      description: string;
      code: string;
      discount: number;
    }>;
  }> {
    return this.call('tools/getRestaurantOffers', { restaurantId });
  }

  /**
   * Calculate delivery fee and estimated time
   * Uses Swiggy Food MCP tool
   */
  async calculateDelivery(params: {
    restaurantId: string;
    deliveryLocation: GeoLocation;
  }): Promise<{
    fee: number;
    estimatedMinutes: number;
    surgeMultiplier: number;
  }> {
    return this.call('tools/calculateDelivery', {
      restaurantId: params.restaurantId,
      deliveryLatitude: params.deliveryLocation.lat,
      deliveryLongitude: params.deliveryLocation.lng,
    });
  }

  /**
   * Place food order
   * Uses Swiggy Food MCP tool
   */
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return super.placeOrder(order);
  }

  /**
   * Track order status
   * Uses Swiggy Food MCP tool
   */
  async trackOrder(orderId: string): Promise<{
    orderId: string;
    status: string;
    estimatedDeliveryTime: string;
    deliveryAgent: {
      name: string;
      phone: string;
      location: GeoLocation;
    } | null;
  }> {
    return this.call('tools/trackOrder', { orderId });
  }

  /**
   * Get Instamart product details
   * Uses Swiggy Instamart MCP tool
   */
  async getInstamartProduct(productId: string): Promise<SwiggyProduct & {
    description: string;
    brand: string;
    weight: string;
    nutritionalInfo: Record<string, number>;
  }> {
    return this.call('tools/getInstamartProduct', { productId });
  }

  /**
   * Place Instamart order
   * Uses Swiggy Instamart MCP tool
   */
  async placeInstamartOrder(params: {
    userId: string;
    items: Array<{ productId: string; quantity: number }>;
    deliveryAddress: {
      addressLine1: string;
      addressLine2: string;
      city: string;
      pincode: string;
      location: GeoLocation;
    };
  }): Promise<{
    orderId: string;
    estimatedDeliveryMinutes: number;
    totalAmount: number;
  }> {
    return this.call('tools/placeInstamartOrder', params);
  }

  /**
   * Make Dineout reservation
   * Uses Swiggy Dineout MCP tool
   */
  async makeDineoutReservation(params: {
    restaurantId: string;
    date: string;
    time: string;
    partySize: number;
    specialRequests?: string;
  }): Promise<{
    reservationId: string;
    confirmationCode: string;
    restaurantName: string;
    date: string;
    time: string;
  }> {
    return this.call('tools/makeDineoutReservation', params);
  }

  /**
   * Get user's order history
   * Uses Swiggy Food MCP tool
   */
  async getOrderHistory(params: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    orderId: string;
    restaurantName: string;
    items: string[];
    totalAmount: number;
    orderDate: string;
    status: string;
  }>> {
    return this.call('tools/getOrderHistory', {
      userId: params.userId,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });
  }

  /**
   * Search across all Swiggy services
   * Uses unified search MCP tool
   */
  async unifiedSearch(params: {
    query: string;
    location: GeoLocation;
  }): Promise<{
    food: Restaurant[];
    instamart: SwiggyProduct[];
    dineout: SwiggyDineoutRestaurant[];
  }> {
    return this.call('tools/unifiedSearch', {
      query: params.query,
      latitude: params.location.lat,
      longitude: params.location.lng,
    });
  }
}
