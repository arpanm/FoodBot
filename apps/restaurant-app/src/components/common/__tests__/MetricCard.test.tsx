import { render, screen } from '@testing-library/react';
import React from 'react';

import { MetricCard } from '../MetricCard';

describe('MetricCard', () => {
  it('should render title and value', () => {
    render(<MetricCard title="Revenue" value="$1,234" />);
    expect(screen.getByText('Revenue')).toBeInTheDocument();
    expect(screen.getByText('$1,234')).toBeInTheDocument();
  });

  it('should render numeric values', () => {
    render(<MetricCard title="Orders" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(<MetricCard title="Orders" value={42} subtitle="12 pending" />);
    expect(screen.getByText('12 pending')).toBeInTheDocument();
  });

  it('should render positive trend indicator', () => {
    render(
      <MetricCard
        title="Revenue"
        value="$1,000"
        trend={{ value: 15.5, isPositive: true }}
      />
    );
    expect(screen.getByText('+15.5%')).toBeInTheDocument();
    expect(screen.getByText('vs last period')).toBeInTheDocument();
  });

  it('should render negative trend indicator', () => {
    render(
      <MetricCard
        title="Revenue"
        value="$500"
        trend={{ value: -8.2, isPositive: false }}
      />
    );
    expect(screen.getByText('-8.2%')).toBeInTheDocument();
  });

  it('should render icon when provided', () => {
    render(
      <MetricCard
        title="Test"
        value="123"
        icon={<span data-testid="custom-icon">Icon</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<MetricCard title="Test" value="123" className="custom-class" />);
    expect(screen.getByTestId('metric-card')).toHaveClass('custom-class');
  });
});
