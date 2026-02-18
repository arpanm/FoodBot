import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CartSummary } from '../CartSummary';

/**
 * CartSummary Component Tests
 */

const defaultProps = {
  subtotal: 25.99,
  deliveryFee: 5.99,
  tax: 2.60,
  total: 34.58,
};

describe('CartSummary Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.getByTestId('cart-summary')).toBeInTheDocument();
    });

    it('displays Order Summary heading', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.getByText('Order Summary')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<CartSummary {...defaultProps} data-testid="custom-summary" />);
      expect(screen.getByTestId('custom-summary')).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
    it('displays subtotal', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.getByTestId('summary-subtotal')).toHaveTextContent('$25.99');
    });

    it('displays delivery fee', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.getByTestId('summary-delivery-fee')).toHaveTextContent('$5.99');
    });

    it('displays tax', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.getByTestId('summary-tax')).toHaveTextContent('$2.60');
    });

    it('displays total', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.getByTestId('summary-total')).toHaveTextContent('$34.58');
    });
  });

  describe('Discount', () => {
    it('displays discount when greater than 0', () => {
      render(<CartSummary {...defaultProps} discount={5.00} />);
      expect(screen.getByTestId('summary-discount')).toHaveTextContent('-$5.00');
    });

    it('does not display discount when 0', () => {
      render(<CartSummary {...defaultProps} discount={0} />);
      expect(screen.queryByTestId('summary-discount')).not.toBeInTheDocument();
    });

    it('does not display discount when not provided', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.queryByTestId('summary-discount')).not.toBeInTheDocument();
    });
  });

  describe('Checkout Button', () => {
    it('renders checkout button when onCheckout provided', () => {
      render(<CartSummary {...defaultProps} onCheckout={jest.fn()} />);
      expect(screen.getByTestId('checkout-button')).toBeInTheDocument();
      expect(screen.getByText('Proceed to Checkout')).toBeInTheDocument();
    });

    it('does not render checkout button when onCheckout not provided', () => {
      render(<CartSummary {...defaultProps} />);
      expect(screen.queryByTestId('checkout-button')).not.toBeInTheDocument();
    });

    it('calls onCheckout when clicked', () => {
      const handleCheckout = jest.fn();
      render(<CartSummary {...defaultProps} onCheckout={handleCheckout} />);

      fireEvent.click(screen.getByTestId('checkout-button'));
      expect(handleCheckout).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on checkout button', () => {
      render(<CartSummary {...defaultProps} onCheckout={jest.fn()} loading />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });
});
