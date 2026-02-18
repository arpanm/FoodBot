import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { ErrorMessage } from '../ErrorMessage';

/**
 * ErrorMessage Component Tests
 */

describe('ErrorMessage Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<ErrorMessage message="Something went wrong" />);
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<ErrorMessage message="Error" data-testid="my-error" />);
      expect(screen.getByTestId('my-error')).toBeInTheDocument();
    });

    it('displays error message text', () => {
      render(<ErrorMessage message="Network error occurred" />);
      expect(screen.getByText('Network error occurred')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies error variant by default', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByTestId('error-message')).toHaveClass('error-message-error');
    });

    it('applies warning variant', () => {
      render(<ErrorMessage message="Warning" variant="warning" />);
      expect(screen.getByTestId('error-message')).toHaveClass('error-message-warning');
    });

    it('applies info variant', () => {
      render(<ErrorMessage message="Info" variant="info" />);
      expect(screen.getByTestId('error-message')).toHaveClass('error-message-info');
    });

    it('always has base error-message class', () => {
      render(<ErrorMessage message="Test" variant="warning" />);
      expect(screen.getByTestId('error-message')).toHaveClass('error-message');
    });
  });

  describe('Retry Button', () => {
    it('shows retry button when onRetry is provided', () => {
      render(<ErrorMessage message="Error" onRetry={jest.fn()} />);
      expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('does not show retry button when onRetry is not provided', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.queryByTestId('error-retry-button')).not.toBeInTheDocument();
    });

    it('calls onRetry when retry button is clicked', () => {
      const handleRetry = jest.fn();
      render(<ErrorMessage message="Error" onRetry={handleRetry} />);

      fireEvent.click(screen.getByTestId('error-retry-button'));
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has alert role', () => {
      render(<ErrorMessage message="Error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('alert contains the error message', () => {
      render(<ErrorMessage message="Failed to load data" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Failed to load data');
    });
  });
});
