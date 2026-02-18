import React from 'react';

import type { Order } from '../../types/models';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';

import { OrderCard } from './OrderCard';

export interface OrderListProps {
  orders: Order[];
  loading?: boolean;
  error?: string | null;
  onSelectOrder?: (id: string) => void;
  onReorder?: (order: Order) => void;
  'data-testid'?: string;
}

/**
 * Order list component for order history
 */
export const OrderList: React.FC<OrderListProps> = ({
  orders,
  loading = false,
  error = null,
  onSelectOrder,
  onReorder,
  'data-testid': testId,
}) => {
  if (loading) {
    return <LoadingSpinner data-testid="order-list-loading" />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!orders.length) {
    return (
      <div className="order-list-empty" data-testid="order-list-empty">
        <p>No orders yet</p>
        <p>Your order history will appear here</p>
      </div>
    );
  }

  return (
    <div className="order-list" data-testid={testId || 'order-list'}>
      <h3>Order History</h3>
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onClick={onSelectOrder}
          onReorder={onReorder}
        />
      ))}
    </div>
  );
};
