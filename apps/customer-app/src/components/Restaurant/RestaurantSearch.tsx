import React, { useState, useEffect, useCallback } from 'react';

import { useDebounce } from '../../hooks/useDebounce';
import { useAppDispatch } from '../../hooks/useRedux';
import { searchRestaurants } from '../../store/slices/restaurantSlice';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export interface RestaurantSearchProps {
  'data-testid'?: string;
}

/**
 * Restaurant search component with filters
 * Uses useCallback to optimize event handlers
 */
export const RestaurantSearch: React.FC<RestaurantSearchProps> = ({
  'data-testid': testId,
}) => {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500);

  useEffect(() => {
    if (debouncedQuery) {
      dispatch(searchRestaurants(debouncedQuery));
    }
  }, [debouncedQuery, dispatch]);

  // Memoize search handler
  const handleSearch = useCallback(() => {
    dispatch(searchRestaurants(query));
  }, [dispatch, query]);

  // Memoize input change handler
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  return (
    <div className="restaurant-search" data-testid={testId || 'restaurant-search'}>
      <Input
        type="search"
        placeholder="Search restaurants..."
        value={query}
        onChange={handleInputChange}
        data-testid="search-input"
        fullWidth
      />
      <Button
        onClick={handleSearch}
        data-testid="search-button"
      >
        Search
      </Button>
    </div>
  );
};
