import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderTracking, OrderTrackingProps } from '../OrderTracking';

/**
 * OrderTracking Component Tests
 */

function createTrackedOrder(overrides: Record<string, any> = {}): OrderTrackingProps['order'] {
  return {
    id: 'order-1',
    orderNumber: 'ORD-001',
    userId: 'user-1',
    restaurantId: 'rest-1',
    restaurantName: 'Pizza Palace',
    items: [
      { dishId: 'dish-1', dishName: 'Pizza', quantity: 1, price: 12.99, customizations: [], subtotal: 12.99 },
    ],
    subtotal: 12.99,
    deliveryFee: 3.99,
    tax: 1.30,
    discount: 0,
    total: 18.28,
    status: 'OUT_FOR_DELIVERY',
    paymentMethod: 'CREDIT_CARD',
    paymentStatus: 'COMPLETED',
    deliveryAddress: { id: 'a1', type: 'home', street: '123 Main St', city: 'SF', state: 'CA', zipCode: '94102', country: 'US', isDefault: true },
    estimatedDeliveryTime: '30-45 min',
    placedAt: new Date('2024-01-15T12:00:00Z'),
    trackingInfo: {
      currentStage: 'out_for_delivery',
      stages: [
        { name: 'confirmed', completed: true, completedAt: new Date('2024-01-15T12:05:00Z') },
        { name: 'preparing', completed: true, completedAt: new Date('2024-01-15T12:10:00Z') },
        { name: 'out_for_delivery', completed: false },
        { name: 'delivered', completed: false },
      ],
      estimatedArrival: new Date('2024-01-15T12:45:00Z').toISOString(),
      driverInfo: {
        name: 'John Driver',
        phone: '555-1234',
        vehicleNumber: 'ABC-123',
      },
    },
    ...overrides,
  } as any;
}

describe('OrderTracking Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.getByTestId('order-tracking')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<OrderTracking order={createTrackedOrder()} data-testid="my-tracking" />);
      expect(screen.getByTestId('my-tracking')).toBeInTheDocument();
    });

    it('displays tracking title', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.getByTestId('tracking-title')).toHaveTextContent('Order Tracking');
    });

    it('displays current tracking status', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.getByTestId('tracking-status')).toBeInTheDocument();
    });
  });

  describe('Unavailable State', () => {
    it('shows unavailable message when order is null', () => {
      render(<OrderTracking order={null} />);
      expect(screen.getByTestId('tracking-unavailable')).toBeInTheDocument();
      expect(screen.getByText('Tracking information is not available')).toBeInTheDocument();
    });

    it('shows unavailable message when order has no trackingInfo', () => {
      const order = createTrackedOrder();
      delete (order as any).trackingInfo;
      render(<OrderTracking order={order} />);
      expect(screen.getByTestId('tracking-unavailable')).toBeInTheDocument();
    });
  });

  describe('Estimated Arrival', () => {
    it('displays estimated arrival when available', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.getByTestId('estimated-arrival')).toBeInTheDocument();
    });
  });

  describe('Driver Info', () => {
    it('displays driver information', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.getByTestId('driver-info')).toBeInTheDocument();
      expect(screen.getByTestId('driver-name')).toHaveTextContent('John Driver');
      expect(screen.getByTestId('driver-phone')).toHaveTextContent('555-1234');
      expect(screen.getByTestId('driver-vehicle')).toHaveTextContent('ABC-123');
    });

    it('does not show driver info when not available', () => {
      const order = createTrackedOrder();
      delete (order as any).trackingInfo.driverInfo;
      render(<OrderTracking order={order} />);
      expect(screen.queryByTestId('driver-info')).not.toBeInTheDocument();
    });
  });

  describe('Refresh', () => {
    it('shows refresh button when onRefresh provided', () => {
      render(<OrderTracking order={createTrackedOrder()} onRefresh={jest.fn()} />);
      expect(screen.getByTestId('refresh-tracking')).toBeInTheDocument();
    });

    it('does not show refresh button when onRefresh not provided', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.queryByTestId('refresh-tracking')).not.toBeInTheDocument();
    });

    it('calls onRefresh when refresh button clicked', () => {
      const handleRefresh = jest.fn();
      render(<OrderTracking order={createTrackedOrder()} onRefresh={handleRefresh} />);

      fireEvent.click(screen.getByTestId('refresh-tracking'));
      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Progress Stepper', () => {
    it('renders progress stepper', () => {
      render(<OrderTracking order={createTrackedOrder()} />);
      expect(screen.getByTestId('progress-stepper')).toBeInTheDocument();
    });
  });
});
