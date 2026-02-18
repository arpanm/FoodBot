import React from 'react';

import type { Restaurant } from '../../types/models';
import { Card } from '../common/Card';

export interface RestaurantDetailProps {
  restaurant: Restaurant | null;
  onBack?: () => void;
  'data-testid'?: string;
}

/**
 * Detailed restaurant view component
 */
export const RestaurantDetail: React.FC<RestaurantDetailProps> = ({
  restaurant,
  onBack,
  'data-testid': testId,
}) => {
  if (!restaurant) {
    return <div data-testid="restaurant-detail-empty">No restaurant selected</div>;
  }

  return (
    <div className="restaurant-detail" data-testid={testId || 'restaurant-detail'}>
      {onBack && (
        <button onClick={onBack} data-testid="back-button">
          Back
        </button>
      )}
      <Card variant="elevated">
        <div className="restaurant-header">
          <img
            src={restaurant.logo}
            alt={restaurant.name}
            data-testid="detail-logo"
          />
          <h2 data-testid="detail-name">{restaurant.name}</h2>
          <p data-testid="detail-description">{restaurant.description}</p>
        </div>
        <div className="restaurant-info">
          <div data-testid="detail-cuisine">
            Cuisine: {restaurant.cuisine?.join(', ')}
          </div>
          <div data-testid="detail-rating">
            Rating: {restaurant.rating} ({restaurant.reviewCount} reviews)
          </div>
          <div data-testid="detail-delivery-time">
            Delivery: {restaurant.deliveryTime}
          </div>
          <div data-testid="detail-delivery-fee">
            Delivery Fee: ${restaurant.deliveryFee}
          </div>
          <div data-testid="detail-minimum-order">
            Minimum Order: ${restaurant.minimumOrder}
          </div>
          <div data-testid="detail-status">
            {restaurant.isOpen ? 'Open' : 'Closed'}
          </div>
        </div>
        {restaurant.tags && (
          <div className="restaurant-tags" data-testid="detail-tags">
            {restaurant.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
