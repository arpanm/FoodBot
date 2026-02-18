import React, { useMemo } from 'react';

import type { CartItem as CartItemType } from '../../types/models';
import { Button } from '../common/Button';

import { CartItem } from './CartItem';

export interface CartListProps {
  items: CartItemType[];
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  onClearCart?: () => void;
  'data-testid'?: string;
}

/**
 * Cart list component displaying all cart items
 * Uses useMemo to optimize item count calculation
 */
export const CartList: React.FC<CartListProps> = ({
  items,
  onUpdateQuantity,
  onRemove,
  onClearCart,
  'data-testid': testId,
}) => {
  // Memoize item count to avoid recalculation on every render
  const itemCount = useMemo(() => items.length, [items.length]);
  if (!items.length) {
    return (
      <div className="cart-empty" data-testid="cart-empty">
        <p>Your cart is empty</p>
        <p>Add items from a restaurant to get started</p>
      </div>
    );
  }

  return (
    <div className="cart-list" data-testid={testId || 'cart-list'}>
      <div className="cart-header">
        <h3>Your Cart ({itemCount} items)</h3>
        {onClearCart && (
          <Button
            variant="text"
            size="small"
            onClick={onClearCart}
            data-testid="clear-cart"
          >
            Clear Cart
          </Button>
        )}
      </div>
      <div className="cart-items">
        {items.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
};
