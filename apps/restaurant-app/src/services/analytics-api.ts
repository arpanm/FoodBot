/**
 * Analytics API service
 * Handles revenue metrics, order trends, popular dishes, and customer feedback
 */

import type { AnalyticsRequest, AnalyticsResponse } from '../types/api.types';
import type {
  AnalyticsSummary,
  RevenueMetrics,
  DailyRevenue,
  PopularDish,
  CustomerFeedback,
  OrderMetrics,
} from '../types/models';

import { apiClient } from './api-client';

export const analyticsApi = {
  async getSummary(
    restaurantId: string,
    params?: AnalyticsRequest
  ): Promise<AnalyticsSummary> {
    const response = await apiClient.get<AnalyticsResponse>(
      `/restaurants/${restaurantId}/analytics`,
      { params }
    );
    return response.data.summary;
  },

  async getRevenueMetrics(
    restaurantId: string,
    period: AnalyticsRequest['period']
  ): Promise<RevenueMetrics> {
    const response = await apiClient.get<{ metrics: RevenueMetrics }>(
      `/restaurants/${restaurantId}/analytics/revenue`,
      { params: { period } }
    );
    return response.data.metrics;
  },

  async getOrderMetrics(
    restaurantId: string,
    period: AnalyticsRequest['period']
  ): Promise<OrderMetrics> {
    const response = await apiClient.get<{ metrics: OrderMetrics }>(
      `/restaurants/${restaurantId}/analytics/orders`,
      { params: { period } }
    );
    return response.data.metrics;
  },

  async getDailyRevenue(
    restaurantId: string,
    params?: { dateFrom?: string; dateTo?: string }
  ): Promise<DailyRevenue[]> {
    const response = await apiClient.get<{ data: DailyRevenue[] }>(
      `/restaurants/${restaurantId}/analytics/daily-revenue`,
      { params }
    );
    return response.data.data;
  },

  async getPopularDishes(
    restaurantId: string,
    limit = 10
  ): Promise<PopularDish[]> {
    const response = await apiClient.get<{ dishes: PopularDish[] }>(
      `/restaurants/${restaurantId}/analytics/popular-dishes`,
      { params: { limit } }
    );
    return response.data.dishes;
  },

  async getCustomerFeedback(
    restaurantId: string,
    params?: { page?: number; limit?: number }
  ): Promise<CustomerFeedback[]> {
    const response = await apiClient.get<{ feedback: CustomerFeedback[] }>(
      `/restaurants/${restaurantId}/analytics/feedback`,
      { params }
    );
    return response.data.feedback;
  },
};
