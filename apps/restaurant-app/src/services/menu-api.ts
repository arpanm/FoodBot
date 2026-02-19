/**
 * Menu / Dish API service
 * Handles dish CRUD, availability toggling, and category management
 */

import type {
  CreateDishRequest,
  UpdateDishRequest,
  ToggleAvailabilityRequest,
  DishListResponse,
} from '../types/api.types';
import type { Dish, DishCategory } from '../types/models';

import { apiClient } from './api-client';

export const menuApi = {
  async listDishes(
    restaurantId: string,
    params?: { category?: string; page?: number; limit?: number }
  ): Promise<DishListResponse> {
    const response = await apiClient.get<DishListResponse>('/dishes/search', {
      params: {
        restaurantId,
        ...params,
      },
    });
    return response.data;
  },

  async getDishById(dishId: string): Promise<Dish> {
    const response = await apiClient.get<{ dish: Dish }>(`/dishes/${dishId}`);
    return response.data.dish;
  },

  async createDish(data: CreateDishRequest & { restaurantId: string }): Promise<Dish> {
    const response = await apiClient.post<{ dish: Dish }>('/dishes', data);
    return response.data.dish;
  },

  async updateDish(dishId: string, data: UpdateDishRequest): Promise<Dish> {
    const response = await apiClient.put<{ dish: Dish }>(`/dishes/${dishId}`, data);
    return response.data.dish;
  },

  async deleteDish(dishId: string): Promise<void> {
    await apiClient.delete(`/dishes/${dishId}`);
  },

  async toggleAvailability(dishId: string, data: ToggleAvailabilityRequest): Promise<Dish> {
    const response = await apiClient.patch<{ dish: Dish }>(
      `/dishes/${dishId}/availability`,
      data
    );
    return response.data.dish;
  },

  async getCategories(restaurantId: string): Promise<DishCategory[]> {
    const response = await apiClient.get<{ categories: DishCategory[] }>(
      `/restaurants/${restaurantId}/categories`
    );
    return response.data.categories;
  },

  async createCategory(
    restaurantId: string,
    data: { name: string; description?: string }
  ): Promise<DishCategory> {
    const response = await apiClient.post<{ category: DishCategory }>(
      `/restaurants/${restaurantId}/categories`,
      data
    );
    return response.data.category;
  },

  async updateCategory(
    restaurantId: string,
    categoryId: string,
    data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }
  ): Promise<DishCategory> {
    const response = await apiClient.put<{ category: DishCategory }>(
      `/restaurants/${restaurantId}/categories/${categoryId}`,
      data
    );
    return response.data.category;
  },

  async deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
    await apiClient.delete(`/restaurants/${restaurantId}/categories/${categoryId}`);
  },

  async bulkUpdateAvailability(
    dishes: Array<{ dishId: string; isAvailable: boolean }>
  ): Promise<void> {
    await apiClient.post('/dishes/bulk-availability', { dishes });
  },

  async reorderDishes(
    restaurantId: string,
    dishOrders: Array<{ dishId: string; sortOrder: number }>
  ): Promise<void> {
    await apiClient.post(`/restaurants/${restaurantId}/dishes/reorder`, {
      orders: dishOrders,
    });
  },
};
