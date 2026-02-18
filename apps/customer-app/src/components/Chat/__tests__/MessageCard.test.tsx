import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Message } from '../../../types/models';
import { MessageCard } from '../MessageCard';

/**
 * MessageCard Component Tests
 * Tests message card rendering with images, text, attributes, and CTA buttons
 */

const baseMessage: Message = {
  id: 'msg-1',
  sender: 'user',
  content: 'Hello there',
  timestamp: new Date('2024-01-01T10:00:00Z'),
  type: 'text',
};

describe('MessageCard Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<MessageCard message={baseMessage} />);
      expect(screen.getByTestId('message-card')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<MessageCard message={baseMessage} data-testid="custom-msg" />);
      expect(screen.getByTestId('custom-msg')).toBeInTheDocument();
    });

    it('displays message content', () => {
      render(<MessageCard message={baseMessage} />);
      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });

    it('displays message timestamp', () => {
      render(<MessageCard message={baseMessage} />);
      const timeText = new Date('2024-01-01T10:00:00Z').toLocaleTimeString();
      expect(screen.getByText(timeText)).toBeInTheDocument();
    });
  });

  describe('User vs Bot Messages', () => {
    it('applies user styling for user messages', () => {
      render(<MessageCard message={{ ...baseMessage, sender: 'user' }} />);
      const card = screen.getByTestId('message-card');
      expect(card).toHaveClass('message-user');
    });

    it('applies bot styling for bot messages', () => {
      render(<MessageCard message={{ ...baseMessage, sender: 'bot' }} />);
      const card = screen.getByTestId('message-card');
      expect(card).toHaveClass('message-bot');
    });

    it('does not have bot class for user messages', () => {
      render(<MessageCard message={{ ...baseMessage, sender: 'user' }} />);
      const card = screen.getByTestId('message-card');
      expect(card).not.toHaveClass('message-bot');
    });

    it('does not have user class for bot messages', () => {
      render(<MessageCard message={{ ...baseMessage, sender: 'bot' }} />);
      const card = screen.getByTestId('message-card');
      expect(card).not.toHaveClass('message-user');
    });
  });

  describe('Metadata Cards', () => {
    it('renders metadata cards when present', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          cards: [
            {
              id: 'card-1',
              type: 'restaurant',
              title: 'Pizza Palace',
              description: 'Great pizza',
              image: 'https://example.com/pizza.jpg',
              price: 15,
            },
          ],
        },
      };

      render(<MessageCard message={message} />);
      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      expect(screen.getByText('Great pizza')).toBeInTheDocument();
    });

    it('renders card image when provided', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          cards: [
            {
              id: 'card-1',
              type: 'restaurant',
              title: 'Restaurant',
              image: 'https://example.com/image.jpg',
            },
          ],
        },
      };

      render(<MessageCard message={message} />);
      const img = screen.getByAltText('Restaurant');
      expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('renders card price when provided', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          cards: [
            {
              id: 'card-1',
              type: 'dish',
              title: 'Pasta',
              price: 12.99,
            },
          ],
        },
      };

      render(<MessageCard message={message} />);
      expect(screen.getByText('$12.99')).toBeInTheDocument();
    });

    it('does not render cards section when no cards', () => {
      render(<MessageCard message={baseMessage} />);
      expect(screen.queryByText('Pizza Palace')).not.toBeInTheDocument();
    });

    it('renders multiple cards', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          cards: [
            { id: 'card-1', type: 'restaurant', title: 'Restaurant 1' },
            { id: 'card-2', type: 'restaurant', title: 'Restaurant 2' },
            { id: 'card-3', type: 'restaurant', title: 'Restaurant 3' },
          ],
        },
      };

      render(<MessageCard message={message} />);
      expect(screen.getByText('Restaurant 1')).toBeInTheDocument();
      expect(screen.getByText('Restaurant 2')).toBeInTheDocument();
      expect(screen.getByText('Restaurant 3')).toBeInTheDocument();
    });
  });

  describe('Metadata Buttons', () => {
    it('renders buttons when present', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          buttons: [
            {
              id: 'btn-1',
              label: 'Order Now',
              variant: 'primary',
              action: { type: 'callback', payload: {} },
            },
          ],
        },
      };

      render(<MessageCard message={message} />);
      expect(screen.getByText('Order Now')).toBeInTheDocument();
    });

    it('renders multiple buttons', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          buttons: [
            { id: 'btn-1', label: 'Yes', variant: 'primary', action: { type: 'callback', payload: {} } },
            { id: 'btn-2', label: 'No', variant: 'secondary', action: { type: 'callback', payload: {} } },
          ],
        },
      };

      render(<MessageCard message={message} />);
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('applies correct variant classes to buttons', () => {
      const message: Message = {
        ...baseMessage,
        sender: 'bot',
        metadata: {
          buttons: [
            { id: 'btn-1', label: 'Primary', variant: 'primary', action: { type: 'callback', payload: {} } },
          ],
        },
      };

      render(<MessageCard message={message} />);
      const button = screen.getByText('Primary');
      expect(button).toHaveClass('btn-primary');
    });

    it('does not render buttons section when no buttons', () => {
      render(<MessageCard message={baseMessage} />);
      expect(screen.queryByText('Order Now')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles message with empty content', () => {
      render(<MessageCard message={{ ...baseMessage, content: '' }} />);
      expect(screen.getByTestId('message-card')).toBeInTheDocument();
    });

    it('handles message with very long content', () => {
      const longContent = 'A'.repeat(5000);
      render(<MessageCard message={{ ...baseMessage, content: longContent }} />);
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('handles message with special characters', () => {
      render(<MessageCard message={{ ...baseMessage, content: 'Price: $10 & free delivery <today>' }} />);
      expect(screen.getByText('Price: $10 & free delivery <today>')).toBeInTheDocument();
    });
  });
});
