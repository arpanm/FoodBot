import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { Button } from '../Button';

/**
 * Button Component Tests
 */

describe('Button Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByTestId('button')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(<Button>Test Button</Button>);
      expect(screen.getByText('Test Button')).toBeInTheDocument();
    });

    it('renders with custom test id', () => {
      render(<Button data-testid="custom-button">Click</Button>);
      expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('applies primary variant class', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-primary');
    });

    it('applies secondary variant class', () => {
      render(<Button variant="secondary">Secondary</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-secondary');
    });

    it('applies outline variant class', () => {
      render(<Button variant="outline">Outline</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-outline');
    });

    it('applies text variant class', () => {
      render(<Button variant="text">Text</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-text');
    });

    it('applies small size class', () => {
      render(<Button size="small">Small</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-small');
    });

    it('applies medium size class by default', () => {
      render(<Button>Medium</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-medium');
    });

    it('applies large size class', () => {
      render(<Button size="large">Large</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-large');
    });

    it('applies full width class', () => {
      render(<Button fullWidth>Full Width</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-full-width');
    });

    it('sets button type correctly', () => {
      render(<Button type="submit">Submit</Button>);
      expect(screen.getByTestId('button')).toHaveAttribute('type', 'submit');
    });

    it('defaults to button type', () => {
      render(<Button>Default</Button>);
      expect(screen.getByTestId('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('User Interactions', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('calls onClick multiple times', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByTestId('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('handles undefined onClick gracefully', () => {
      render(<Button>No handler</Button>);
      expect(() => fireEvent.click(screen.getByTestId('button'))).not.toThrow();
    });
  });

  describe('Disabled State', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByTestId('button')).toBeDisabled();
    });

    it('is not disabled by default', () => {
      render(<Button>Enabled</Button>);
      expect(screen.getByTestId('button')).not.toBeDisabled();
    });

    it('has aria-disabled when disabled', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByTestId('button')).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Loading State', () => {
    it('shows loading text when loading', () => {
      render(<Button loading>Click me</Button>);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Click me')).not.toBeInTheDocument();
    });

    it('is disabled when loading', () => {
      render(<Button loading>Click me</Button>);
      expect(screen.getByTestId('button')).toBeDisabled();
    });

    it('applies loading class when loading', () => {
      render(<Button loading>Click me</Button>);
      expect(screen.getByTestId('button')).toHaveClass('btn-loading');
    });

    it('has aria-busy when loading', () => {
      render(<Button loading>Click me</Button>);
      expect(screen.getByTestId('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('does not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} loading>Loading</Button>);

      fireEvent.click(screen.getByTestId('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('is keyboard accessible', () => {
      render(<Button>Accessible</Button>);
      const button = screen.getByTestId('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('has appropriate role', () => {
      render(<Button>Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple class combinations', () => {
      render(<Button variant="primary" size="large" fullWidth loading>Complex</Button>);
      const button = screen.getByTestId('button');
      expect(button).toHaveClass('btn-primary', 'btn-large', 'btn-full-width', 'btn-loading');
    });
  });
});
