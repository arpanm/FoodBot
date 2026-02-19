/**
 * Zomato MCP Client - Implementation of MCP protocol for Zomato food delivery
 * Supports open-source Zomato MCP server
 * Reference: https://github.com/Zomato/mcp-server-manifest
 */

import { MCPClient } from '../../mcp/MCPClient.js';
import type {
  Restaurant,
  Menu,
  OrderRequest,
  OrderResponse,
  RestaurantDetails,
  Review,
} from '../../types/provider.types.js';
import type { GeoLocation } from '../../types/common.types.js';

export interface ZomatoSearchParams {
  query?: string;
  location: GeoLocation;
  cuisines?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'rating' | 'cost' | 'delivery_time' | 'distance';
  filters?: {
    isVegetarian?: boolean;
    minRating?: number;
    maxCostForTwo?: number;
    hasOnlineDelivery?: boolean;
  };
}

export interface ZomatoCollection {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  restaurantCount: number;
  shareUrl: string;
}

export interface ZomatoCuisine {
  id: number;
  name: string;
  restaurantCount: number;
}

export interface ZomatoEstablishmentType {
  id: number;
  name: string;
}

/**
 * Zomato MCP Client
 * Implements MCP protocol for Zomato food delivery platform
 */
export class ZomatoMCPClient extends MCPClient {
  constructor(apiKey: string, baseUrl?: string) {
    super({
      baseUrl: baseUrl ?? 'https://mcp-server.zomato.com/mcp',
      apiKey,
      timeout: 8000,
      maxRetries: 3,
      provider: 'zomato',
    });
  }

  /**
   * Search restaurants by query and location (Zomato-specific)
   * Uses Zomato Search MCP tool
   */
  async searchRestaurantsZomato(params: ZomatoSearchParams): Promise<Restaurant[]> {
    const mcpParams: Record<string, unknown> = {
      latitude: params.location.lat,
      longitude: params.location.lng,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0,
    };

    if (params.query) {
      mcpParams.query = params.query;
    }

    if (params.cuisines && params.cuisines.length > 0) {
      mcpParams.cuisines = params.cuisines.join(',');
    }

    if (params.sortBy) {
      mcpParams.sort = params.sortBy;
    }

    if (params.filters) {
      if (params.filters.isVegetarian !== undefined) {
        mcpParams.category = params.filters.isVegetarian ? 'veg' : 'all';
      }
      if (params.filters.minRating !== undefined) {
        mcpParams.minRating = params.filters.minRating;
      }
      if (params.filters.maxCostForTwo !== undefined) {
        mcpParams.maxCost = params.filters.maxCostForTwo;
      }
      if (params.filters.hasOnlineDelivery !== undefined) {
        mcpParams.hasDelivery = params.filters.hasOnlineDelivery ? 1 : 0;
      }
    }

    return this.call<Restaurant[]>('tools/searchRestaurants', mcpParams);
  }

  /**
   * Get restaurant details with full information
   * Uses Zomato Restaurant Details MCP tool
   */
  async getRestaurantDetails(restaurantId: string): Promise<RestaurantDetails> {
    return this.call<RestaurantDetails>('tools/getRestaurantDetails', {
      restaurantId,
    });
  }

  /**
   * Get restaurant menu
   * Uses Zomato Menu MCP tool
   */
  async getMenu(restaurantId: string): Promise<Menu> {
    return super.getMenu(restaurantId);
  }

