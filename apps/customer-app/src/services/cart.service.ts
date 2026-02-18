import { apiClient } from './api/axios.config';
import {
  GetCartResponse,
  AddCartItemRequest,
  AddCartItemResponse,
  UpdateCartItemRequest,
  UpdateCartItemResponse
} from '../types/api.types';

class CartService {
  async getCart(): Promise<GetCartResponse> {
    return apiClient.get('/cart');
  }

  async addItem(item: AddCartItemRequest): Promise<AddCartItemResponse> {
    return apiClient.post('/cart/items', item);
  }

  async updateItem(itemId: string, data: UpdateCartItemRequest): Promise<UpdateCartItemResponse> {
    return apiClient.put(`/cart/items/${itemId}`, data);
  }

  async removeItem(itemId: string): Promise<void> {
    return apiClient.delete(`/cart/items/${itemId}`);
  }

  async clearCart(): Promise<void> {
    return apiClient.delete('/cart');
  }
}

export const cartService = new CartService();
