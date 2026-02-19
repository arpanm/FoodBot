import React, { useState, useCallback, useMemo } from 'react';

import { Button } from '../common/Button';

export interface SearchFilterValues {
  cuisine?: string[];
  priceRange?: number[];
  minRating?: number;
  dietary?: string[];
  maxDeliveryTime?: number;
  sortBy?: string;
}

export interface SearchFiltersProps {
  onFilterChange: (filters: SearchFilterValues) => void;
  availableCuisines?: string[];
  availableDietary?: string[];
  initialFilters?: SearchFilterValues;
  'data-testid'?: string;
}

const PRICE_RANGE_OPTIONS = [
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
  { value: 4, label: '$$$$' },
];

const RATING_OPTIONS = [3, 3.5, 4, 4.5];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'deliveryTime', label: 'Delivery Time' },
  { value: 'price', label: 'Price' },
  { value: 'distance', label: 'Distance' },
];

const DEFAULT_CUISINES = [
  'Italian', 'Chinese', 'Indian', 'Japanese', 'Mexican',
  'Thai', 'American', 'Mediterranean', 'Korean', 'Vietnamese',
];

const DEFAULT_DIETARY = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free',
];

/**
 * Filter panel for search results.
 * Supports cuisine, price range, rating, dietary restrictions, and sorting.
 */
export const SearchFilters: React.FC<SearchFiltersProps> = React.memo(({
  onFilterChange,
  availableCuisines,
  availableDietary,
  initialFilters = {},
  'data-testid': testId,
}) => {
  const [filters, setFilters] = useState<SearchFilterValues>(initialFilters);

  const cuisines = useMemo(
    () => availableCuisines ?? DEFAULT_CUISINES,
    [availableCuisines]
  );

  const dietaryOptions = useMemo(
    () => availableDietary ?? DEFAULT_DIETARY,
    [availableDietary]
  );

  const updateFilters = useCallback(
    (update: Partial<SearchFilterValues>) => {
      const newFilters = { ...filters, ...update };
      setFilters(newFilters);
      onFilterChange(newFilters);
    },
    [filters, onFilterChange]
  );

  const toggleArrayFilter = useCallback(
    (key: 'cuisine' | 'dietary', value: string) => {
      const current = filters[key] || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateFilters({ [key]: updated.length > 0 ? updated : undefined });
    },
    [filters, updateFilters]
  );

  const togglePriceRange = useCallback(
    (value: number) => {
      const current = filters.priceRange || [];
      const updated = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      updateFilters({ priceRange: updated.length > 0 ? updated : undefined });
    },
    [filters.priceRange, updateFilters]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    onFilterChange({});
  }, [onFilterChange]);

  const hasActiveFilters = useMemo(() => {
    return (
      (filters.cuisine && filters.cuisine.length > 0) ||
      (filters.priceRange && filters.priceRange.length > 0) ||
      filters.minRating !== undefined ||
      (filters.dietary && filters.dietary.length > 0) ||
      filters.maxDeliveryTime !== undefined ||
      filters.sortBy !== undefined
    );
  }, [filters]);

  return (
    <div className="search-filters" data-testid={testId || 'search-filters'}>
      {/* Cuisine Filter */}
      <div className="search-filters__section" data-testid="cuisine-filter-section">
        <h4 className="search-filters__title">Cuisine</h4>
        <div className="search-filters__options">
          {cuisines.map((cuisine) => (
            <label key={cuisine} className="search-filters__checkbox">
              <input
                type="checkbox"
                checked={filters.cuisine?.includes(cuisine) || false}
                onChange={() => toggleArrayFilter('cuisine', cuisine)}
                data-testid={`filter-cuisine-${cuisine.toLowerCase()}`}
              />
              <span>{cuisine}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="search-filters__section" data-testid="price-filter-section">
        <h4 className="search-filters__title">Price Range</h4>
        <div className="search-filters__options search-filters__options--inline">
          {PRICE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              className={`search-filters__chip ${
                filters.priceRange?.includes(option.value)
                  ? 'search-filters__chip--active'
                  : ''
              }`}
              onClick={() => togglePriceRange(option.value)}
              data-testid={`filter-price-${option.value}`}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rating Filter */}
      <div className="search-filters__section" data-testid="rating-filter-section">
        <h4 className="search-filters__title">Minimum Rating</h4>
        <div className="search-filters__options search-filters__options--inline">
          {RATING_OPTIONS.map((rating) => (
            <button
              key={rating}
              className={`search-filters__chip ${
                filters.minRating === rating
                  ? 'search-filters__chip--active'
                  : ''
              }`}
              onClick={() =>
                updateFilters({
                  minRating: filters.minRating === rating ? undefined : rating,
                })
              }
              data-testid={`filter-rating-${rating}`}
              type="button"
            >
              {rating}+
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Filter */}
      <div className="search-filters__section" data-testid="dietary-filter-section">
        <h4 className="search-filters__title">Dietary</h4>
        <div className="search-filters__options">
          {dietaryOptions.map((dietary) => (
            <label key={dietary} className="search-filters__checkbox">
              <input
                type="checkbox"
                checked={filters.dietary?.includes(dietary) || false}
                onChange={() => toggleArrayFilter('dietary', dietary)}
                data-testid={`filter-dietary-${dietary.toLowerCase().replace(/\s+/g, '-')}`}
              />
              <span>{dietary}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sort By */}
      <div className="search-filters__section" data-testid="sort-filter-section">
        <h4 className="search-filters__title">Sort By</h4>
        <select
          className="search-filters__select"
          value={filters.sortBy || 'relevance'}
          onChange={(e) =>
            updateFilters({
              sortBy: e.target.value === 'relevance' ? undefined : e.target.value,
            })
          }
          data-testid="filter-sort"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="small"
          onClick={clearFilters}
          data-testid="clear-search-filters"
        >
          Clear All Filters
        </Button>
      )}
    </div>
  );
});

SearchFilters.displayName = 'SearchFilters';
