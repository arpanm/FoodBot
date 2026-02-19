/**
 * OrderCard - Displays an order summary with status and quick action buttons
 */

import React, { useCallback } from 'react';

import type { Order, OrderStatus } from '../../types/models';
import { formatCurrency, formatRelativeTime, formatOrderNumber } from '../../utils/format';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../../utils/constants';
import { StatusBadge } from '../common/StatusBadge';

interface OrderCardProps {
  order: Order;
  onAccept?: (orderId: string) => void;
  onMarkPreparing?: (orderId: string) => void;
  onMarkReady?: (orderId: string) => void;
  onCancel?: (orderId: string) => void;
  onViewDetail?: (orderId: string) => void;
}

function getNextAction(
  status: OrderStatus
): { label: string; action: 'accept' | 'preparing' | 'ready' } | null {
  switch (status) {
    case 'PENDING':
      return { label: 'Accept Order', action: 'accept' };
    case 'CONFIRMED':
      return { label: 'Start Preparing', action: 'preparing' };
    case 'PREPARING':
      return { label: 'Mark Ready', action: 'ready' };
    default:
      return null;
  }
}

export const OrderCard: React.FC<OrderCardProps> = React.memo(
  ({ order, onAccept, onMarkPreparing, onMarkReady, onCancel, onViewDetail }) => {
    const nextAction = getNextAction(order.status);

    const handlePrimaryAction = useCallback((): void => {
      if (!nextAction) {
        return;
      }
      switch (nextAction.action) {
        case 'accept':
          onAccept?.(order.id);
          break;
        case 'preparing':
          onMarkPreparing?.(order.id);
          break;
        case 'ready':
          onMarkReady?.(order.id);
          break;
      }
    }, [nextAction, order.id, onAccept, onMarkPreparing, onMarkReady]);

    const handleCancel = useCallback((): void => {
      onCancel?.(order.id);
    }, [order.id, onCancel]);

    const handleViewDetail = useCallback((): void => {
      onViewDetail?.(order.id);
    }, [order.id, onViewDetail]);

    const itemSummary = order.items
      .map((item) => `${item.quantity}x ${item.dishName}`)
      .join(', ');

    return (
      <div
        data-testid={`order-card-${order.id}`}
        className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
          order.status === 'PENDING' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatOrderNumber(order.orderNumber)}
              </h3>
              <StatusBadge status={order.status} size="sm" />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {order.customerName} - {formatRelativeTime(order.placedAt)}
            </p>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(order.total)}</p>
        </div>

        <div className="mt-3">
          <p className="text-sm text-gray-700">{itemSummary}</p>
          {order.specialInstructions && (
            <p className="mt-1 text-sm italic text-gray-500">
              Note: {order.specialInstructions}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}</span>
          <span>{order.items.length} item(s)</span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          {nextAction && (
            <button
              type="button"
              onClick={handlePrimaryAction}
              data-testid={`order-action-${nextAction.action}`}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {nextAction.label}
            </button>
          )}
          <button
            type="button"
            onClick={handleViewDetail}
            data-testid="order-view-detail"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Details
          </button>
          {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
            <button
              type="button"
              onClick={handleCancel}
              data-testid="order-cancel"
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }
);

OrderCard.displayName = 'OrderCard';
