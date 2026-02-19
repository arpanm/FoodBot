/**
 * JobResultRenderer Component
 * Renders job results based on job type with appropriate UI
 */

import React from 'react';

import type {
  Job,
  Restaurant,
  Dish,
  SearchRestaurantJobResult,
  SearchDishJobResult,
  RestaurantDetailsJobResult,
} from '../../types/models';
import { DishCard } from '../Dish/DishCard';
import { RestaurantCard } from '../Restaurant/RestaurantCard';

export interface JobResultRendererProps {
  job: Job;
  onRestaurantSelect?: (restaurant: Restaurant) => void;
  onDishSelect?: (dish: Dish) => void;
  'data-testid'?: string;
}

/**
 * JobResultRenderer component renders job results
 */
export const JobResultRenderer: React.FC<JobResultRendererProps> = ({
  job,
  onRestaurantSelect,
  onDishSelect,
  'data-testid': testId,
}) => {
  if (job.status !== 'COMPLETED' || !job.result) {
    return null;
  }

  switch (job.action) {
    case 'search_restaurant':
      return (
        <RestaurantSearchResult
          result={job.result as SearchRestaurantJobResult}
          onSelect={onRestaurantSelect}
          testId={testId}
        />
      );

    case 'search_dish':
      return (
        <DishSearchResult
          result={job.result as SearchDishJobResult}
          onSelect={onDishSelect}
          testId={testId}
        />
      );

    case 'get_restaurant_details':
      return (
        <RestaurantDetailsResult
          result={job.result as RestaurantDetailsJobResult}
          onDishSelect={onDishSelect}
          testId={testId}
        />
      );

    case 'get_menu':
      return (
        <MenuResult
          result={job.result as RestaurantDetailsJobResult}
          onDishSelect={onDishSelect}
          testId={testId}
        />
      );

    default:
      return (
        <GenericResult
          result={job.result}
          testId={testId}
        />
      );
  }
};

/**
 * Restaurant search result component
 */
const RestaurantSearchResult: React.FC<{
  result: SearchRestaurantJobResult;
  onSelect?: (restaurant: Restaurant) => void;
  testId?: string;
}> = ({ result, onSelect, testId }) => {
  if (!result.restaurants || result.restaurants.length === 0) {
    return (
      <div
        className="empty-result p-4 text-center text-gray-500"
        data-testid={`${testId}-empty`}
      >
        No restaurants found. Try adjusting your search criteria.
      </div>
    );
  }

  return (
    <div
      className="restaurant-search-result"
      data-testid={testId || 'restaurant-search-result'}
    >
      <div className="result-header mb-3">
        <h3 className="text-lg font-semibold">
          Found {result.total} restaurants
        </h3>
      </div>

      <div className="result-list space-y-3">
        {result.restaurants.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            onClick={() => onSelect?.(restaurant)}
          />
        ))}
      </div>

      {result.total > result.restaurants.length && (
        <div className="result-footer mt-3 text-center text-sm text-gray-500">
          Showing {result.restaurants.length} of {result.total} results
        </div>
      )}
    </div>
  );
};

/**
 * Dish search result component
 */
const DishSearchResult: React.FC<{
  result: SearchDishJobResult;
  onSelect?: (dish: Dish) => void;
  testId?: string;
}> = ({ result, onSelect, testId }) => {
  if (!result.dishes || result.dishes.length === 0) {
    return (
      <div
        className="empty-result p-4 text-center text-gray-500"
        data-testid={`${testId}-empty`}
      >
        No dishes found. Try adjusting your search criteria.
      </div>
    );
  }

  return (
    <div
      className="dish-search-result"
      data-testid={testId || 'dish-search-result'}
    >
      <div className="result-header mb-3">
        <h3 className="text-lg font-semibold">Found {result.total} dishes</h3>
      </div>

      <div className="result-list grid grid-cols-1 md:grid-cols-2 gap-3">
        {result.dishes.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            onClick={() => onSelect?.(dish)}
          />
        ))}
      </div>

      {result.total > result.dishes.length && (
        <div className="result-footer mt-3 text-center text-sm text-gray-500">
          Showing {result.dishes.length} of {result.total} results
        </div>
      )}
    </div>
  );
};

/**
 * Restaurant details result component
 */
const RestaurantDetailsResult: React.FC<{
  result: RestaurantDetailsJobResult;
  onDishSelect?: (dish: Dish) => void;
  testId?: string;
}> = ({ result, onDishSelect, testId }) => {
  return (
    <div
      className="restaurant-details-result"
      data-testid={testId || 'restaurant-details-result'}
    >
      {/* Restaurant Header */}
      <div className="restaurant-header mb-4">
        <div className="flex items-start space-x-4">
          {result.restaurant.logo && (
            <img
              src={result.restaurant.logo}
              alt={result.restaurant.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-bold">{result.restaurant.name}</h2>
            <p className="text-gray-600 text-sm">
              {result.restaurant.description}
            </p>
            <div className="flex items-center space-x-4 mt-2 text-sm">
              <span className="flex items-center">
                ⭐ {result.restaurant.rating.toFixed(1)} (
                {result.restaurant.reviewCount} reviews)
              </span>
              <span>🕐 {result.restaurant.deliveryTime}</span>
              <span>
                💵 {'$'.repeat(result.restaurant.priceRange)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="restaurant-menu">
        <h3 className="text-lg font-semibold mb-3">Menu</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.menu.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              onClick={() => onDishSelect?.(dish)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Menu result component
 */
const MenuResult: React.FC<{
  result: RestaurantDetailsJobResult;
  onDishSelect?: (dish: Dish) => void;
  testId?: string;
}> = ({ result, onDishSelect, testId }) => {
  if (!result.menu || result.menu.length === 0) {
    return (
      <div
        className="empty-result p-4 text-center text-gray-500"
        data-testid={`${testId}-empty`}
      >
        No menu items available.
      </div>
    );
  }

  return (
    <div
      className="menu-result"
      data-testid={testId || 'menu-result'}
    >
      <div className="result-header mb-3">
        <h3 className="text-lg font-semibold">
          Menu from {result.restaurant.name}
        </h3>
      </div>

      <div className="result-list grid grid-cols-1 md:grid-cols-2 gap-3">
        {result.menu.map((dish) => (
          <DishCard
            key={dish.id}
            dish={dish}
            onClick={() => onDishSelect?.(dish)}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * Generic result component for unknown job types
 */
const GenericResult: React.FC<{
  result: unknown;
  testId?: string;
}> = ({ result, testId }) => {
  return (
    <div
      className="generic-result p-4 bg-gray-50 rounded"
      data-testid={testId || 'generic-result'}
    >
      <h3 className="text-lg font-semibold mb-2">Result</h3>
      <pre className="text-xs overflow-auto max-h-96">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
};
