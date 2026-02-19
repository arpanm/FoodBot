/**
 * DishCard - Displays a dish with toggle, edit, and delete actions
 */

import React, { useCallback } from 'react';

import type { Dish } from '../../types/models';
import { formatCurrency } from '../../utils/format';

interface DishCardProps {
  dish: Dish;
  onEdit?: (dishId: string) => void;
  onDelete?: (dishId: string) => void;
  onToggleAvailability?: (dishId: string, isAvailable: boolean) => void;
}

export const DishCard: React.FC<DishCardProps> = React.memo(
  ({ dish, onEdit, onDelete, onToggleAvailability }) => {
    const handleToggle = useCallback((): void => {
      onToggleAvailability?.(dish.id, !dish.isAvailable);
    }, [dish.id, dish.isAvailable, onToggleAvailability]);

    const handleEdit = useCallback((): void => {
      onEdit?.(dish.id);
    }, [dish.id, onEdit]);

    const handleDelete = useCallback((): void => {
      onDelete?.(dish.id);
    }, [dish.id, onDelete]);

    const dietaryTags = [];
    if (dish.dietary.isVegetarian) dietaryTags.push('Veg');
    if (dish.dietary.isVegan) dietaryTags.push('Vegan');
    if (dish.dietary.isGlutenFree) dietaryTags.push('GF');
    if (dish.dietary.isHalal) dietaryTags.push('Halal');

    return (
      <div
        data-testid={`dish-card-${dish.id}`}
        className={`rounded-lg border bg-white shadow-sm transition-all ${
          dish.isAvailable ? 'border-gray-200' : 'border-gray-200 opacity-60'
        }`}
      >
        <div className="flex">
          {dish.images.length > 0 && (
            <div className="h-32 w-32 flex-shrink-0 overflow-hidden rounded-l-lg">
              <img
                src={dish.images[0]}
                alt={dish.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-between p-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{dish.name}</h3>
                  <p className="mt-0.5 text-xs text-gray-500">{dish.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-base font-bold text-gray-900">
                    {formatCurrency(dish.price)}
                  </p>
                  {dish.discountedPrice && dish.discountedPrice < dish.price && (
                    <p className="text-xs text-gray-400 line-through">
                      {formatCurrency(dish.price)}
                    </p>
                  )}
                </div>
              </div>
              <p className="mt-1 line-clamp-2 text-sm text-gray-600">{dish.description}</p>
              {dietaryTags.length > 0 && (
                <div className="mt-2 flex gap-1">
                  {dietaryTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={dish.isAvailable}
                    onChange={handleToggle}
                    data-testid="dish-availability-toggle"
                    className="sr-only"
                  />
                  <div
                    className={`h-5 w-9 rounded-full transition-colors ${
                      dish.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                        dish.isAvailable ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
                <span className="text-xs text-gray-600">
                  {dish.isAvailable ? 'Available' : 'Unavailable'}
                </span>
              </label>
              <div className="ml-auto flex gap-1">
                <button
                  type="button"
                  onClick={handleEdit}
                  data-testid="dish-edit"
                  className="rounded px-3 py-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  data-testid="dish-delete"
                  className="rounded px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DishCard.displayName = 'DishCard';
