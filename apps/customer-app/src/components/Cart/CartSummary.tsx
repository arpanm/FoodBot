import React, { useMemo } from 'react';

import { Button } from '../common/Button';

export interface CartSummaryProps {
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount?: number;
  total: number;
  onCheckout?: () => void;
  loading?: boolean;
  'data-testid'?: string;
}

/**
 * Cart summary component with price breakdown
 * Uses useMemo to optimize price formatting calculations
 */
export const CartSummary: React.FC<CartSummaryProps> = ({
  subtotal,
  deliveryFee,
  tax,
  discount = 0,
  total,
  onCheckout,
  loading = false,
  'data-testid': testId,
}) => {
  // Memoize formatted prices to avoid recalculating on every render
  const formattedSubtotal = useMemo(() => subtotal.toFixed(2), [subtotal]);
  const formattedDeliveryFee = useMemo(() => deliveryFee.toFixed(2), [deliveryFee]);
  const formattedTax = useMemo(() => tax.toFixed(2), [tax]);
  const formattedDiscount = useMemo(() => discount.toFixed(2), [discount]);
  const formattedTotal = useMemo(() => total.toFixed(2), [total]);

  return (
    <div className="cart-summary" data-testid={testId || 'cart-summary'}>
      <h3>Order Summary</h3>
      <div className="summary-row" data-testid="summary-subtotal">
        <span>Subtotal</span>
        <span>${formattedSubtotal}</span>
      </div>
      <div className="summary-row" data-testid="summary-delivery-fee">
        <span>Delivery Fee</span>
        <span>${formattedDeliveryFee}</span>
      </div>
      <div className="summary-row" data-testid="summary-tax">
        <span>Tax</span>
        <span>${formattedTax}</span>
      </div>
      {discount > 0 && (
        <div className="summary-row discount" data-testid="summary-discount">
          <span>Discount</span>
          <span>-${formattedDiscount}</span>
        </div>
      )}
      <div className="summary-row total" data-testid="summary-total">
        <span>Total</span>
        <span>${formattedTotal}</span>
      </div>
      {onCheckout && (
        <Button
          fullWidth
          onClick={onCheckout}
          loading={loading}
          data-testid="checkout-button"
        >
          Proceed to Checkout
        </Button>
      )}
    </div>
  );
};
