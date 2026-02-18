import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { CartItem as CartItemType } from '../../../types/models';
import { CartList } from '../CartList';

/**
 * CartList Component Tests
 */

function createCartItem(overrides: Partial<CartItemType> = {}): CartItemType {
  return {
    id: 'item-1',
    dishId: 'dish-1',
    dishName: 'Margherita Pizza',
    quantity: 1,
    price: 12.99,
    customizations: [],
    subtotal: 12.99,
    ...overrides,
  };
}

describe('CartList Component', () => {
  describe('Rendering', () => {
    it('renders cart list with items', () => {
      const items = [createCartItem({ id: 'i1' }), createCartItem({ id: 'i2', dishName: 'Salad' })];
      render(<CartList items={items} />);
      expect(screen.getByTestId('cart-list')).toBeInTheDocument();
    });

    it('renders each cart item', () => {
      const items = [createCartItem({ id: 'i1', dishName: 'Pizza' }), createCartItem({ id: 'i2', dishName: 'Salad' })];
      render(<CartList items={items} />);
      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Salad')).toBeInTheDocument();
    });

    it('displays item count in header', () => {
      const items = [createCartItem({ id: 'i1' }), createCartItem({ id: 'i2' })];
      render(<CartList items={items} />);
      expect(screen.getByText('Your Cart (2 items)')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      const items = [createCartItem()];
      render(<CartList items={items} data-testid="custom-cart" />);
      expect(screen.getByTestId('custom-cart')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty cart message when no items', () => {
      render(<CartList items={[]} />);
      expect(screen.getByTestId('cart-empty')).toBeInTheDocument();
      expect(screen.getByText('Your cart is empty')).toBeInTheDocument();
    });

    it('shows helpful message in empty state', () => {
      render(<CartList items={[]} />);
      expect(screen.getByText('Add items from a restaurant to get started')).toBeInTheDocument();
    });
  });

  describe('Clear Cart', () => {
    it('renders clear cart button when onClearCart provided', () => {
      const items = [createCartItem()];
      render(<CartList items={items} onClearCart={jest.fn()} />);
      expect(screen.getByTestId('clear-cart')).toBeInTheDocument();
    });

    it('does not render clear cart button when onClearCart not provided', () => {
      const items = [createCartItem()];
      render(<CartList items={items} />);
      expect(screen.queryByTestId('clear-cart')).not.toBeInTheDocument();
    });

    it('calls onClearCart when clicked', () => {
      const handleClear = jest.fn();
      const items = [createCartItem()];
      render(<CartList items={items} onClearCart={handleClear} />);

      fireEvent.click(screen.getByTestId('clear-cart'));
      expect(handleClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Item Interactions', () => {
    it('passes onUpdateQuantity to cart items', () => {
      const handleUpdate = jest.fn();
      const items = [createCartItem({ id: 'item-1', quantity: 2 })];
      render(<CartList items={items} onUpdateQuantity={handleUpdate} />);

      fireEvent.click(screen.getByTestId('quantity-increase'));
      expect(handleUpdate).toHaveBeenCalledWith('item-1', 3);
    });

    it('passes onRemove to cart items', () => {
      const handleRemove = jest.fn();
      const items = [createCartItem({ id: 'item-1' })];
      render(<CartList items={items} onRemove={handleRemove} />);

      fireEvent.click(screen.getByTestId('remove-item'));
      expect(handleRemove).toHaveBeenCalledWith('item-1');
    });
  });
});
