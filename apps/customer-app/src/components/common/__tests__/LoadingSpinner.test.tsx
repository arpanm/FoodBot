import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoadingSpinner } from '../LoadingSpinner';

/**
 * LoadingSpinner Component Tests
 */

describe('LoadingSpinner Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<LoadingSpinner />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<LoadingSpinner data-testid="my-spinner" />);
      expect(screen.getByTestId('my-spinner')).toBeInTheDocument();
    });

    it('renders spinner circle element', () => {
      const { container } = render(<LoadingSpinner />);
      expect(container.querySelector('.spinner-circle')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('applies medium size by default', () => {
      render(<LoadingSpinner />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner-medium');
    });

    it('applies small size', () => {
      render(<LoadingSpinner size="small" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner-small');
    });

    it('applies large size', () => {
      render(<LoadingSpinner size="large" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner-large');
    });
  });

  describe('Colors', () => {
    it('applies primary color by default', () => {
      render(<LoadingSpinner />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner-primary');
    });

    it('applies secondary color', () => {
      render(<LoadingSpinner color="secondary" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner-secondary');
    });

    it('applies inherit color', () => {
      render(<LoadingSpinner color="inherit" />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner-inherit');
    });
  });

  describe('Accessibility', () => {
    it('has role status', () => {
      render(<LoadingSpinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has aria-label Loading', () => {
      render(<LoadingSpinner />);
      expect(screen.getByTestId('loading-spinner')).toHaveAttribute('aria-label', 'Loading');
    });
  });

  describe('CSS Classes', () => {
    it('has base spinner class', () => {
      render(<LoadingSpinner />);
      expect(screen.getByTestId('loading-spinner')).toHaveClass('spinner');
    });

    it('combines size and color classes', () => {
      render(<LoadingSpinner size="large" color="secondary" />);
      const spinner = screen.getByTestId('loading-spinner');
      expect(spinner).toHaveClass('spinner', 'spinner-large', 'spinner-secondary');
    });
  });
});
