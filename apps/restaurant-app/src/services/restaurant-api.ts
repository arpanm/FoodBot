/**
 * Restaurant API service
 * Handles restaurant CRUD operations, profile, hours, and delivery settings
 */

import type {
  CreateRestaurantRequest,
  UpdateRestaurantRequest,
  UpdateOperatingHoursRequest,
  UpdateDeliverySettingsRequest,
  RestaurantDetailResponse,
} from '../types/api.types';
import type { Restaurant } from '../types/models';

import { apiClient } from './api-client';

export const restaurantApi = {
  async getById(restaurantId: string): Promise<Restaurant> {
    const response = await apiClient.get<RestaurantDetailResponse>(
      `/restaurants/${restaurantId}`
    );
    return response.data.restaurant;
  },

  async create(data: CreateRestaurantRequest): Promise<Restaurant> {
    const response = await apiClient.post<{ restaurant: Restaurant }>('/restaurants', data);
    return response.data.restaurant;
  },

  async update(restaurantId: string, data: UpdateRestaurantRequest): Promise<Restaurant> {
    const response = await apiClient.put<{ restaurant: Restaurant }>(
      `/restaurants/${restaurantId}`,
      data
    );
    return response.data.restaurant;
  },

  async updateOperatingHours(
    restaurantId: string,
    data: UpdateOperatingHoursRequest
  ): Promise<Restaurant> {
    const response = await apiClient.put<{ restaurant: Restaurant }>(
      `/restaurants/${restaurantId}`,
      { hours: data.hours }
    );
    return response.data.restaurant;
  },

  async updateDeliverySettings(
    restaurantId: string,
    data: UpdateDeliverySettingsRequest
  ): Promise<Restaurant> {
    const response = await apiClient.put<{ restaurant: Restaurant }>(
      `/restaurants/${restaurantId}`,
      { deliverySettings: data.settings }
    );
    return response.data.restaurant;
  },

  async toggleOpen(restaurantId: string, isOpen: boolean): Promise<Restaurant> {
    const response = await apiClient.put<{ restaurant: Restaurant }>(
      `/restaurants/${restaurantId}`,
      { isOpen }
    );
    return response.data.restaurant;
  },

  async uploadImage(restaurantId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await apiClient.post<{ url: string }>(
      `/restaurants/${restaurantId}/images`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async getMenu(restaurantId: string): Promise<{ dishes: Restaurant['cuisine'] }> {
    const response = await apiClient.get(`/restaurants/${restaurantId}/menu`);
    return response.data;
  },
};
