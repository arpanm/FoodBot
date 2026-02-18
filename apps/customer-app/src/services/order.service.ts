import type {
  CreateOrderRequest,
  CreateOrderResponse,
  TrackOrderResponse,
  CancelOrderResponse
} from '../types/api.types';
import type { Order } from '../types/models';

import { apiClient } from './api/axios.config';

class OrderService {
  async getAll(): Promise<Order[]> {
    return apiClient.get('/orders');
  }

  async getById(id: string): Promise<Order> {
    return apiClient.get(`/orders/${id}`);
  }

  async place(orderData: CreateOrderRequest): Promise<CreateOrderResponse> {
    return apiClient.post('/orders', orderData);
  }

  async cancel(orderId: string): Promise<CancelOrderResponse> {
    return apiClient.post(`/orders/${orderId}/cancel`);
  }

  async track(orderId: string): Promise<TrackOrderResponse> {
    return apiClient.get(`/orders/${orderId}/tracking`);
  }
}

export const orderService = new OrderService();
