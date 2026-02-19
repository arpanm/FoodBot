/**
 * MetricCard - Displays a key metric with a label, value, and optional trend indicator
 */

import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = React.memo(
  ({ title, value, subtitle, trend, icon, className = '' }) => {
    return (
      <div
        data-testid="metric-card"
        className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
            )}
            {trend && (
              <div className="mt-2 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value.toFixed(1)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';
