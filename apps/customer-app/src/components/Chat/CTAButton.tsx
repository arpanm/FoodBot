import React from 'react';

export interface CTAButtonProps {
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'outline';
  onClick?: (action: string) => void;
  disabled?: boolean;
  loading?: boolean;
  'data-testid'?: string;
}

/**
 * Call-to-action button component for chat interface
 */
export const CTAButton: React.FC<CTAButtonProps> = ({
  label,
  action,
  variant = 'primary',
  onClick,
  disabled = false,
  loading = false,
  'data-testid': testId,
}) => {
  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick(action);
    }
  };

  return (
    <button
      className={`cta-button cta-${variant} ${loading ? 'cta-loading' : ''}`}
      onClick={handleClick}
      disabled={disabled || loading}
      data-testid={testId || 'cta-button'}
      aria-busy={loading}
    >
      {loading ? 'Processing...' : label}
    </button>
  );
};
