import React, { useMemo } from 'react';
import { Card } from '../common/Card';
import { Message } from '../../types/models';

export interface MessageCardProps {
  message: Message;
  'data-testid'?: string;
}

/**
 * Message card component for displaying chat messages
 * Memoized to prevent unnecessary re-renders when props haven't changed
 */
export const MessageCard: React.FC<MessageCardProps> = React.memo(({
  message,
  'data-testid': testId,
}) => {
  const isUser = message.sender === 'user';

  // Memoize formatted time
  const formattedTime = useMemo(() =>
    new Date(message.timestamp).toLocaleTimeString(),
    [message.timestamp]
  );

  return (
    <div
      className={`message-card ${isUser ? 'message-user' : 'message-bot'}`}
      data-testid={testId || 'message-card'}
    >
      <Card variant={isUser ? 'filled' : 'elevated'}>
        <div className="message-content">
          <span className="message-text">{message.content}</span>
          <span className="message-time">
            {formattedTime}
          </span>
        </div>

        {message.metadata?.cards && (
          <div className="message-cards">
            {message.metadata.cards.map((card) => (
              <Card key={card.id} variant="outlined">
                {card.image && (
                  <img src={card.image} alt={card.title} className="card-image" />
                )}
                <h4>{card.title}</h4>
                <p>{card.description}</p>
                {card.price && <span className="card-price">${card.price}</span>}
              </Card>
            ))}
          </div>
        )}

        {message.metadata?.buttons && (
          <div className="message-buttons">
            {message.metadata.buttons.map((button) => (
              <button key={button.id} className={`btn btn-${button.variant}`}>
                {button.label}
              </button>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
});
