import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { Card } from '../Card';

/**
 * Card Component Tests
 */

describe('Card Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).toBeInTheDocument();
    });

    it('renders children', () => {
      render(<Card>Card body content</Card>);
      expect(screen.getByText('Card body content')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<Card data-testid="my-card">Content</Card>);
      expect(screen.getByTestId('my-card')).toBeInTheDocument();
    });

    it('renders header when provided', () => {
      render(<Card data-testid="my-card" header={<span>Header</span>}>Body</Card>);
      expect(screen.getByTestId('my-card-header')).toBeInTheDocument();
      expect(screen.getByText('Header')).toBeInTheDocument();
    });

    it('renders footer when provided', () => {
      render(<Card data-testid="my-card" footer={<span>Footer</span>}>Body</Card>);
      expect(screen.getByTestId('my-card-footer')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });

    it('does not render header when not provided', () => {
      render(<Card data-testid="my-card">Body</Card>);
      expect(screen.queryByTestId('my-card-header')).not.toBeInTheDocument();
    });

    it('does not render footer when not provided', () => {
      render(<Card data-testid="my-card">Body</Card>);
      expect(screen.queryByTestId('my-card-footer')).not.toBeInTheDocument();
    });

    it('renders body section', () => {
      render(<Card data-testid="my-card">Body content</Card>);
      expect(screen.getByTestId('my-card-body')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies outlined variant by default', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-outlined');
    });

    it('applies elevated variant', () => {
      render(<Card variant="elevated">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-elevated');
    });

    it('applies filled variant', () => {
      render(<Card variant="filled">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-filled');
    });
  });

  describe('Padding', () => {
    it('applies medium padding by default', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-medium');
    });

    it('applies none padding', () => {
      render(<Card padding="none">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-none');
    });

    it('applies small padding', () => {
      render(<Card padding="small">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-small');
    });

    it('applies large padding', () => {
      render(<Card padding="large">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-padding-large');
    });
  });

  describe('Clickable Card', () => {
    it('applies clickable class when onClick provided', () => {
      render(<Card onClick={jest.fn()}>Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card-clickable');
    });

    it('does not apply clickable class when not clickable', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).not.toHaveClass('card-clickable');
    });

    it('calls onClick when clicked', () => {
      const handleClick = jest.fn();
      render(<Card onClick={handleClick}>Content</Card>);

      fireEvent.click(screen.getByTestId('card'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('has button role when clickable', () => {
      render(<Card onClick={jest.fn()}>Content</Card>);
      expect(screen.getByTestId('card')).toHaveAttribute('role', 'button');
    });

    it('has tabIndex when clickable', () => {
      render(<Card onClick={jest.fn()}>Content</Card>);
      expect(screen.getByTestId('card')).toHaveAttribute('tabindex', '0');
    });

    it('does not have role when not clickable', () => {
      render(<Card>Content</Card>);
      expect(screen.getByTestId('card')).not.toHaveAttribute('role');
    });
  });
});
