/**
 * OrderList Page - All orders with status filters, date range, search, and pagination
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { SearchBar, FilterBar, LoadingSpinner, EmptyState, ErrorAlert } from '../../components/common';
import { OrderCard } from '../../components/orders/OrderCard';
import { useRestaurant } from '../../contexts/restaurant-context';
import { useOrders } from '../../contexts/order-context';
import { orderApi } from '../../services/order-api';
import { getErrorMessage } from '../../services/api-client';
import type { Order, OrderStatus } from '../../types/models';
import { DEFAULT_PAGE_SIZE } from '../../utils/constants';

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const OrderList: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();
  const { acceptOrder, markPreparing, markReady, cancelOrder, clearNewOrderCount } =
    useOrders();

  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    clearNewOrderCount();
  }, [clearNewOrderCount]);

  const fetchOrders = useCallback(async (): Promise<void> => {
    if (!restaurant?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await orderApi.listOrders(restaurant.id, {
        status: statusFilter === 'all' ? undefined : (statusFilter as OrderStatus),
        page,
        limit: DEFAULT_PAGE_SIZE,
        sortBy: 'placedAt',
        sortOrder: 'desc',
      });
      setOrders(result.orders);
      setHasMore(result.pagination.hasMore);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id, statusFilter, page]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const handleAccept = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await acceptOrder(orderId);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'CONFIRMED' as OrderStatus } : o))
        );
      } catch {
        // Handled by context
      }
    },
    [acceptOrder]
  );

  const handleMarkPreparing = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await markPreparing(orderId);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: 'PREPARING' as OrderStatus } : o
          )
        );
      } catch {
        // Handled by context
      }
    },
    [markPreparing]
  );

  const handleMarkReady = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await markReady(orderId);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'READY' as OrderStatus } : o))
        );
      } catch {
        // Handled by context
      }
    },
    [markReady]
  );

  const handleCancel = useCallback(
    async (orderId: string): Promise<void> => {
      try {
        await cancelOrder(orderId, 'Cancelled by restaurant');
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, status: 'CANCELLED' as OrderStatus } : o
          )
        );
      } catch {
        // Handled by context
      }
    },
    [cancelOrder]
  );

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query)
    );
  });

  return (
    <div data-testid="order-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and track all orders</p>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <FilterBar
          options={STATUS_FILTERS}
          selected={statusFilter}
          onSelect={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        />
        <SearchBar
          placeholder="Search by order # or customer..."
          onSearch={setSearchQuery}
          className="w-full sm:w-72"
        />
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description={
            statusFilter !== 'all'
              ? 'No orders match the selected filter'
              : 'Orders will appear here when customers place them'
          }
        />
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onAccept={handleAccept}
                onMarkPreparing={handleMarkPreparing}
                onMarkReady={handleMarkReady}
                onCancel={handleCancel}
                onViewDetail={(id) => navigate(`/orders/${id}`)}
              />
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={!hasMore}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};
