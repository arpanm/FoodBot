import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Order } from '../../../types/models';
import { OrderDetail } from '../OrderDetail';

/**
 * OrderDetail Component Tests
 */

function createOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: 'user-1',
    restaurantId: 'rest-1',
    restaurantName: 'Pizza Palace',
    items: [
      { dishId: 'dish-1', dishName: 'Pizza', quantity: 2, price: 12.99, customizations: [], subtotal: 25.98 },
      { dishId: 'dish-2', dishName: 'Salad', quantity: 1, price: 8.99, customizations: [], subtotal: 8.99 },
    ],
    subtotal: 34.97,
    deliveryFee: 5.99,
    tax: 3.50,
    discount: 0,
    total: 44.46,
    status: 'PENDING',
    paymentMethod: 'CREDIT_CARD',
    paymentStatus: 'PENDING',
    deliveryAddress: { id: 'a1', type: 'home', street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94102', country: 'US', isDefault: true },
    contactInfo: { phone: '555-1234' },
    estimatedDeliveryTime: '30-45 min',
    placedAt: new Date('2024-01-15T12:00:00Z'),
    ...overrides,
  } as Order;
}

describe('OrderDetail Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<OrderDetail order={createOrder()} />);
      expect(screen.getByTestId('order-detail')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<OrderDetail order={createOrder()} data-testid="my-order-detail" />);
      expect(screen.getByTestId('my-order-detail')).toBeInTheDocument();
    });

    it('displays order id', () => {
      render(<OrderDetail order={createOrder({ id: 'order-42' })} />);
      expect(screen.getByTestId('order-id')).toHaveTextContent('Order #order-42');
    });

    it('displays order status', () => {
      render(<OrderDetail order={createOrder({ status: 'CONFIRMED' })} />);
      expect(screen.getByTestId('order-status')).toBeInTheDocument();
    });

    it('displays restaurant name', () => {
      render(<OrderDetail order={createOrder({ restaurantName: 'Sushi Bar' })} />);
      expect(screen.getByTestId('order-restaurant')).toHaveTextContent('Sushi Bar');
    });
  });

  describe('Order Items', () => {
    it('displays order items', () => {
      render(<OrderDetail order={createOrder()} />);
      expect(screen.getByTestId('order-items')).toBeInTheDocument();
      expect(screen.getByTestId('item-dish-1-name')).toHaveTextContent('2x Pizza');
      expect(screen.getByTestId('item-dish-2-name')).toHaveTextContent('1x Salad');
    });

    it('displays item prices', () => {
      render(<OrderDetail order={createOrder()} />);
      expect(screen.getByTestId('item-dish-1-price')).toHaveTextContent('$25.98');
      expect(screen.getByTestId('item-dish-2-price')).toHaveTextContent('$8.99');
    });
  });

  describe('Pricing', () => {
    it('displays subtotal', () => {
      render(<OrderDetail order={createOrder({ subtotal: 34.97 })} />);
      expect(screen.getByTestId('order-subtotal')).toHaveTextContent('$34.97');
    });

    it('displays delivery fee', () => {
      render(<OrderDetail order={createOrder({ deliveryFee: 5.99 })} />);
      expect(screen.getByTestId('order-delivery-fee')).toHaveTextContent('$5.99');
    });

    it('displays tax', () => {
      render(<OrderDetail order={createOrder({ tax: 3.50 })} />);
      expect(screen.getByTestId('order-tax')).toHaveTextContent('$3.50');
    });

    it('displays total', () => {
      render(<OrderDetail order={createOrder({ total: 44.46 })} />);
      expect(screen.getByTestId('order-total')).toHaveTextContent('$44.46');
    });

    it('displays discount when greater than 0', () => {
      render(<OrderDetail order={createOrder({ discount: 5.00 })} />);
      expect(screen.getByTestId('order-discount')).toHaveTextContent('-$5.00');
    });

    it('does not display discount when 0', () => {
      render(<OrderDetail order={createOrder({ discount: 0 })} />);
      expect(screen.queryByTestId('order-discount')).not.toBeInTheDocument();
    });
  });

  describe('Delivery Info', () => {
    it('displays delivery section', () => {
      render(<OrderDetail order={createOrder()} />);
      expect(screen.getByTestId('order-delivery')).toBeInTheDocument();
    });
  });

  describe('Payment Info', () => {
    it('displays payment method', () => {
      render(<OrderDetail order={createOrder({ paymentMethod: 'CREDIT_CARD' })} />);
      expect(screen.getByTestId('payment-method')).toHaveTextContent('CREDIT_CARD');
    });

    it('displays payment status', () => {
      render(<OrderDetail order={createOrder({ paymentStatus: 'COMPLETED' })} />);
      expect(screen.getByTestId('payment-status')).toHaveTextContent('COMPLETED');
    });
  });

  describe('Timeline', () => {
    it('displays placed at timestamp', () => {
      render(<OrderDetail order={createOrder()} />);
      expect(screen.getByTestId('placed-at')).toBeInTheDocument();
    });

    it('displays estimated delivery time', () => {
      render(<OrderDetail order={createOrder({ estimatedDeliveryTime: '30-45 min' })} />);
      expect(screen.getByTestId('estimated-delivery')).toHaveTextContent('30-45 min');
    });
  });

  describe('Empty State', () => {
    it('shows empty message when order is null', () => {
      render(<OrderDetail order={null} />);
      expect(screen.getByTestId('order-detail-empty')).toBeInTheDocument();
      expect(screen.getByText('No order selected')).toBeInTheDocument();
    });
  });

  describe('Back Button', () => {
    it('shows back button when onBack provided', () => {
      render(<OrderDetail order={createOrder()} onBack={jest.fn()} />);
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('does not show back button when onBack not provided', () => {
      render(<OrderDetail order={createOrder()} />);
      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
    });

    it('calls onBack when clicked', () => {
      const handleBack = jest.fn();
      render(<OrderDetail order={createOrder()} onBack={handleBack} />);

      fireEvent.click(screen.getByTestId('back-button'));
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Action Buttons', () => {
    it('shows cancel button for pending orders', () => {
      render(<OrderDetail order={createOrder({ status: 'PENDING' })} onCancel={jest.fn()} />);
      expect(screen.getByTestId('cancel-order-button')).toBeInTheDocument();
    });

    it('shows cancel button for confirmed orders', () => {
      render(<OrderDetail order={createOrder({ status: 'CONFIRMED' })} onCancel={jest.fn()} />);
      expect(screen.getByTestId('cancel-order-button')).toBeInTheDocument();
    });

    it('does not show cancel button for preparing orders', () => {
      render(<OrderDetail order={createOrder({ status: 'PREPARING' })} onCancel={jest.fn()} />);
      expect(screen.queryByTestId('cancel-order-button')).not.toBeInTheDocument();
    });

    it('calls onCancel with order id', () => {
      const handleCancel = jest.fn();
      render(<OrderDetail order={createOrder({ id: 'order-42', status: 'PENDING' })} onCancel={handleCancel} />);

      fireEvent.click(screen.getByTestId('cancel-order-button'));
      expect(handleCancel).toHaveBeenCalledWith('order-42');
    });

    it('shows track button for preparing orders', () => {
      render(<OrderDetail order={createOrder({ status: 'PREPARING' })} onTrack={jest.fn()} />);
      expect(screen.getByTestId('track-order-button')).toBeInTheDocument();
    });

    it('shows track button for out_for_delivery orders', () => {
      render(<OrderDetail order={createOrder({ status: 'OUT_FOR_DELIVERY' })} onTrack={jest.fn()} />);
      expect(screen.getByTestId('track-order-button')).toBeInTheDocument();
    });

    it('does not show track button for pending orders', () => {
      render(<OrderDetail order={createOrder({ status: 'PENDING' })} onTrack={jest.fn()} />);
      expect(screen.queryByTestId('track-order-button')).not.toBeInTheDocument();
    });

    it('calls onTrack with order id', () => {
      const handleTrack = jest.fn();
      render(<OrderDetail order={createOrder({ id: 'order-42', status: 'PREPARING' })} onTrack={handleTrack} />);

      fireEvent.click(screen.getByTestId('track-order-button'));
      expect(handleTrack).toHaveBeenCalledWith('order-42');
    });

    it('does not show cancel button when onCancel not provided', () => {
      render(<OrderDetail order={createOrder({ status: 'PENDING' })} />);
      expect(screen.queryByTestId('cancel-order-button')).not.toBeInTheDocument();
    });

    it('does not show track button when onTrack not provided', () => {
      render(<OrderDetail order={createOrder({ status: 'PREPARING' })} />);
      expect(screen.queryByTestId('track-order-button')).not.toBeInTheDocument();
    });
  });
});
