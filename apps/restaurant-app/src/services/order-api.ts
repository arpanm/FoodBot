/**
 * Order API service
 * Handles order listing, status updates, and order management for restaurant owners
 */

import type {
  OrderListRequest,
  OrderListResponse,
  UpdateOrderStatusRequest,
  OrderDetailResponse,
} from '../types/api.types';
import type { Order } from '../types/models';

import { apiClient } from './api-client';

export const orderApi = {
  async listOrders(
    restaurantId: string,
    params?: OrderListRequest
  ): Promise<OrderListResponse> {
    const response = await apiClient.get<OrderListResponse>('/orders', {
      params: {
        restaurantId,
        ...params,
      },
    });
    return response.data;
  },

  async getOrderById(orderId: string): Promise<Order> {
    const response = await apiClient.get<OrderDetailResponse>(`/orders/${orderId}`);
    return response.data.order;
  },

  async updateOrderStatus(
    orderId: string,
    data: UpdateOrderStatusRequest
  ): Promise<Order> {
    const response = await apiClient.put<{ order: Order }>(
      `/orders/${orderId}/status`,
      data
    );
    return response.data.order;
  },

  async getActiveOrders(restaurantId: string): Promise<Order[]> {
    const response = await apiClient.get<OrderListResponse>('/orders', {
      params: {
        restaurantId,
        status: 'PENDING,CONFIRMED,PREPARING,READY',
        sortBy: 'placedAt',
        sortOrder: 'desc',
      },
    });
    return response.data.orders;
  },

  async getTodayOrders(restaurantId: string): Promise<Order[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const response = await apiClient.get<OrderListResponse>('/orders', {
      params: {
        restaurantId,
        dateFrom: today.toISOString(),
        sortBy: 'placedAt',
        sortOrder: 'desc',
      },
    });
    return response.data.orders;
  },

  async acceptOrder(orderId: string, estimatedTime?: string): Promise<Order> {
    return orderApi.updateOrderStatus(orderId, {
      status: 'CONFIRMED',
      estimatedTime,
    });
  },

  async markPreparing(orderId: string): Promise<Order> {
    return orderApi.updateOrderStatus(orderId, {
      status: 'PREPARING',
    });
  },

  async markReady(orderId: string): Promise<Order> {
    return orderApi.updateOrderStatus(orderId, {
      status: 'READY',
    });
  },

  async cancelOrder(orderId: string, reason: string): Promise<Order> {
    return orderApi.updateOrderStatus(orderId, {
      status: 'CANCELLED',
      notes: reason,
    });
  },
};
