import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { CartItem as CartItemType } from '../../../types/models';
import { CartItem } from '../CartItem';

/**
 * CartItem Component Tests
 * Tests cart item with quantity controls and removal
 */

function createCartItem(overrides: Partial<CartItemType> = {}): CartItemType {
  return {
    id: 'item-1',
    dishId: 'dish-1',
    dishName: 'Margherita Pizza',
    dishImage: 'https://example.com/pizza.jpg',
    quantity: 2,
    price: 12.99,
    customizations: [],
    subtotal: 25.98,
    ...overrides,
  };
}

describe('CartItem Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CartItem item={createCartItem()} />);
      expect(screen.getByTestId('cart-item')).toBeInTheDocument();
    });

    it('displays dish name', () => {
      render(<CartItem item={createCartItem({ dishName: 'Caesar Salad' })} />);
      expect(screen.getByTestId('cart-item-name')).toHaveTextContent('Caesar Salad');
    });

    it('displays price', () => {
      render(<CartItem item={createCartItem({ price: 12.99 })} />);
      expect(screen.getByTestId('cart-item-price')).toHaveTextContent('$12.99');
    });

    it('displays quantity', () => {
      render(<CartItem item={createCartItem({ quantity: 3 })} />);
      expect(screen.getByTestId('quantity-value')).toHaveTextContent('3');
    });

    it('displays subtotal', () => {
      render(<CartItem item={createCartItem({ subtotal: 25.98 })} />);
      expect(screen.getByTestId('cart-item-subtotal')).toHaveTextContent('$25.98');
    });

    it('renders with custom data-testid', () => {
      render(<CartItem item={createCartItem()} data-testid="custom-cart-item" />);
      expect(screen.getByTestId('custom-cart-item')).toBeInTheDocument();
    });
  });

  describe('Customizations', () => {
    it('displays customizations when present', () => {
      const item = createCartItem({
        customizations: [
          { customizationId: 'c1', customizationName: 'Size', optionId: 'o1', optionName: 'Large', priceModifier: 3 },
        ],
      });
      render(<CartItem item={item} />);
      expect(screen.getByTestId('cart-item-customizations')).toBeInTheDocument();
      expect(screen.getByText('Large')).toBeInTheDocument();
    });

    it('does not render customizations section when empty', () => {
      render(<CartItem item={createCartItem({ customizations: [] })} />);
      expect(screen.queryByTestId('cart-item-customizations')).not.toBeInTheDocument();
    });

    it('displays multiple customizations', () => {
      const item = createCartItem({
        customizations: [
          { customizationId: 'c1', customizationName: 'Size', optionId: 'o1', optionName: 'Large', priceModifier: 3 },
          { customizationId: 'c2', customizationName: 'Topping', optionId: 'o2', optionName: 'Extra Cheese', priceModifier: 2 },
        ],
      });
      render(<CartItem item={item} />);
      expect(screen.getByText('Large')).toBeInTheDocument();
      expect(screen.getByText('Extra Cheese')).toBeInTheDocument();
    });
  });

  describe('Special Instructions', () => {
    it('displays special instructions when present', () => {
      const item = createCartItem({ specialInstructions: 'No onions please' });
      render(<CartItem item={item} />);
      expect(screen.getByTestId('cart-item-instructions')).toHaveTextContent('Note: No onions please');
    });

    it('does not render instructions when absent', () => {
      render(<CartItem item={createCartItem({ specialInstructions: undefined })} />);
      expect(screen.queryByTestId('cart-item-instructions')).not.toBeInTheDocument();
    });
  });

  describe('Quantity Controls', () => {
    it('calls onUpdateQuantity when increase button clicked', () => {
      const handleUpdate = jest.fn();
      const item = createCartItem({ id: 'item-1', quantity: 2 });
      render(<CartItem item={item} onUpdateQuantity={handleUpdate} />);

      fireEvent.click(screen.getByTestId('quantity-increase'));
      expect(handleUpdate).toHaveBeenCalledWith('item-1', 3);
    });

    it('calls onUpdateQuantity when decrease button clicked', () => {
      const handleUpdate = jest.fn();
      const item = createCartItem({ id: 'item-1', quantity: 3 });
      render(<CartItem item={item} onUpdateQuantity={handleUpdate} />);

      fireEvent.click(screen.getByTestId('quantity-decrease'));
      expect(handleUpdate).toHaveBeenCalledWith('item-1', 2);
    });

    it('does not go below 1 when decreasing', () => {
      const handleUpdate = jest.fn();
      const item = createCartItem({ id: 'item-1', quantity: 1 });
      render(<CartItem item={item} onUpdateQuantity={handleUpdate} />);

      fireEvent.click(screen.getByTestId('quantity-decrease'));
      expect(handleUpdate).toHaveBeenCalledWith('item-1', 1);
    });

    it('has accessible labels on quantity buttons', () => {
      render(<CartItem item={createCartItem()} onUpdateQuantity={jest.fn()} />);
      expect(screen.getByLabelText('Decrease quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Increase quantity')).toBeInTheDocument();
    });
  });

  describe('Remove Button', () => {
    it('renders remove button when onRemove provided', () => {
      render(<CartItem item={createCartItem()} onRemove={jest.fn()} />);
      expect(screen.getByTestId('remove-item')).toBeInTheDocument();
    });

    it('does not render remove button when onRemove not provided', () => {
      render(<CartItem item={createCartItem()} />);
      expect(screen.queryByTestId('remove-item')).not.toBeInTheDocument();
    });

    it('calls onRemove with item id when clicked', () => {
      const handleRemove = jest.fn();
      render(<CartItem item={createCartItem({ id: 'item-42' })} onRemove={handleRemove} />);

      fireEvent.click(screen.getByTestId('remove-item'));
      expect(handleRemove).toHaveBeenCalledWith('item-42');
    });

    it('has accessible label on remove button', () => {
      render(<CartItem item={createCartItem()} onRemove={jest.fn()} />);
      expect(screen.getByLabelText('Remove item')).toBeInTheDocument();
    });
  });
});
