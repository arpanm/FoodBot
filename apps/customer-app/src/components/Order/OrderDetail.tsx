import React from 'react';

import type { Order } from '../../types/models';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export interface OrderDetailProps {
  order: Order | null;
  onBack?: () => void;
  onCancel?: (orderId: string) => void;
  onTrack?: (orderId: string) => void;
  'data-testid'?: string;
}

/**
 * Detailed order view component
 */
export const OrderDetail: React.FC<OrderDetailProps> = ({
  order,
  onBack,
  onCancel,
  onTrack,
  'data-testid': testId,
}) => {
  if (!order) {
    return <div data-testid="order-detail-empty">No order selected</div>;
  }

  const statusLower = order.status.toLowerCase();
  const canCancel = ['pending', 'confirmed'].includes(statusLower);
  const canTrack = ['preparing', 'ready', 'out_for_delivery'].includes(statusLower);

  return (
    <div className="order-detail" data-testid={testId || 'order-detail'}>
      {onBack && (
        <button onClick={onBack} data-testid="back-button">
          Back
        </button>
      )}
      <Card variant="elevated">
        <div className="order-detail-header">
          <h2 data-testid="order-id">Order #{order.id}</h2>
          <span data-testid="order-status">{order.status.replace(/_/g, ' ')}</span>
        </div>

        <div className="order-detail-restaurant">
          <h3 data-testid="order-restaurant">{order.restaurantName}</h3>
        </div>

        <div className="order-detail-items" data-testid="order-items">
          <h4>Items</h4>
          {order.items.map((item) => (
            <div key={item.dishId} className="order-detail-item">
              <span data-testid={`item-${item.dishId}-name`}>
                {item.quantity}x {item.dishName}
              </span>
              <span data-testid={`item-${item.dishId}-price`}>
                ${item.subtotal.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="order-detail-pricing" data-testid="order-pricing">
          <div>
            <span>Subtotal</span>
            <span data-testid="order-subtotal">${order.subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span>Delivery Fee</span>
            <span data-testid="order-delivery-fee">${order.deliveryFee.toFixed(2)}</span>
          </div>
          <div>
            <span>Tax</span>
            <span data-testid="order-tax">${order.tax.toFixed(2)}</span>
          </div>
          {order.discount > 0 && (
            <div>
              <span>Discount</span>
              <span data-testid="order-discount">-${order.discount.toFixed(2)}</span>
            </div>
          )}
          <div className="total">
            <span>Total</span>
            <span data-testid="order-total">${order.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="order-detail-delivery" data-testid="order-delivery">
          <h4>Delivery Address</h4>
          <p data-testid="delivery-address">{order.deliveryAddress?.street}, {order.deliveryAddress?.city}</p>
          <p data-testid="delivery-phone">{order.contactInfo?.phone}</p>
        </div>

        <div className="order-detail-payment" data-testid="order-payment">
          <h4>Payment</h4>
          <p data-testid="payment-method">{order.paymentMethod}</p>
          <p data-testid="payment-status">{order.paymentStatus}</p>
        </div>

        <div className="order-detail-timeline" data-testid="order-timeline">
          <div data-testid="placed-at">
            Placed: {new Date(order.placedAt).toLocaleString()}
          </div>
          {order.estimatedDeliveryTime && (
            <div data-testid="estimated-delivery">
              Estimated: {order.estimatedDeliveryTime}
            </div>
          )}
        </div>

        <div className="order-detail-actions">
          {canTrack && onTrack && (
            <Button
              onClick={() => onTrack(order.id)}
              data-testid="track-order-button"
            >
              Track Order
            </Button>
          )}
          {canCancel && onCancel && (
            <Button
              variant="outline"
              onClick={() => onCancel(order.id)}
              data-testid="cancel-order-button"
            >
              Cancel Order
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};
