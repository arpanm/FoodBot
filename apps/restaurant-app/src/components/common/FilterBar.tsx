/**
 * FilterBar - Horizontal filter chips for order status, dish categories, etc.
 */

import React from 'react';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface FilterBarProps {
  options: FilterOption[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = React.memo(
  ({ options, selected, onSelect, className = '' }) => {
    return (
      <div
        data-testid="filter-bar"
        className={`flex flex-wrap gap-2 ${className}`}
      >
        {options.map((option) => {
          const isActive = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelect(option.value)}
              data-testid={`filter-${option.value}`}
              className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {option.label}
              {option.count !== undefined && (
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                    isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }
);

FilterBar.displayName = 'FilterBar';