  /**
   * Get restaurant reviews
   * Uses Zomato Reviews MCP tool
   */
  async getRestaurantReviews(params: {
    restaurantId: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    reviews: Review[];
    totalCount: number;
  }> {
    return this.call('tools/getRestaurantReviews', {
      restaurantId: params.restaurantId,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });
  }

  /**
   * Get curated collections in a city
   * Uses Zomato Collections MCP tool
   */
  async getCollections(params: {
    cityId: number;
    location?: GeoLocation;
  }): Promise<ZomatoCollection[]> {
    const mcpParams: Record<string, unknown> = {
      cityId: params.cityId,
    };

    if (params.location) {
      mcpParams.latitude = params.location.lat;
      mcpParams.longitude = params.location.lng;
    }

    return this.call<ZomatoCollection[]>('tools/getCollections', mcpParams);
  }

  /**
   * Get restaurants in a collection
   * Uses Zomato Collection Details MCP tool
   */
  async getCollectionRestaurants(collectionId: number): Promise<Restaurant[]> {
    return this.call<Restaurant[]>('tools/getCollectionRestaurants', {
      collectionId,
    });
  }

  /**
   * Get available cuisines in a city
   * Uses Zomato Cuisines MCP tool
   */
  async getCuisines(cityId: number): Promise<ZomatoCuisine[]> {
    return this.call<ZomatoCuisine[]>('tools/getCuisines', { cityId });
  }

  /**
   * Get establishment types in a city
   * Uses Zomato Establishments MCP tool
   */
  async getEstablishments(params: {
    cityId: number;
    location?: GeoLocation;
  }): Promise<ZomatoEstablishmentType[]> {
    const mcpParams: Record<string, unknown> = {
      cityId: params.cityId,
    };

    if (params.location) {
      mcpParams.latitude = params.location.lat;
      mcpParams.longitude = params.location.lng;
    }

    return this.call<ZomatoEstablishmentType[]>(
      'tools/getEstablishments',
      mcpParams
    );
  }

  /**
   * Get city details by coordinates
   * Uses Zomato Geocode MCP tool
   */
  async getCityByLocation(location: GeoLocation): Promise<{
    cityId: number;
    cityName: string;
    countryId: number;
    countryName: string;
  }> {
    return this.call('tools/geocode', {
      latitude: location.lat,
      longitude: location.lng,
    });
  }

  /**
   * Search for cities
   * Uses Zomato City Search MCP tool
   */
  async searchCities(query: string): Promise<
    Array<{
      id: number;
      name: string;
      countryId: number;
      countryName: string;
    }>
  > {
    return this.call('tools/searchCities', { query });
  }

  /**
   * Get daily menu for a restaurant
   * Uses Zomato Daily Menu MCP tool
   */
  async getDailyMenu(restaurantId: string): Promise<{
    dailyMenus: Array<{
      id: string;
      name: string;
      startDate: string;
      endDate: string;
      dishes: Array<{
        dishId: string;
        name: string;
        price: string;
      }>;
    }>;
  }> {
    return this.call('tools/getDailyMenu', { restaurantId });
  }

  /**
   * Place order
   * Uses Zomato Order MCP tool
   */
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return super.placeOrder(order);
  }

  /**
   * Get order status
   * Uses Zomato Order Status MCP tool
   */
  async getOrderStatus(orderId: string): Promise<{
    orderId: string;
    status: string;
    estimatedDeliveryTime: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    totalAmount: number;
    deliveryAddress: string;
    restaurant: {
      name: string;
      address: string;
    };
  }> {
    return this.call('tools/getOrderStatus', { orderId });
  }

  /**
   * Get user's order history
   * Uses Zomato Order History MCP tool
   */
  async getOrderHistory(params: {
    userId: string;
    limit?: number;
    offset?: number;
  }): Promise<
    Array<{
      orderId: string;
      restaurantId: string;
      restaurantName: string;
      orderDate: string;
      totalAmount: number;
      status: string;
    }>
  > {
    return this.call('tools/getOrderHistory', {
      userId: params.userId,
      limit: params.limit ?? 10,
      offset: params.offset ?? 0,
    });
  }

  /**
   * Check delivery availability for a location
   * Uses Zomato Delivery Check MCP tool
   */
  async checkDeliveryAvailability(params: {
    restaurantId: string;
    deliveryLocation: GeoLocation;
  }): Promise<{
    available: boolean;
    estimatedDeliveryMinutes: number;
    deliveryFee: number;
    minimumOrderValue: number;
    message: string;
  }> {
    return this.call('tools/checkDeliveryAvailability', {
      restaurantId: params.restaurantId,
      deliveryLatitude: params.deliveryLocation.lat,
      deliveryLongitude: params.deliveryLocation.lng,
    });
  }

  /**
   * Get restaurant availability and timings
   * Uses Zomato Availability MCP tool
   */
  async checkAvailability(restaurantId: string): Promise<{
    available: boolean;
    estimatedDeliveryMinutes: number;
  }> {
    return super.checkAvailability(restaurantId);
  }

  /**
   * Search for dishes across restaurants
   * Uses Zomato Dish Search MCP tool
   */
  async searchDishes(params: {
    query: string;
    location: GeoLocation;
    limit?: number;
  }): Promise<
    Array<{
      dishId: string;
      dishName: string;
      restaurantId: string;
      restaurantName: string;
      price: number;
      rating: number;
      imageUrl: string;
    }>
  > {
    return this.call('tools/searchDishes', {
      query: params.query,
      latitude: params.location.lat,
      longitude: params.location.lng,
      limit: params.limit ?? 20,
    });
  }

  /**
   * Get trending restaurants in an area
   * Uses Zomato Trending MCP tool
   */
  async getTrendingRestaurants(location: GeoLocation): Promise<Restaurant[]> {
    return this.call<Restaurant[]>('tools/getTrending', {
      latitude: location.lat,
      longitude: location.lng,
    });
  }

  /**
   * Get nearby restaurants
   * Uses Zomato Nearby MCP tool
   */
  async getNearbyRestaurants(params: {
    location: GeoLocation;
    radiusKm?: number;
    limit?: number;
  }): Promise<Restaurant[]> {
    return this.call<Restaurant[]>('tools/getNearby', {
      latitude: params.location.lat,
      longitude: params.location.lng,
      radius: params.radiusKm ?? 5,
      limit: params.limit ?? 20,
    });
  }
}
