import React from 'react';

export interface LoadingIndicatorProps {
  text?: string;
  'data-testid'?: string;
}

/**
 * Loading/typing indicator component for chat
 */
export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  text = 'Thinking...',
  'data-testid': testId,
}) => {
  return (
    <div
      className="loading-indicator"
      data-testid={testId || 'loading-indicator'}
      role="status"
      aria-label="Loading"
    >
      <div className="typing-dots">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
      <span className="loading-text">{text}</span>
    </div>
  );
};
