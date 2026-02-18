import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CTAButton } from '../CTAButton';

/**
 * CTAButton Component Tests
 */

describe('CTAButton Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<CTAButton label="Click me" action="test-action" />);
      expect(screen.getByTestId('cta-button')).toBeInTheDocument();
    });

    it('renders with label text', () => {
      render(<CTAButton label="Order Now" action="order" />);
      expect(screen.getByText('Order Now')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<CTAButton label="Click" action="test" data-testid="my-cta" />);
      expect(screen.getByTestId('my-cta')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies primary variant by default', () => {
      render(<CTAButton label="Click" action="test" />);
      expect(screen.getByTestId('cta-button')).toHaveClass('cta-primary');
    });

    it('applies secondary variant', () => {
      render(<CTAButton label="Click" action="test" variant="secondary" />);
      expect(screen.getByTestId('cta-button')).toHaveClass('cta-secondary');
    });

    it('applies outline variant', () => {
      render(<CTAButton label="Click" action="test" variant="outline" />);
      expect(screen.getByTestId('cta-button')).toHaveClass('cta-outline');
    });
  });

  describe('Click Handling', () => {
    it('calls onClick with action when clicked', () => {
      const handleClick = jest.fn();
      render(<CTAButton label="Order" action="place-order" onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('cta-button'));
      expect(handleClick).toHaveBeenCalledWith('place-order');
    });

    it('calls onClick only once per click', () => {
      const handleClick = jest.fn();
      render(<CTAButton label="Click" action="test" onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('cta-button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<CTAButton label="Click" action="test" onClick={handleClick} disabled />);

      fireEvent.click(screen.getByTestId('cta-button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<CTAButton label="Click" action="test" onClick={handleClick} loading />);

      fireEvent.click(screen.getByTestId('cta-button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not throw when onClick is not provided', () => {
      render(<CTAButton label="Click" action="test" />);
      expect(() => fireEvent.click(screen.getByTestId('cta-button'))).not.toThrow();
    });
  });

  describe('Disabled State', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<CTAButton label="Click" action="test" disabled />);
      expect(screen.getByTestId('cta-button')).toBeDisabled();
    });

    it('is not disabled by default', () => {
      render(<CTAButton label="Click" action="test" />);
      expect(screen.getByTestId('cta-button')).not.toBeDisabled();
    });
  });

  describe('Loading State', () => {
    it('shows Processing... text when loading', () => {
      render(<CTAButton label="Order" action="test" loading />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      expect(screen.queryByText('Order')).not.toBeInTheDocument();
    });

    it('is disabled when loading', () => {
      render(<CTAButton label="Click" action="test" loading />);
      expect(screen.getByTestId('cta-button')).toBeDisabled();
    });

    it('applies cta-loading class when loading', () => {
      render(<CTAButton label="Click" action="test" loading />);
      expect(screen.getByTestId('cta-button')).toHaveClass('cta-loading');
    });

    it('has aria-busy when loading', () => {
      render(<CTAButton label="Click" action="test" loading />);
      expect(screen.getByTestId('cta-button')).toHaveAttribute('aria-busy', 'true');
    });

    it('does not have cta-loading class when not loading', () => {
      render(<CTAButton label="Click" action="test" />);
      expect(screen.getByTestId('cta-button')).not.toHaveClass('cta-loading');
    });
  });
});
