import { apiClient } from './api/axios.config';
import { Restaurant, Dish, Review } from '../types/models';
import { SearchRestaurantsResponse } from '../types/api.types';

class RestaurantService {
  async search(query: string, filters?: Record<string, unknown>): Promise<Restaurant[]> {
    const response = await apiClient.get<SearchRestaurantsResponse>('/restaurants', {
      params: { query, ...filters }
    });
    return response.data;
  }

  async getById(id: string): Promise<Restaurant> {
    return apiClient.get(`/restaurants/${id}`);
  }

  async getMenu(restaurantId: string): Promise<Dish[]> {
    return apiClient.get(`/restaurants/${restaurantId}/menu`);
  }

  async getReviews(restaurantId: string): Promise<Review[]> {
    return apiClient.get(`/restaurants/${restaurantId}/reviews`);
  }
}

export const restaurantService = new RestaurantService();
