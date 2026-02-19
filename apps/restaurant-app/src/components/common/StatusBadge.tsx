/**
 * StatusBadge - Displays a colored badge for order status, payment status, etc.
 */

import React from 'react';

import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from '../../utils/constants';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
  customLabels?: Record<string, string>;
  customColors?: Record<string, string>;
}

const SIZE_CLASSES: Record<string, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(
  ({ status, size = 'md', customLabels, customColors }) => {
    const labels = customLabels ?? ORDER_STATUS_LABELS;
    const colors = customColors ?? ORDER_STATUS_COLORS;

    const label = labels[status] ?? status;
    const colorClasses = colors[status] ?? 'bg-gray-100 text-gray-800';
    const sizeClasses = SIZE_CLASSES[size];

    return (
      <span
        data-testid={`status-badge-${status}`}
        className={`inline-flex items-center rounded-full font-medium ${colorClasses} ${sizeClasses}`}
      >
        {label}
      </span>
    );
  }
);

StatusBadge.displayName = 'StatusBadge';
