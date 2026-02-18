import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { InputField } from '../InputField';

/**
 * InputField Component Tests
 * Tests chat input field with send button, keyboard handling, and validation
 */

describe('InputField Component', () => {
  const mockOnSend = jest.fn();

  beforeEach(() => {
    mockOnSend.mockClear();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<InputField onSend={mockOnSend} />);
      expect(screen.getByTestId('input-field')).toBeInTheDocument();
    });

    it('renders input element', () => {
      render(<InputField onSend={mockOnSend} />);
      expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<InputField onSend={mockOnSend} />);
      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });

    it('renders with default placeholder', () => {
      render(<InputField onSend={mockOnSend} />);
      expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    });

    it('renders with custom placeholder', () => {
      render(<InputField onSend={mockOnSend} placeholder="Ask about food..." />);
      expect(screen.getByPlaceholderText('Ask about food...')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<InputField onSend={mockOnSend} data-testid="custom-input" />);
      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });

    it('has aria-label for accessibility', () => {
      render(<InputField onSend={mockOnSend} />);
      expect(screen.getByLabelText('Chat message input')).toBeInTheDocument();
    });

    it('has aria-label on send button', () => {
      render(<InputField onSend={mockOnSend} />);
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    });
  });

  describe('User Input', () => {
    it('updates value when typing', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'Hello');
      expect(input).toHaveValue('Hello');
    });

    it('handles special characters', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'Price: $10!');
      expect(input).toHaveValue('Price: $10!');
    });
  });

  describe('Sending Messages', () => {
    it('calls onSend with trimmed message on button click', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('send-button');

      await userEvent.type(input, 'Hello bot');
      await userEvent.click(sendButton);

      expect(mockOnSend).toHaveBeenCalledWith('Hello bot');
    });

    it('calls onSend on Enter key press', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'Hello bot{Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Hello bot');
    });

    it('clears input after sending', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('send-button');

      await userEvent.type(input, 'Message');
      await userEvent.click(sendButton);

      expect(input).toHaveValue('');
    });

    it('trims whitespace from message before sending', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, '  Hello  {Enter}');

      expect(mockOnSend).toHaveBeenCalledWith('Hello');
    });

    it('does not send empty messages', async () => {
      render(<InputField onSend={mockOnSend} />);
      const sendButton = screen.getByTestId('send-button');

      await userEvent.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('does not send whitespace-only messages', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, '   ');
      await userEvent.click(screen.getByTestId('send-button'));

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('disables send button when input is empty', () => {
      render(<InputField onSend={mockOnSend} />);
      const sendButton = screen.getByTestId('send-button');
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('send-button');

      await userEvent.type(input, 'Hello');
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Disabled State', () => {
    it('disables input when disabled prop is true', () => {
      render(<InputField onSend={mockOnSend} disabled />);
      expect(screen.getByTestId('chat-input')).toBeDisabled();
    });

    it('disables send button when disabled prop is true', () => {
      render(<InputField onSend={mockOnSend} disabled />);
      expect(screen.getByTestId('send-button')).toBeDisabled();
    });

    it('does not send message when disabled', async () => {
      render(<InputField onSend={mockOnSend} disabled />);
      const sendButton = screen.getByTestId('send-button');

      fireEvent.click(sendButton);

      expect(mockOnSend).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Interaction', () => {
    it('does not send on Shift+Enter', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'Hello');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockOnSend).not.toHaveBeenCalled();
    });

    it('focuses input after sending', async () => {
      render(<InputField onSend={mockOnSend} />);
      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'Hello{Enter}');

      expect(input).toHaveFocus();
    });
  });
});
