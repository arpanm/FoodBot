import type { Restaurant, Dish } from '../types/models';

import { apiClient } from './api/axios.config';

interface SearchResponse<T> {
  restaurants?: T[];
  dishes?: T[];
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTimeMs: number;
  provider: string;
}

interface SearchRestaurantsParams {
  q?: string;
  cuisine?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  minRating?: number;
  priceRange?: number;
  maxDeliveryTime?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

interface SearchDishesParams {
  q?: string;
  dietary?: string[];
  category?: string;
  maxPrice?: number;
  sortBy?: string;
  page?: number;
  pageSize?: number;
}

class SearchApiService {
  async searchRestaurants(
    params: SearchRestaurantsParams
  ): Promise<SearchResponse<Restaurant>> {
    return apiClient.get('/api/v1/search/restaurants', { params });
  }

  async searchNearbyRestaurants(
    lat: number,
    lon: number,
    radius: number = 5,
    page: number = 1,
    pageSize: number = 20
  ): Promise<SearchResponse<Restaurant>> {
    return apiClient.get('/api/v1/search/restaurants/nearby', {
      params: { lat, lon, radius, page, pageSize },
    });
  }

  async getRestaurantSuggestions(prefix: string): Promise<string[]> {
    return apiClient.get('/api/v1/search/restaurants/suggestions', {
      params: { prefix },
    });
  }

  async searchDishes(
    params: SearchDishesParams
  ): Promise<SearchResponse<Dish>> {
    return apiClient.get('/api/v1/search/dishes', { params });
  }

  async getSimilarDishes(
    dishId: string
  ): Promise<SearchResponse<Dish>> {
    return apiClient.get(`/api/v1/search/dishes/similar/${dishId}`);
  }
}

export type {
  SearchResponse,
  SearchRestaurantsParams,
  SearchDishesParams,
};

export const searchService = new SearchApiService();
