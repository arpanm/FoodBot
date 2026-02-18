import React, { useMemo } from 'react';
import { DishCard } from './DishCard';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Dish } from '../../types/models';

export interface DishListProps {
  dishes: Dish[];
  loading?: boolean;
  onAddToCart?: (dish: Dish) => void;
  onSelectDish?: (id: string) => void;
  category?: string;
  'data-testid'?: string;
}

/**
 * Dish list component with category filtering
 * Uses useMemo to optimize filtering operations
 */
export const DishList: React.FC<DishListProps> = ({
  dishes,
  loading = false,
  onAddToCart,
  onSelectDish,
  category,
  'data-testid': testId,
}) => {
  // Memoize filtered dishes to avoid recalculating on every render
  const filteredDishes = useMemo(() =>
    category
      ? dishes.filter((dish) => dish.category === category)
      : dishes,
    [dishes, category]
  );

  if (loading) {
    return <LoadingSpinner data-testid="dish-list-loading" />;
  }

  if (!filteredDishes.length) {
    return (
      <div className="dish-list-empty" data-testid="dish-list-empty">
        No dishes available
      </div>
    );
  }

  return (
    <div className="dish-list" data-testid={testId || 'dish-list'}>
      {filteredDishes.map((dish) => (
        <DishCard
          key={dish.id}
          dish={dish}
          onAddToCart={onAddToCart}
          onClick={onSelectDish}
        />
      ))}
    </div>
  );
};
