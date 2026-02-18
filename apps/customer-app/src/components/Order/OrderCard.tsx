import React, { useMemo } from 'react';

import type { Order } from '../../types/models';
import { Card } from '../common/Card';

export interface OrderCardProps {
  order: Order;
  onClick?: (id: string) => void;
  onReorder?: (order: Order) => void;
  'data-testid'?: string;
}

// Status color mapping outside component to avoid recreation
const STATUS_COLORS: Record<string, string> = {
  pending: 'yellow',
  confirmed: 'blue',
  preparing: 'orange',
  ready: 'green',
  out_for_delivery: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

/**
 * Order card component for order history
 * Memoized to prevent unnecessary re-renders when props haven't changed
 */
export const OrderCard: React.FC<OrderCardProps> = React.memo(({
  order,
  onClick,
  onReorder,
  'data-testid': testId,
}) => {
  // Memoize formatted date
  const formattedDate = useMemo(() =>
    new Date(order.placedAt).toLocaleDateString(),
    [order.placedAt]
  );

  return (
    <div
      className="order-card"
      onClick={() => onClick?.(order.id)}
      data-testid={testId || 'order-card'}
    >
      <Card variant="outlined">
        <div className="order-header">
          <h4 data-testid="order-restaurant">{order.restaurantName}</h4>
          <span
            className={`order-status status-${STATUS_COLORS[order.status] || 'gray'}`}
            data-testid="order-status"
          >
            {order.status.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="order-items" data-testid="order-items">
          {order.items.map((item) => (
            <div key={item.dishId} className="order-item">
              <span>{item.quantity}x {item.dishName}</span>
              <span>${item.subtotal.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="order-footer">
          <div data-testid="order-total">Total: ${order.total.toFixed(2)}</div>
          <div data-testid="order-date">
            {formattedDate}
          </div>
          {onReorder && order.status.toLowerCase() === 'delivered' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReorder(order);
              }}
              data-testid="reorder-button"
            >
              Reorder
            </button>
          )}
        </div>
      </Card>
    </div>
  );
});
