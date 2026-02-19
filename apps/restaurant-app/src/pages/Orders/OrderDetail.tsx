/**
 * OrderDetail Page - Full order view with items, customer info, status timeline, actions
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { StatusBadge, LoadingSpinner, ErrorAlert, Modal } from '../../components/common';
import { useOrders } from '../../contexts/order-context';
import { orderApi } from '../../services/order-api';
import { getErrorMessage } from '../../services/api-client';
import type { Order, OrderStatus } from '../../types/models';
import { formatCurrency, formatDateTime, formatRelativeTime, formatOrderNumber } from '../../utils/format';
import { PAYMENT_METHOD_LABELS, ORDER_STATUS_LABELS } from '../../utils/constants';

const STATUS_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export const OrderDetail: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const { acceptOrder, markPreparing, markReady, cancelOrder } = useOrders();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    async function fetchOrder(): Promise<void> {
      try {
        const fetched = await orderApi.getOrderById(orderId!);
        setOrder(fetched);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = useCallback(
    async (action: 'accept' | 'preparing' | 'ready'): Promise<void> => {
      if (!orderId) {
        return;
      }

      setIsUpdating(true);
      try {
        let updated: Order | undefined;
        switch (action) {
          case 'accept':
            updated = await orderApi.acceptOrder(orderId);
            break;
          case 'preparing':
            updated = await orderApi.markPreparing(orderId);
            break;
          case 'ready':
            updated = await orderApi.markReady(orderId);
            break;
        }
        if (updated) {
          setOrder(updated);
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsUpdating(false);
      }
    },
    [orderId]
  );

  const handleCancel = useCallback(async (): Promise<void> => {
    if (!orderId || !cancelReason.trim()) {
      return;
    }

    setIsUpdating(true);
    try {
      await cancelOrder(orderId, cancelReason);
      setOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' as OrderStatus } : prev));
      setShowCancelModal(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdating(false);
    }
  }, [orderId, cancelReason, cancelOrder]);

  if (isLoading) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  if (!order) {
    return <ErrorAlert message="Order not found" onRetry={() => navigate('/orders')} />;
  }

  const currentStatusIndex = STATUS_FLOW.indexOf(order.status);

  return (
    <div data-testid="order-detail-page">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/orders')} className="text-gray-400 hover:text-gray-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Order {formatOrderNumber(order.orderNumber)}
            </h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Placed {formatDateTime(order.placedAt)} ({formatRelativeTime(order.placedAt)})
          </p>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      {/* Status Timeline */}
      {order.status !== 'CANCELLED' && order.status !== 'REFUNDED' && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">Order Progress</h2>
          <div className="mt-4 flex items-center justify-between">
            {STATUS_FLOW.map((status, index) => (
              <React.Fragment key={status}>
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                      index <= currentStatusIndex
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index <= currentStatusIndex ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {ORDER_STATUS_LABELS[status]}
                  </p>
                </div>
                {index < STATUS_FLOW.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${index < currentStatusIndex ? 'bg-primary-600' : 'bg-gray-200'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            <div className="mt-4 divide-y divide-gray-100">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start justify-between py-3">
                  <div className="flex gap-3">
                    {item.dishImage && (
                      <img src={item.dishImage} alt={item.dishName} className="h-12 w-12 rounded-lg object-cover" loading="lazy" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.dishName}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      {item.customizations.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {item.customizations.map((c) => c.optionName).join(', ')}
                        </p>
                      )}
                      {item.specialInstructions && (
                        <p className="text-xs italic text-gray-400">{item.specialInstructions}</p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(item.subtotal)}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Delivery Fee</span><span>{formatCurrency(order.deliveryFee)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Tax</span><span>{formatCurrency(order.tax)}</span></div>
              {order.discount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Discount</span><span className="text-green-600">-{formatCurrency(order.discount)}</span></div>
              )}
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Total</span><span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Payment Info */}
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Customer</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="font-medium text-gray-900">{order.customerName}</p>
              {order.customerPhone && <p className="text-gray-500">{order.customerPhone}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Delivery Address</h3>
            <div className="mt-3 text-sm text-gray-600">
              <p>{order.deliveryAddress.street}</p>
              <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={order.paymentStatus} size="sm" />
              </div>
            </div>
          </div>

          {/* Actions */}
          {!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status) && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900">Actions</h3>
              <div className="mt-3 space-y-2">
                {order.status === 'PENDING' && (
                  <button type="button" onClick={() => handleStatusUpdate('accept')} disabled={isUpdating} className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Accept Order</button>
                )}
                {order.status === 'CONFIRMED' && (
                  <button type="button" onClick={() => handleStatusUpdate('preparing')} disabled={isUpdating} className="w-full rounded-lg bg-primary-600 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">Start Preparing</button>
                )}
                {order.status === 'PREPARING' && (
                  <button type="button" onClick={() => handleStatusUpdate('ready')} disabled={isUpdating} className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">Mark Ready</button>
                )}
                {['PENDING', 'CONFIRMED'].includes(order.status) && (
                  <button type="button" onClick={() => setShowCancelModal(true)} className="w-full rounded-lg border border-red-300 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Cancel Order</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Order"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setShowCancelModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Back</button>
            <button type="button" onClick={handleCancel} disabled={!cancelReason.trim() || isUpdating} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {isUpdating ? 'Cancelling...' : 'Confirm Cancel'}
            </button>
          </>
        }
      >
        <div>
          <p className="text-sm text-gray-600">Please provide a reason for cancellation.</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
            className="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            placeholder="Reason for cancellation"
          />
        </div>
      </Modal>
    </div>
  );
};
