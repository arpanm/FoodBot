import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Order } from '../../../types/models';
import { OrderCard } from '../OrderCard';

/**
 * OrderCard Component Tests
 */

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: 'user-1',
    restaurantId: 'rest-1',
    restaurantName: 'Test Restaurant',
    items: [
      { dishId: 'dish-1', dishName: 'Pizza', quantity: 1, price: 12.99, customizations: [], subtotal: 12.99 },
      { dishId: 'dish-2', dishName: 'Salad', quantity: 2, price: 8.99, customizations: [], subtotal: 17.98 },
    ],
    subtotal: 30.97,
    deliveryFee: 5.99,
    tax: 3.10,
    discount: 0,
    total: 40.06,
    status: 'PENDING',
    paymentMethod: 'CREDIT_CARD',
    paymentStatus: 'PENDING',
    deliveryAddress: { id: 'a1', type: 'home', street: '123 Main', city: 'SF', state: 'CA', zipCode: '94102', country: 'US', isDefault: true },
    estimatedDeliveryTime: '30-45 min',
    placedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  } as Order;
}

describe('OrderCard Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<OrderCard order={createOrder()} />);
      expect(screen.getByTestId('order-card')).toBeInTheDocument();
    });

    it('displays restaurant name', () => {
      render(<OrderCard order={createOrder({ restaurantName: 'Pizza Palace' })} />);
      expect(screen.getByTestId('order-restaurant')).toHaveTextContent('Pizza Palace');
    });

    it('displays order status', () => {
      render(<OrderCard order={createOrder({ status: 'CONFIRMED' })} />);
      expect(screen.getByTestId('order-status')).toBeInTheDocument();
    });

    it('displays total', () => {
      render(<OrderCard order={createOrder({ total: 40.06 })} />);
      expect(screen.getByTestId('order-total')).toHaveTextContent('$40.06');
    });

    it('displays order date', () => {
      render(<OrderCard order={createOrder()} />);
      expect(screen.getByTestId('order-date')).toBeInTheDocument();
    });

    it('displays order items', () => {
      render(<OrderCard order={createOrder()} />);
      expect(screen.getByTestId('order-items')).toBeInTheDocument();
      expect(screen.getByText(/Pizza/)).toBeInTheDocument();
      expect(screen.getByText(/Salad/)).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<OrderCard order={createOrder()} data-testid="custom-order" />);
      expect(screen.getByTestId('custom-order')).toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('calls onClick with order id', () => {
      const handleClick = jest.fn();
      render(<OrderCard order={createOrder({ id: 'order-42' })} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('order-card'));
      expect(handleClick).toHaveBeenCalledWith('order-42');
    });

    it('works without onClick', () => {
      render(<OrderCard order={createOrder()} />);
      expect(() => fireEvent.click(screen.getByTestId('order-card'))).not.toThrow();
    });
  });

  describe('Reorder Button', () => {
    it('shows reorder button for delivered orders', () => {
      render(<OrderCard order={createOrder({ status: 'DELIVERED' })} onReorder={jest.fn()} />);
      expect(screen.getByTestId('reorder-button')).toBeInTheDocument();
    });

    it('does not show reorder button for non-delivered orders', () => {
      render(<OrderCard order={createOrder({ status: 'PENDING' })} onReorder={jest.fn()} />);
      expect(screen.queryByTestId('reorder-button')).not.toBeInTheDocument();
    });

    it('does not show reorder button when onReorder not provided', () => {
      render(<OrderCard order={createOrder({ status: 'DELIVERED' })} />);
      expect(screen.queryByTestId('reorder-button')).not.toBeInTheDocument();
    });

    it('calls onReorder with order when clicked', () => {
      const handleReorder = jest.fn();
      const order = createOrder({ status: 'DELIVERED' });
      render(<OrderCard order={order} onReorder={handleReorder} />);

      fireEvent.click(screen.getByTestId('reorder-button'));
      expect(handleReorder).toHaveBeenCalledWith(order);
    });

    it('stops propagation when reorder clicked', () => {
      const handleClick = jest.fn();
      const handleReorder = jest.fn();
      render(<OrderCard order={createOrder({ status: 'DELIVERED' })} onClick={handleClick} onReorder={handleReorder} />);

      fireEvent.click(screen.getByTestId('reorder-button'));
      expect(handleReorder).toHaveBeenCalled();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
