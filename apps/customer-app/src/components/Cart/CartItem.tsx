import React from 'react';

import type { CartItem as CartItemType } from '../../types/models';

export interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity?: (id: string, quantity: number) => void;
  onRemove?: (id: string) => void;
  'data-testid'?: string;
}

/**
 * Cart item component with quantity controls
 * Memoized to prevent unnecessary re-renders when props haven't changed
 */
export const CartItem: React.FC<CartItemProps> = React.memo(({
  item,
  onUpdateQuantity,
  onRemove,
  'data-testid': testId,
}) => {
  return (
    <div className="cart-item" data-testid={testId || 'cart-item'}>
      <div className="cart-item-info">
        <h4 data-testid="cart-item-name">{item.dishName}</h4>
        <div data-testid="cart-item-price">${item.price.toFixed(2)}</div>
        {item.customizations?.length > 0 && (
          <div className="cart-item-customizations" data-testid="cart-item-customizations">
            {item.customizations.map((c) => (
              <span key={c.optionId} className="customization-tag">
                {c.optionName}
              </span>
            ))}
          </div>
        )}
        {item.specialInstructions && (
          <div data-testid="cart-item-instructions">
            Note: {item.specialInstructions}
          </div>
        )}
      </div>
      <div className="cart-item-controls">
        <div className="quantity-control" data-testid="cart-item-quantity">
          <button
            onClick={() => onUpdateQuantity?.(item.id, Math.max(1, item.quantity - 1))}
            data-testid="quantity-decrease"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span data-testid="quantity-value">{item.quantity}</span>
          <button
            onClick={() => onUpdateQuantity?.(item.id, item.quantity + 1)}
            data-testid="quantity-increase"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <div data-testid="cart-item-subtotal">
          ${item.subtotal.toFixed(2)}
        </div>
        {onRemove && (
          <button
            onClick={() => onRemove(item.id)}
            className="remove-button"
            data-testid="remove-item"
            aria-label="Remove item"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
});
