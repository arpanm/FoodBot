import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'inherit';
  'data-testid'?: string;
}

/**
 * Loading spinner component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = 'primary',
  'data-testid': testId,
}) => {
  const spinnerClasses = ['spinner', `spinner-${size}`, `spinner-${color}`].join(' ');

  return (
    <div
      className={spinnerClasses}
      data-testid={testId || 'loading-spinner'}
      role="status"
      aria-label="Loading"
    >
      <div className="spinner-circle" />
    </div>
  );
};
