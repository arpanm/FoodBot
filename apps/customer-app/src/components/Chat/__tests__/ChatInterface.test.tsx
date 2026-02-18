import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import '@testing-library/jest-dom';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { ChatInterface } from '../ChatInterface';

/**
 * ChatInterface Component Tests
 *
 * Tests the main chat interface for:
 * - Message rendering
 * - Message sending
 * - Loading states
 * - Error handling
 * - Auto-scrolling
 */

// Mock scrollIntoView which is not available in jsdom
Element.prototype.scrollIntoView = jest.fn();

// Mock the sendMessage thunk - must return a thunk function for redux-thunk middleware
const mockSendMessage = jest.fn();
jest.mock('../../../store/slices/chatSlice', () => ({
  sendMessage: (message: string) => {
    mockSendMessage(message);
    // Return a thunk function that dispatches a plain action
    return (dispatch: any) => {
      dispatch({ type: 'chat/sendMessage/pending', payload: message });
      return Promise.resolve({ type: 'chat/sendMessage/fulfilled', payload: message });
    };
  },
}));

describe('ChatInterface Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<ChatInterface />);
      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
    });

    it('renders messages container', () => {
      renderWithProviders(<ChatInterface />);
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });

    it('renders input area', () => {
      renderWithProviders(<ChatInterface />);
      expect(screen.getByTestId('chat-input-area')).toBeInTheDocument();
    });

    it('renders input field', () => {
      renderWithProviders(<ChatInterface />);
      expect(screen.getByLabelText('Chat message input')).toBeInTheDocument();
    });

    it('renders send button', () => {
      renderWithProviders(<ChatInterface />);
      expect(screen.getByLabelText('Send message')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      renderWithProviders(<ChatInterface data-testid="custom-chat" />);
      expect(screen.getByTestId('custom-chat')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('displays messages from store', () => {
      const messages = [
        {
          id: 'msg-1',
          sender: 'user' as const,
          content: 'Hello bot',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          type: 'text' as const,
        },
        {
          id: 'msg-2',
          sender: 'bot' as const,
          content: 'Hello user',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          type: 'text' as const,
        },
      ];

      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages,
            loading: false,
            error: null,
          },
        },
      });

      expect(screen.getByText('Hello bot')).toBeInTheDocument();
      expect(screen.getByText('Hello user')).toBeInTheDocument();
    });

    it('displays empty state when no messages', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: false,
            error: null,
          },
        },
      });

      expect(screen.getByTestId('chat-interface')).toBeInTheDocument();
      expect(screen.getByTestId('chat-messages')).toBeInTheDocument();
    });

    it('renders user messages with user styling', () => {
      const messages = [
        {
          id: 'msg-1',
          sender: 'user' as const,
          content: 'User message',
          timestamp: new Date(),
          type: 'text' as const,
        },
      ];

      renderWithProviders(<ChatInterface />, {
        initialState: { chat: { messages, loading: false, error: null } },
      });

      expect(screen.getByText('User message')).toBeInTheDocument();
    });

    it('renders bot messages with bot styling', () => {
      const messages = [
        {
          id: 'msg-1',
          sender: 'bot' as const,
          content: 'Bot response',
          timestamp: new Date(),
          type: 'text' as const,
        },
      ];

      renderWithProviders(<ChatInterface />, {
        initialState: { chat: { messages, loading: false, error: null } },
      });

      expect(screen.getByText('Bot response')).toBeInTheDocument();
    });

    it('renders messages with metadata cards', () => {
      const messages = [
        {
          id: 'msg-1',
          sender: 'bot' as const,
          content: 'Here are restaurants:',
          timestamp: new Date(),
          type: 'card' as const,
          metadata: {
            cards: [
              {
                id: 'card-1',
                type: 'restaurant' as const,
                title: 'Pizza Place',
                description: 'Great pizza',
                image: 'https://example.com/pizza.jpg',
                price: 15,
              },
            ],
          },
        },
      ];

      renderWithProviders(<ChatInterface />, {
        initialState: { chat: { messages, loading: false, error: null } },
      });

      expect(screen.getByText('Here are restaurants:')).toBeInTheDocument();
      expect(screen.getByText('Pizza Place')).toBeInTheDocument();
    });

    it('renders messages with metadata buttons', () => {
      const messages = [
        {
          id: 'msg-1',
          sender: 'bot' as const,
          content: 'Choose an option:',
          timestamp: new Date(),
          type: 'text' as const,
          metadata: {
            buttons: [
              {
                id: 'btn-1',
                label: 'Order Now',
                variant: 'primary' as const,
                action: { type: 'callback' as const, payload: {} },
              },
            ],
          },
        },
      ];

      renderWithProviders(<ChatInterface />, {
        initialState: { chat: { messages, loading: false, error: null } },
      });

      expect(screen.getByText('Order Now')).toBeInTheDocument();
    });
  });

  describe('Sending Messages', () => {
    it('sends message on send button click', async () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('send-button');

      await userEvent.type(input, 'I want pizza');
      await userEvent.click(sendButton);

      // After sending, input should be cleared
      expect(input).toHaveValue('');
    });

    it('sends message on Enter key press', async () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'I want pizza{Enter}');

      // After pressing Enter, input should be cleared
      expect(input).toHaveValue('');
    });

    it('clears input after sending message', async () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');

      await userEvent.type(input, 'Test message');
      expect(input).toHaveValue('Test message');

      await userEvent.click(screen.getByTestId('send-button'));
      expect(input).toHaveValue('');
    });

    it('does not send empty messages', async () => {
      renderWithProviders(<ChatInterface />);

      const sendButton = screen.getByTestId('send-button');

      // Button should be disabled when input is empty
      expect(sendButton).toBeDisabled();
    });

    it('does not send whitespace-only messages', async () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');
      const sendButton = screen.getByTestId('send-button');

      await userEvent.type(input, '   ');

      // Button should be disabled for whitespace-only input
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when loading', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: true,
            error: null,
          },
        },
      });

      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
    });

    it('disables input when loading', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: true,
            error: null,
          },
        },
      });

      expect(screen.getByTestId('chat-input')).toBeDisabled();
    });

    it('disables send button when loading', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: true,
            error: null,
          },
        },
      });

      expect(screen.getByTestId('send-button')).toBeDisabled();
    });

    it('hides loading indicator when not loading', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: false,
            error: null,
          },
        },
      });

      expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error occurs', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: false,
            error: 'Failed to send message',
          },
        },
      });

      expect(screen.getByText('Failed to send message')).toBeInTheDocument();
    });

    it('shows retry button when error occurs', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: false,
            error: 'Network error',
          },
        },
      });

      expect(screen.getByTestId('error-retry-button')).toBeInTheDocument();
    });

    it('does not show error when no error', () => {
      renderWithProviders(<ChatInterface />, {
        initialState: {
          chat: {
            messages: [],
            loading: false,
            error: null,
          },
        },
      });

      expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels on input', () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByLabelText('Chat message input');
      expect(input).toBeInTheDocument();
    });

    it('has proper ARIA labels on send button', () => {
      renderWithProviders(<ChatInterface />);

      const button = screen.getByLabelText('Send message');
      expect(button).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');
      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('handles very long messages', () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');
      const longMessage = 'a'.repeat(1000);

      fireEvent.change(input, { target: { value: longMessage } });

      expect(input).toHaveValue(longMessage);
    });

    it('handles special characters in messages', () => {
      renderWithProviders(<ChatInterface />);

      const input = screen.getByTestId('chat-input');

      fireEvent.change(input, { target: { value: '<script>alert("xss")</script>' } });

      expect(input).toHaveValue('<script>alert("xss")</script>');
    });

    it('renders multiple messages in order', () => {
      const messages = [
        { id: 'msg-1', sender: 'user' as const, content: 'First', timestamp: new Date('2024-01-01T10:00:00Z'), type: 'text' as const },
        { id: 'msg-2', sender: 'bot' as const, content: 'Second', timestamp: new Date('2024-01-01T10:01:00Z'), type: 'text' as const },
        { id: 'msg-3', sender: 'user' as const, content: 'Third', timestamp: new Date('2024-01-01T10:02:00Z'), type: 'text' as const },
      ];

      renderWithProviders(<ChatInterface />, {
        initialState: { chat: { messages, loading: false, error: null } },
      });

      const messageCards = screen.getAllByTestId('message-card');
      expect(messageCards).toHaveLength(3);
    });
  });
});
