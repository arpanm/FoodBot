import { apiClient } from './api/axios.config';
import { Dish } from '../types/models';

class DishService {
  async getByRestaurant(restaurantId: string): Promise<Dish[]> {
    return apiClient.get(`/restaurants/${restaurantId}/dishes`);
  }

  async getById(id: string): Promise<Dish> {
    return apiClient.get(`/dishes/${id}`);
  }

  async search(query: string): Promise<Dish[]> {
    return apiClient.get('/dishes', { params: { query } });
  }
}

export const dishService = new DishService();
