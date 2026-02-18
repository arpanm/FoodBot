import React, { useState } from 'react';
import { Button } from '../common/Button';

export interface FilterOptions {
  cuisine?: string[];
  priceRange?: number[];
  rating?: number;
  isOpen?: boolean;
  deliveryTime?: string;
}

export interface FilterPanelProps {
  onFilterChange: (filters: FilterOptions) => void;
  availableCuisines?: string[];
  'data-testid'?: string;
}

/**
 * Filter panel component for restaurant search
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  availableCuisines = [],
  'data-testid': testId,
}) => {
  const [filters, setFilters] = useState<FilterOptions>({});

  const handleCuisineToggle = (cuisine: string) => {
    const currentCuisines = filters.cuisine || [];
    const updated = currentCuisines.includes(cuisine)
      ? currentCuisines.filter((c) => c !== cuisine)
      : [...currentCuisines, cuisine];
    const newFilters = { ...filters, cuisine: updated };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleRatingChange = (rating: number) => {
    const newFilters = { ...filters, rating };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleOpenToggle = () => {
    const newFilters = { ...filters, isOpen: !filters.isOpen };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFilterChange({});
  };

  return (
    <div className="filter-panel" data-testid={testId || 'filter-panel'}>
      <div className="filter-section" data-testid="cuisine-filters">
        <h4>Cuisine</h4>
        {availableCuisines.map((cuisine) => (
          <label key={cuisine} className="filter-option">
            <input
              type="checkbox"
              checked={filters.cuisine?.includes(cuisine) || false}
              onChange={() => handleCuisineToggle(cuisine)}
              data-testid={`filter-cuisine-${cuisine.toLowerCase()}`}
            />
            {cuisine}
          </label>
        ))}
      </div>

      <div className="filter-section" data-testid="rating-filter">
        <h4>Minimum Rating</h4>
        {[3, 3.5, 4, 4.5].map((rating) => (
          <button
            key={rating}
            className={`rating-option ${filters.rating === rating ? 'active' : ''}`}
            onClick={() => handleRatingChange(rating)}
            data-testid={`filter-rating-${rating}`}
          >
            {rating}+
          </button>
        ))}
      </div>

      <div className="filter-section" data-testid="open-filter">
        <label>
          <input
            type="checkbox"
            checked={filters.isOpen || false}
            onChange={handleOpenToggle}
            data-testid="filter-open-now"
          />
          Open Now
        </label>
      </div>

      <Button
        variant="outline"
        size="small"
        onClick={clearFilters}
        data-testid="clear-filters"
      >
        Clear Filters
      </Button>
    </div>
  );
};
