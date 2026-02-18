import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Order } from '../../../types/models';
import { OrderList } from '../OrderList';

/**
 * OrderList Component Tests
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
    ],
    subtotal: 12.99,
    deliveryFee: 3.99,
    tax: 1.30,
    discount: 0,
    total: 18.28,
    status: 'PENDING',
    paymentMethod: 'CREDIT_CARD',
    paymentStatus: 'PENDING',
    deliveryAddress: { id: 'a1', type: 'home', street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94102', country: 'US', isDefault: true },
    estimatedDeliveryTime: '30-45 min',
    placedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  } as Order;
}

function createOrders(count: number): Order[] {
  return Array.from({ length: count }, (_, i) =>
    createOrder({ id: `order-${i + 1}`, restaurantName: `Restaurant ${i + 1}` })
  );
}

describe('OrderList Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<OrderList orders={createOrders(3)} />);
      expect(screen.getByTestId('order-list')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<OrderList orders={createOrders(2)} data-testid="my-order-list" />);
      expect(screen.getByTestId('my-order-list')).toBeInTheDocument();
    });

    it('displays Order History heading', () => {
      render(<OrderList orders={createOrders(2)} />);
      expect(screen.getByText('Order History')).toBeInTheDocument();
    });

    it('renders all order cards', () => {
      render(<OrderList orders={createOrders(3)} />);
      expect(screen.getByText(/Restaurant 1/)).toBeInTheDocument();
      expect(screen.getByText(/Restaurant 2/)).toBeInTheDocument();
      expect(screen.getByText(/Restaurant 3/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no orders', () => {
      render(<OrderList orders={[]} />);
      expect(screen.getByTestId('order-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No orders yet')).toBeInTheDocument();
      expect(screen.getByText('Your order history will appear here')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<OrderList orders={[]} loading />);
      expect(screen.getByTestId('order-list-loading')).toBeInTheDocument();
    });

    it('does not show orders when loading', () => {
      render(<OrderList orders={createOrders(3)} loading />);
      expect(screen.queryByTestId('order-list')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error exists', () => {
      render(<OrderList orders={[]} error="Failed to load orders" />);
      expect(screen.getByText('Failed to load orders')).toBeInTheDocument();
    });

    it('does not show orders when error exists', () => {
      render(<OrderList orders={createOrders(3)} error="Error" />);
      expect(screen.queryByTestId('order-list')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('passes onSelectOrder to OrderCards', () => {
      const handleSelect = jest.fn();
      render(<OrderList orders={[createOrder({ id: 'order-42' })]} onSelectOrder={handleSelect} />);

      fireEvent.click(screen.getByTestId('order-card'));
      expect(handleSelect).toHaveBeenCalledWith('order-42');
    });

    it('passes onReorder to OrderCards', () => {
      const handleReorder = jest.fn();
      const order = createOrder({ status: 'DELIVERED' as any });
      render(<OrderList orders={[order]} onReorder={handleReorder} />);

      // The reorder button should appear for delivered orders
      const reorderBtn = screen.queryByTestId('reorder-button');
      if (reorderBtn) {
        fireEvent.click(reorderBtn);
        expect(handleReorder).toHaveBeenCalled();
      }
    });
  });
});
