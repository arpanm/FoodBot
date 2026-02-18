import React, { useMemo } from 'react';
import { useAppSelector } from '../../hooks/useRedux';
import { RestaurantCard } from './RestaurantCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { Restaurant } from '../../types/models';

export interface RestaurantListProps {
  restaurants?: Restaurant[];
  onSelectRestaurant?: (id: string) => void;
  'data-testid'?: string;
}

/**
 * Restaurant list component with pagination
 * Uses useMemo to optimize restaurant list processing
 */
export const RestaurantList: React.FC<RestaurantListProps> = ({
  restaurants: propRestaurants,
  onSelectRestaurant,
  'data-testid': testId,
}) => {
  const { restaurants: storeRestaurants, loading, error } = useAppSelector(
    (state) => state.restaurant
  );

  // Memoize the restaurant list to avoid unnecessary recalculations
  const restaurants = useMemo(() =>
    propRestaurants || storeRestaurants,
    [propRestaurants, storeRestaurants]
  );

  if (loading) {
    return <LoadingSpinner data-testid="restaurant-list-loading" />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!restaurants.length) {
    return (
      <div className="restaurant-list-empty" data-testid="restaurant-list-empty">
        No restaurants found
      </div>
    );
  }

  return (
    <div className="restaurant-list" data-testid={testId || 'restaurant-list'}>
      {restaurants.map((restaurant) => (
        <RestaurantCard
          key={restaurant.id}
          restaurant={restaurant}
          onClick={onSelectRestaurant}
        />
      ))}
    </div>
  );
};
