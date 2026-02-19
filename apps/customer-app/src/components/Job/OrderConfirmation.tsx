/**
 * OrderConfirmation Component
 * Displays order confirmation with tracking details
 */

import React from 'react';

import type { PlaceOrderJobResult } from '../../types/job.types';
import { Button } from '../common/Button';

import './OrderConfirmation.css';

export interface OrderConfirmationProps {
  result: PlaceOrderJobResult;
  onViewOrder?: (orderId: string) => void;
  onTrackOrder?: (orderId: string) => void;
  onBackToHome?: () => void;
  className?: string;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  result,
  onViewOrder,
  onTrackOrder,
  onBackToHome,
  className = '',
}) => {
  return (
    <div className={`order-confirmation ${className}`} data-testid="order-confirmation">
      {/* Success Icon */}
      <div className="order-confirmation__icon-wrapper">
        <div className="order-confirmation__icon">✓</div>
      </div>

      {/* Title */}
      <h2 className="order-confirmation__title">Order Placed Successfully!</h2>

      {/* Message */}
      <p className="order-confirmation__message">
        Your order has been confirmed and is being prepared.
      </p>

      {/* Order Details */}
      <div className="order-confirmation__details">
        <div className="order-confirmation__detail-item">
          <span className="order-confirmation__detail-label">Order Number</span>
          <span className="order-confirmation__detail-value order-confirmation__detail-value--highlight">
            {result.orderNumber}
          </span>
        </div>

        {result.restaurantName && (
          <div className="order-confirmation__detail-item">
            <span className="order-confirmation__detail-label">Restaurant</span>
            <span className="order-confirmation__detail-value">{result.restaurantName}</span>
          </div>
        )}

        {result.estimatedDeliveryTime && (
          <div className="order-confirmation__detail-item">
            <span className="order-confirmation__detail-label">Estimated Delivery</span>
            <span className="order-confirmation__detail-value">
              {result.estimatedDeliveryTime}
            </span>
          </div>
        )}

        <div className="order-confirmation__detail-item order-confirmation__detail-item--total">
          <span className="order-confirmation__detail-label">Total Amount</span>
          <span className="order-confirmation__detail-value order-confirmation__detail-value--total">
            ${result.total.toFixed(2)}
          </span>
        </div>

        {result.paymentStatus && (
          <div className="order-confirmation__detail-item">
            <span className="order-confirmation__detail-label">Payment Status</span>
            <span
              className={`order-confirmation__detail-value order-confirmation__payment-status order-confirmation__payment-status--${result.paymentStatus.toLowerCase()}`}
            >
              {result.paymentStatus}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="order-confirmation__actions">
        {onTrackOrder && (
          <Button
            variant="primary"
            size="large"
            onClick={() => onTrackOrder(result.orderId)}
            className="order-confirmation__action-button"
            data-testid="track-order-button"
          >
            Track Order
          </Button>
        )}

        {onViewOrder && (
          <Button
            variant="outline"
            size="large"
            onClick={() => onViewOrder(result.orderId)}
            className="order-confirmation__action-button"
            data-testid="view-order-button"
          >
            View Order Details
          </Button>
        )}

        {onBackToHome && (
          <Button
            variant="text"
            size="medium"
            onClick={onBackToHome}
            className="order-confirmation__action-button"
            data-testid="back-to-home-button"
          >
            Back to Home
          </Button>
        )}
      </div>

      {/* Info Box */}
      <div className="order-confirmation__info-box">
        <p className="order-confirmation__info-text">
          📱 We&apos;ll send you updates via SMS and push notifications
        </p>
        <p className="order-confirmation__info-text">
          💬 You can track your order in real-time from the Orders page
        </p>
      </div>
    </div>
  );
};
