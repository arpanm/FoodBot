import React, { useMemo } from 'react';
import { Card } from '../common/Card';
import { Dish } from '../../types/models';

export interface DishCardProps {
  dish: Dish;
  onAddToCart?: (dish: Dish) => void;
  onClick?: (id: string) => void;
  'data-testid'?: string;
}

/**
 * Dish card component displaying dish information
 * Memoized to prevent unnecessary re-renders when props haven't changed
 */
export const DishCard: React.FC<DishCardProps> = React.memo(({
  dish,
  onAddToCart,
  onClick,
  'data-testid': testId,
}) => {
  // Memoize dietary tags calculation
  const dietaryTags = useMemo(() => {
    const tags: string[] = [];
    if (dish.dietary?.isVegetarian) tags.push('Vegetarian');
    if (dish.dietary?.isVegan) tags.push('Vegan');
    if (dish.dietary?.isGlutenFree) tags.push('Gluten Free');
    return tags;
  }, [dish.dietary]);

  return (
    <div
      className={`dish-card ${!dish.isAvailable ? 'unavailable' : ''}`}
      onClick={() => onClick?.(dish.id)}
      data-testid={testId || 'dish-card'}
    >
      <Card variant="outlined">
        {dish.images?.[0] && (
          <img
            src={dish.images[0]}
            alt={dish.name}
            data-testid="dish-image"
          />
        )}
        <h3 data-testid="dish-name">{dish.name}</h3>
        <p data-testid="dish-description">{dish.description}</p>
        <div data-testid="dish-price">${dish.price.toFixed(2)}</div>
        <div data-testid="dish-rating">
          {dish.rating} ({dish.reviewCount} reviews)
        </div>
        {dietaryTags.length > 0 && (
          <div className="dietary-tags" data-testid="dietary-tags">
            {dietaryTags.map((tag) => (
              <span key={tag} className="dietary-tag">
                {tag}
              </span>
            ))}
          </div>
        )}
        {!dish.isAvailable && (
          <span data-testid="unavailable-badge">Unavailable</span>
        )}
        {dish.isAvailable && onAddToCart && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart(dish);
            }}
            data-testid="add-to-cart-button"
          >
            Add to Cart
          </button>
        )}
      </Card>
    </div>
  );
});
