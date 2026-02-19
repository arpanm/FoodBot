import { render, screen } from '@testing-library/react';
import React from 'react';

import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  it('should render the correct label for a known status', () => {
    render(<StatusBadge status="PENDING" />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should render the status string when no label is found', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
  });

  it('should apply the correct data-testid', () => {
    render(<StatusBadge status="CONFIRMED" />);
    expect(screen.getByTestId('status-badge-CONFIRMED')).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<StatusBadge status="PENDING" size="sm" />);
    expect(screen.getByTestId('status-badge-PENDING')).toHaveClass('text-xs');

    rerender(<StatusBadge status="PENDING" size="lg" />);
    expect(screen.getByTestId('status-badge-PENDING')).toHaveClass('text-base');
  });

  it('should support custom labels and colors', () => {
    const customLabels = { CUSTOM: 'My Custom Status' };
    const customColors = { CUSTOM: 'bg-pink-100 text-pink-800' };

    render(
      <StatusBadge status="CUSTOM" customLabels={customLabels} customColors={customColors} />
    );
    expect(screen.getByText('My Custom Status')).toBeInTheDocument();
  });

  it('should render all known order statuses', () => {
    const statuses = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'REFUNDED',
    ];

    statuses.forEach((status) => {
      const { unmount } = render(<StatusBadge status={status} />);
      expect(screen.getByTestId(`status-badge-${status}`)).toBeInTheDocument();
      unmount();
    });
  });
});
