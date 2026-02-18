import React from 'react';
import { Button } from './Button';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  variant?: 'error' | 'warning' | 'info';
  'data-testid'?: string;
}

/**
 * Error message component with optional retry button
 */
export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  onRetry,
  variant = 'error',
  'data-testid': testId,
}) => {
  const errorClasses = ['error-message', `error-message-${variant}`].join(' ');

  return (
    <div
      className={errorClasses}
      data-testid={testId || 'error-message'}
      role="alert"
    >
      <div className="error-message-content">
        <span className="error-message-text">{message}</span>
      </div>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="small"
          data-testid="error-retry-button"
        >
          Retry
        </Button>
      )}
    </div>
  );
};
