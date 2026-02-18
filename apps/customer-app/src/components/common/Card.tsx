import React, { useMemo } from 'react';

export interface CardProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'outlined' | 'elevated' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onClick?: () => void;
  'data-testid'?: string;
}

/**
 * Card component for displaying content in a contained format
 * Memoized to prevent unnecessary re-renders
 */
export const Card: React.FC<CardProps> = React.memo(({
  children,
  header,
  footer,
  variant = 'outlined',
  padding = 'medium',
  onClick,
  'data-testid': testId,
}) => {
  // Memoize className calculation
  const cardClasses = useMemo(() =>
    [
      'card',
      `card-${variant}`,
      `card-padding-${padding}`,
      onClick ? 'card-clickable' : '',
    ]
      .filter(Boolean)
      .join(' '),
    [variant, padding, onClick]
  );

  return (
    <div
      className={cardClasses}
      onClick={onClick}
      data-testid={testId || 'card'}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {header && (
        <div className="card-header" data-testid={`${testId}-header`}>
          {header}
        </div>
      )}
      <div className="card-body" data-testid={`${testId}-body`}>
        {children}
      </div>
      {footer && (
        <div className="card-footer" data-testid={`${testId}-footer`}>
          {footer}
        </div>
      )}
    </div>
  );
});
