import React, { useCallback, useMemo } from 'react';

import type { Restaurant, Dish } from '../../types/models';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface SearchResultsProps {
  restaurants?: Restaurant[];
  dishes?: Dish[];
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
  queryTimeMs?: number;
  loading?: boolean;
  error?: string | null;
  onPageChange: (page: number) => void;
  onRestaurantClick?: (restaurant: Restaurant) => void;
  onDishClick?: (dish: Dish) => void;
  'data-testid'?: string;
}

/**
 * Search results display component with pagination.
 * Renders restaurant and/or dish results based on search response.
 */
export const SearchResults: React.FC<SearchResultsProps> = React.memo(({
  restaurants,
  dishes,
  totalResults,
  page,
  pageSize,
  totalPages,
  queryTimeMs,
  loading = false,
  error = null,
  onPageChange,
  onRestaurantClick,
  onDishClick,
  'data-testid': testId,
}) => {
  const handlePrevPage = useCallback(() => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  }, [page, onPageChange]);

  const handleNextPage = useCallback(() => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  }, [page, totalPages, onPageChange]);

  const resultSummary = useMemo(() => {
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, totalResults);
    const timeText = queryTimeMs !== undefined ? ` (${queryTimeMs}ms)` : '';
    return `Showing ${start}-${end} of ${totalResults} results${timeText}`;
  }, [page, pageSize, totalResults, queryTimeMs]);

  if (loading) {
    return (
      <div className="search-results search-results--loading" data-testid="search-results-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="search-results search-results--error" data-testid="search-results-error">
        <p className="search-results__error-message">{error}</p>
      </div>
    );
  }

  if (totalResults === 0) {
    return (
      <div className="search-results search-results--empty" data-testid="search-results-empty">
        <p className="search-results__empty-message">
          No results found. Try adjusting your search or filters.
        </p>
      </div>
    );
  }

  return (
    <div className="search-results" data-testid={testId || 'search-results'}>
      <div className="search-results__summary" data-testid="search-results-summary">
        <span>{resultSummary}</span>
      </div>

      {/* Restaurant Results */}
      {restaurants && restaurants.length > 0 && (
        <div className="search-results__section" data-testid="restaurant-results">
          <h3 className="search-results__section-title">Restaurants</h3>
          <div className="search-results__grid">
            {restaurants.map((restaurant) => (
              <Card
                key={restaurant.id}
                variant="elevated"
                padding="medium"
                onClick={() => onRestaurantClick?.(restaurant)}
                data-testid={`restaurant-result-${restaurant.id}`}
              >
                <div className="search-results__restaurant">
                  <h4 className="search-results__name">{restaurant.name}</h4>
                  <p className="search-results__description">
                    {restaurant.description}
                  </p>
                  <div className="search-results__meta">
                    <span className="search-results__rating">
                      {restaurant.rating.toFixed(1)}
                    </span>
                    <span className="search-results__cuisine">
                      {restaurant.cuisine.join(', ')}
                    </span>
                    <span className="search-results__delivery-time">
                      {restaurant.deliveryTime}
                    </span>
                  </div>
                  <div className="search-results__tags">
                    {restaurant.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="search-results__tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Dish Results */}
      {dishes && dishes.length > 0 && (
        <div className="search-results__section" data-testid="dish-results">
          <h3 className="search-results__section-title">Dishes</h3>
          <div className="search-results__grid">
            {dishes.map((dish) => (
              <Card
                key={dish.id}
                variant="elevated"
                padding="medium"
                onClick={() => onDishClick?.(dish)}
                data-testid={`dish-result-${dish.id}`}
              >
                <div className="search-results__dish">
                  <h4 className="search-results__name">{dish.name}</h4>
                  <p className="search-results__description">
                    {dish.description}
                  </p>
                  <div className="search-results__meta">
                    <span className="search-results__price">
                      ${dish.price.toFixed(2)}
                    </span>
                    <span className="search-results__rating">
                      {dish.rating.toFixed(1)}
                    </span>
                    <span className="search-results__category">
                      {dish.category}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="search-results__pagination" data-testid="search-pagination">
          <Button
            variant="outline"
            size="small"
            onClick={handlePrevPage}
            disabled={page <= 1}
            data-testid="pagination-prev"
          >
            Previous
          </Button>
          <span className="search-results__page-info" data-testid="pagination-info">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="small"
            onClick={handleNextPage}
            disabled={page >= totalPages}
            data-testid="pagination-next"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
});

SearchResults.displayName = 'SearchResults';
