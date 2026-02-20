import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import {
  ApiResponse,
  ApiError,
  Result,
  Restaurant,
  Order,
  ChatMessage,
  ChatSession,
  PaginatedResponse,
} from '../../types';
import {getTokens, refreshAccessToken} from '../auth/OAuthService';

/**
 * Gateway API Client
 * Communicates with the backend Gateway API (apps/gateway-api)
 */
class GatewayClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    // TODO: Move to environment config
    this.baseURL =
      process.env.GATEWAY_API_URL || 'http://localhost:3000/api/v1';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors for auth and error handling
   */
  private setupInterceptors(): void {
    // Request interceptor - add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const tokens = await getTokens();
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor - handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newTokens = await refreshAccessToken();
            if (newTokens && originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Token refresh failed, user needs to re-authenticate
            // TODO: Dispatch logout action
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      },
    );
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(
    config: AxiosRequestConfig,
  ): Promise<Result<T, ApiError>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> =
        await this.client.request(config);
      return {success: true, data: response.data.data};
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const apiError: ApiError = {
          code: error.response?.data?.code || 'NETWORK_ERROR',
          message:
            error.response?.data?.message || 'An unexpected error occurred',
          details: error.response?.data?.details,
        };
        return {success: false, error: apiError};
      }

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'An unknown error occurred',
        },
      };
    }
  }

  // ============================================================================
  // Chat Endpoints
  // ============================================================================

  async createChatSession(): Promise<Result<ChatSession, ApiError>> {
    return this.request<ChatSession>({
      method: 'POST',
      url: '/chat/sessions',
    });
  }

  async getChatSession(sessionId: string): Promise<Result<ChatSession, ApiError>> {
    return this.request<ChatSession>({
      method: 'GET',
      url: `/chat/sessions/${sessionId}`,
    });
  }

  async sendChatMessage(
    sessionId: string,
    content: string,
  ): Promise<Result<ChatMessage, ApiError>> {
    return this.request<ChatMessage>({
      method: 'POST',
      url: `/chat/sessions/${sessionId}/messages`,
      data: {content},
    });
  }

  async getChatHistory(
    sessionId: string,
  ): Promise<Result<ChatMessage[], ApiError>> {
    return this.request<ChatMessage[]>({
      method: 'GET',
      url: `/chat/sessions/${sessionId}/messages`,
    });
  }

  // ============================================================================
  // Restaurant Endpoints
  // ============================================================================

  async searchRestaurants(params: {
    query?: string;
    cuisine?: string;
    location?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Result<PaginatedResponse<Restaurant>, ApiError>> {
    return this.request<PaginatedResponse<Restaurant>>({
      method: 'GET',
      url: '/restaurants/search',
      params,
    });
  }

  async getRestaurant(
    restaurantId: string,
  ): Promise<Result<Restaurant, ApiError>> {
    return this.request<Restaurant>({
      method: 'GET',
      url: `/restaurants/${restaurantId}`,
    });
  }

  async getRestaurantMenu(
    restaurantId: string,
  ): Promise<Result<any[], ApiError>> {
    return this.request<any[]>({
      method: 'GET',
      url: `/restaurants/${restaurantId}/menu`,
    });
  }

  // ============================================================================
  // Order Endpoints
  // ============================================================================

  async createOrder(orderData: Partial<Order>): Promise<Result<Order, ApiError>> {
    return this.request<Order>({
      method: 'POST',
      url: '/orders',
      data: orderData,
    });
  }

  async getOrder(orderId: string): Promise<Result<Order, ApiError>> {
    return this.request<Order>({
      method: 'GET',
      url: `/orders/${orderId}`,
    });
  }

  async getUserOrders(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Result<PaginatedResponse<Order>, ApiError>> {
    return this.request<PaginatedResponse<Order>>({
      method: 'GET',
      url: '/orders',
      params,
    });
  }

  async cancelOrder(orderId: string): Promise<Result<Order, ApiError>> {
    return this.request<Order>({
      method: 'POST',
      url: `/orders/${orderId}/cancel`,
    });
  }

  // ============================================================================
  // User Endpoints
  // ============================================================================

  async getCurrentUser(): Promise<Result<any, ApiError>> {
    return this.request<any>({
      method: 'GET',
      url: '/users/me',
    });
  }

  async updateUserProfile(
    profileData: Partial<any>,
  ): Promise<Result<any, ApiError>> {
    return this.request<any>({
      method: 'PATCH',
      url: '/users/me',
      data: profileData,
    });
  }
}

export const gatewayClient = new GatewayClient();
