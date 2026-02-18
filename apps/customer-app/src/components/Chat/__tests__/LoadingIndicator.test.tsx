import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingIndicator } from '../LoadingIndicator';

/**
 * LoadingIndicator Component Tests
 */

describe('LoadingIndicator Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<LoadingIndicator />);
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<LoadingIndicator data-testid="my-loader" />);
      expect(screen.getByTestId('my-loader')).toBeInTheDocument();
    });

    it('displays default text', () => {
      render(<LoadingIndicator />);
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    it('displays custom text', () => {
      render(<LoadingIndicator text="Loading restaurants..." />);
      expect(screen.getByText('Loading restaurants...')).toBeInTheDocument();
    });

    it('renders typing dots', () => {
      const { container } = render(<LoadingIndicator />);
      const dots = container.querySelectorAll('.dot');
      expect(dots).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('has role status', () => {
      render(<LoadingIndicator />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label Loading', () => {
      render(<LoadingIndicator />);
      expect(screen.getByTestId('loading-indicator')).toHaveAttribute('aria-label', 'Loading');
    });
  });

  describe('CSS Classes', () => {
    it('has loading-indicator class', () => {
      render(<LoadingIndicator />);
      expect(screen.getByTestId('loading-indicator')).toHaveClass('loading-indicator');
    });
  });
});
