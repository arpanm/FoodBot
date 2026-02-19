/**
 * Analytics Page - Revenue charts, order trends, popular dishes, customer feedback
 * Uses Recharts for data visualization
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { MetricCard, LoadingSpinner, ErrorAlert } from '../../components/common';
import { useRestaurant } from '../../contexts/restaurant-context';
import { analyticsApi } from '../../services/analytics-api';
import { getErrorMessage } from '../../services/api-client';
import type {
  DailyRevenue,
  PopularDish,
  CustomerFeedback,
  RevenueMetrics,
  OrderMetrics,
} from '../../types/models';
import { formatCurrency, formatDate } from '../../utils/format';

type AnalyticsPeriod = 'today' | 'week' | 'month' | 'year';

const PERIODS: Array<{ key: AnalyticsPeriod; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'year', label: 'This Year' },
];

const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444'];

export const Analytics: React.FC = () => {
  const { restaurant } = useRestaurant();

  const [period, setPeriod] = useState<AnalyticsPeriod>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [orderMetrics, setOrderMetrics] = useState<OrderMetrics | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [popularDishes, setPopularDishes] = useState<PopularDish[]>([]);
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);

  const fetchAnalytics = useCallback(async (): Promise<void> => {
    if (!restaurant?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [revData, orderData, dailyData, dishData, feedbackData] = await Promise.all([
        analyticsApi.getRevenueMetrics(restaurant.id, period),
        analyticsApi.getOrderMetrics(restaurant.id, period),
        analyticsApi.getDailyRevenue(restaurant.id),
        analyticsApi.getPopularDishes(restaurant.id, 6),
        analyticsApi.getCustomerFeedback(restaurant.id, { limit: 5 }),
      ]);

      setRevenue(revData);
      setOrderMetrics(orderData);
      setDailyRevenue(dailyData);
      setPopularDishes(dishData);
      setFeedback(feedbackData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id, period]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">Track your restaurant performance</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === p.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      {/* Key Metrics */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Revenue"
          value={formatCurrency(revenue?.totalRevenue ?? 0)}
          trend={
            revenue?.changePercentage !== undefined
              ? { value: revenue.changePercentage, isPositive: revenue.changePercentage >= 0 }
              : undefined
          }
        />
        <MetricCard
          title="Orders"
          value={orderMetrics?.totalOrders ?? 0}
          subtitle={`${orderMetrics?.cancelledOrders ?? 0} cancelled`}
        />
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(orderMetrics?.averageOrderValue ?? 0)}
        />
        <MetricCard
          title="Avg Prep Time"
          value={`${orderMetrics?.averagePreparationTime ?? 0} min`}
        />
      </div>

      {/* Revenue Chart */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Revenue Trend</h2>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value: string) => formatDate(value, { month: 'short', day: 'numeric' })}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value: number) => `$${value}`}
                fontSize={12}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                labelFormatter={(label: string) => formatDate(label)}
              />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Order Count Trend */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Order Trend</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => formatDate(value, { month: 'short', day: 'numeric' })}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [value, 'Orders']}
                  labelFormatter={(label: string) => formatDate(label)}
                />
                <Line type="monotone" dataKey="orderCount" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Dishes */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Popular Dishes</h2>
          <div className="mt-4 flex items-center">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularDishes}
                    dataKey="orderCount"
                    nameKey="dishName"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                  >
                    {popularDishes.map((_entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="ml-6 flex-1 space-y-2">
              {popularDishes.slice(0, 5).map((dish, index) => (
                <div key={dish.dishId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-gray-700">{dish.dishName}</span>
                  </div>
                  <span className="font-medium text-gray-900">{dish.orderCount} orders</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Feedback */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Recent Feedback</h2>
        {feedback.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No feedback yet</p>
        ) : (
          <div className="mt-4 divide-y divide-gray-100">
            {feedback.map((item) => (
              <div key={item.id} className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{item.customerName}</span>
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`h-4 w-4 ${i < item.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{item.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
