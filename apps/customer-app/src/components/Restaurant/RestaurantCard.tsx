import React from 'react';
import { Restaurant } from '../../types/models';

export interface RestaurantCardProps {
  restaurant: Restaurant;
  onClick?: (id: string) => void;
  'data-testid'?: string;
}

/**
 * Restaurant card component displaying restaurant info
 * Memoized to prevent unnecessary re-renders when props haven't changed
 */
export const RestaurantCard: React.FC<RestaurantCardProps> = React.memo(({
  restaurant,
  onClick,
  'data-testid': testId,
}) => {
  return (
    <div
      className={`restaurant-card ${!restaurant.isOpen ? 'closed' : ''}`}
      onClick={() => onClick?.(restaurant.id)}
      data-testid={testId || 'restaurant-card'}
    >
      <img
        src={restaurant.logo}
        alt={restaurant.name}
        data-testid="restaurant-logo"
      />
      <h3 data-testid="restaurant-name">{restaurant.name}</h3>
      <p data-testid="restaurant-cuisine">{restaurant.cuisine.join(', ')}</p>
      <div data-testid="restaurant-rating">
        Rating: {restaurant.rating} ({restaurant.reviewCount} reviews)
      </div>
      <div data-testid="restaurant-delivery-time">{restaurant.deliveryTime}</div>
      <div data-testid="restaurant-price-range">
        {'$'.repeat(restaurant.priceRange)}
      </div>
      {!restaurant.isOpen && <span data-testid="closed-badge">Closed</span>}
    </div>
  );
});
