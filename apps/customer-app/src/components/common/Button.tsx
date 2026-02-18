import React, { useMemo } from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  'data-testid'?: string;
}

/**
 * Button component with multiple variants and states
 * Memoized to prevent unnecessary re-renders
 */
export const Button: React.FC<ButtonProps> = React.memo(({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  type = 'button',
  'data-testid': testId,
}) => {
  // Memoize className calculation
  const className = useMemo(() => {
    const baseClasses = 'btn';
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    const fullWidthClass = fullWidth ? 'btn-full-width' : '';
    const loadingClass = loading ? 'btn-loading' : '';

    return [
      baseClasses,
      variantClass,
      sizeClass,
      fullWidthClass,
      loadingClass,
    ]
      .filter(Boolean)
      .join(' ');
  }, [variant, size, fullWidth, loading]);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      data-testid={testId || 'button'}
      aria-busy={loading}
      aria-disabled={disabled || loading}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
});
