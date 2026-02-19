/**
 * Dashboard Page
 * Today's orders overview, revenue metrics, order statistics, quick actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { MetricCard } from '../../components/common/MetricCard';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { OrderCard } from '../../components/orders/OrderCard';
import { useRestaurant } from '../../contexts/restaurant-context';
import { useOrders } from '../../contexts/order-context';
import { analyticsApi } from '../../services/analytics-api';
import { getErrorMessage } from '../../services/api-client';
import type { AnalyticsSummary } from '../../types/models';
import { formatCurrency } from '../../utils/format';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const {
    activeOrders,
    isLoading: ordersLoading,
    acceptOrder,
    markPreparing,
    markReady,
    cancelOrder,
    clearNewOrderCount,
  } = useOrders();

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    clearNewOrderCount();
  }, [clearNewOrderCount]);

  useEffect(() => {
    if (!restaurant?.id) {
      return;
    }

    async function fetchAnalytics(): Promise<void> {
      try {
        const summary = await analyticsApi.getSummary(restaurant!.id, {
          period: 'today',
        });
        setAnalytics(summary);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setAnalyticsLoading(false);
      }
    }

    void fetchAnalytics();
  }, [restaurant?.id]);

  const handleAcceptOrder = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await acceptOrder(orderId);
      } catch {
        // Error handled by context
      }
    },
    [acceptOrder]
  );

  const handleMarkPreparing = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await markPreparing(orderId);
      } catch {
        // Error handled by context
      }
    },
    [markPreparing]
  );

  const handleMarkReady = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await markReady(orderId);
      } catch {
        // Error handled by context
      }
    },
    [markReady]
  );

  const handleCancelOrder = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await cancelOrder(orderId, 'Cancelled by restaurant');
      } catch {
        // Error handled by context
      }
    },
    [cancelOrder]
  );

  const handleViewDetail = useCallback(
    (orderId: string): void => {
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  const pendingOrders = activeOrders.filter((o) => o.status === 'PENDING');
  const preparingOrders = activeOrders.filter(
    (o) => o.status === 'CONFIRMED' || o.status === 'PREPARING'
  );
  const readyOrders = activeOrders.filter((o) => o.status === 'READY');

  return (
    <div data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back, {restaurant?.name ?? 'Restaurant'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/menu/add')}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Add Dish
          </button>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View All Orders
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      {/* Metrics */}
      {analyticsLoading ? (
        <div className="mt-6 flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Today's Revenue"
            value={formatCurrency(analytics?.revenue.totalRevenue ?? 0)}
            trend={
              analytics?.revenue.changePercentage !== undefined
                ? {
                    value: analytics.revenue.changePercentage,
                    isPositive: analytics.revenue.changePercentage >= 0,
                  }
                : undefined
            }
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <MetricCard
            title="Total Orders"
            value={analytics?.orders.totalOrders ?? 0}
            subtitle={`${analytics?.orders.completedOrders ?? 0} completed`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <MetricCard
            title="Avg Order Value"
            value={formatCurrency(analytics?.orders.averageOrderValue ?? 0)}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <MetricCard
            title="Active Orders"
            value={activeOrders.length}
            subtitle={`${pendingOrders.length} pending`}
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>
      )}

      {/* Active Orders */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Active Orders</h2>

        {ordersLoading ? (
          <div className="mt-4 flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-gray-300 py-12 text-center">
            <p className="text-gray-500">No active orders right now</p>
            <p className="mt-1 text-sm text-gray-400">
              New orders will appear here in real-time
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Pending Column */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-yellow-700">
                <span className="h-2 w-2 rounded-full bg-yellow-500" />
                Pending ({pendingOrders.length})
              </h3>
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAccept={handleAcceptOrder}
                    onCancel={handleCancelOrder}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>

            {/* Preparing Column */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-700">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Preparing ({preparingOrders.length})
              </h3>
              <div className="space-y-3">
                {preparingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onMarkPreparing={handleMarkPreparing}
                    onMarkReady={handleMarkReady}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>

            {/* Ready Column */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-green-700">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Ready ({readyOrders.length})
              </h3>
              <div className="space-y-3">
                {readyOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
