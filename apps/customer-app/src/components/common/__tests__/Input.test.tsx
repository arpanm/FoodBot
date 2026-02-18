import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Input } from '../Input';

/**
 * Input Component Tests
 */

describe('Input Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<Input data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toBeInTheDocument();
    });

    it('renders with label', () => {
      render(<Input label="Email" id="email" data-testid="email-input" />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter email" data-testid="email-input" />);
      expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    });

    it('renders with helper text', () => {
      render(<Input helperText="Enter your email" id="email" data-testid="email-input" />);
      expect(screen.getByText('Enter your email')).toBeInTheDocument();
    });

    it('renders required indicator', () => {
      render(<Input label="Email" required data-testid="email-input" />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('renders container with testid suffix', () => {
      render(<Input data-testid="my-input" />);
      expect(screen.getByTestId('my-input-container')).toBeInTheDocument();
    });
  });

  describe('Props Handling', () => {
    it('displays initial value', () => {
      render(<Input value="test@example.com" onChange={() => {}} data-testid="email" />);
      expect(screen.getByTestId('email')).toHaveValue('test@example.com');
    });

    it('applies correct input type', () => {
      render(<Input type="email" data-testid="email" />);
      expect(screen.getByTestId('email')).toHaveAttribute('type', 'email');
    });

    it('applies outlined variant by default', () => {
      render(<Input data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveClass('input-outlined');
    });

    it('applies filled variant', () => {
      render(<Input variant="filled" data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveClass('input-filled');
    });

    it('applies fullWidth class', () => {
      render(<Input fullWidth data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveClass('input-full-width');
    });
  });

  describe('User Interactions', () => {
    it('calls onChange when user types', async () => {
      const handleChange = jest.fn();
      render(<Input onChange={handleChange} data-testid="test-input" />);

      const input = screen.getByTestId('test-input');
      fireEvent.change(input, { target: { value: 'hello' } });

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('Disabled State', () => {
    it('renders as disabled when disabled prop is true', () => {
      render(<Input disabled data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toBeDisabled();
    });

    it('is not disabled by default', () => {
      render(<Input data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).not.toBeDisabled();
    });
  });

  describe('Error State', () => {
    it('displays error message', () => {
      render(<Input error="Email is required" id="email" data-testid="email" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Email is required');
    });

    it('applies error class when error exists', () => {
      render(<Input error="Error" data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveClass('input-error');
    });

    it('sets aria-invalid when error exists', () => {
      render(<Input error="Error" data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveAttribute('aria-invalid', 'true');
    });

    it('hides helper text when error is shown', () => {
      render(<Input error="Error" helperText="Helper" id="test" data-testid="test-input" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    });

    it('shows helper text when no error', () => {
      render(<Input helperText="Helper text" id="test" data-testid="test-input" />);
      expect(screen.getByText('Helper text')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('associates label with input via htmlFor', () => {
      render(<Input label="Email" id="email-input" data-testid="email-input" />);
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email-input');
    });

    it('has aria-describedby for error', () => {
      render(<Input error="Error message" id="test" data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveAttribute('aria-describedby', 'test-error');
    });

    it('has aria-describedby for helper text', () => {
      render(<Input helperText="Helper" id="test" data-testid="test-input" />);
      expect(screen.getByTestId('test-input')).toHaveAttribute('aria-describedby', 'test-helper');
    });

    it('is keyboard accessible', () => {
      render(<Input data-testid="test-input" />);
      const input = screen.getByTestId('test-input');
      input.focus();
      expect(input).toHaveFocus();
    });
  });
});
