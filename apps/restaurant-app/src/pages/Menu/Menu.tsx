/**
 * Menu Page - Lists all dishes with category filters, search, and availability toggles
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { SearchBar, FilterBar, LoadingSpinner, EmptyState, ErrorAlert } from '../../components/common';
import { DishCard } from '../../components/menu/DishCard';
import { useRestaurant } from '../../contexts/restaurant-context';
import { menuApi } from '../../services/menu-api';
import { getErrorMessage } from '../../services/api-client';
import type { Dish, DishCategory } from '../../types/models';

export const Menu: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDishes = useCallback(async (): Promise<void> => {
    if (!restaurant?.id) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await menuApi.listDishes(restaurant.id, {
        category: selectedCategory === 'all' ? undefined : selectedCategory,
      });
      setDishes(result.dishes);
      setCategories(result.categories);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [restaurant?.id, selectedCategory]);

  useEffect(() => {
    void fetchDishes();
  }, [fetchDishes]);

  const handleToggleAvailability = useCallback(
    async (dishId: string, isAvailable: boolean): Promise<void> => {
      try {
        await menuApi.toggleAvailability(dishId, { isAvailable });
        setDishes((prev) =>
          prev.map((d) => (d.id === dishId ? { ...d, isAvailable } : d))
        );
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    []
  );

  const handleDeleteDish = useCallback(
    async (dishId: string): Promise<void> => {
      if (!confirm('Are you sure you want to delete this dish?')) {
        return;
      }
      try {
        await menuApi.deleteDish(dishId);
        setDishes((prev) => prev.filter((d) => d.id !== dishId));
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    []
  );

  const categoryOptions = [
    { label: 'All', value: 'all', count: dishes.length },
    ...categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      count: cat.dishCount,
    })),
  ];

  const filteredDishes = dishes.filter((dish) => {
    if (!searchQuery) {
      return true;
    }
    const query = searchQuery.toLowerCase();
    return (
      dish.name.toLowerCase().includes(query) ||
      dish.description.toLowerCase().includes(query) ||
      dish.category.toLowerCase().includes(query)
    );
  });

  return (
    <div data-testid="menu-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your dishes, categories, and availability
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/menu/categories')}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Categories
          </button>
          <button
            type="button"
            onClick={() => navigate('/menu/add')}
            data-testid="add-dish-button"
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            Add New Dish
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      <div className="mt-6">
        <SearchBar
          placeholder="Search dishes..."
          onSearch={setSearchQuery}
          className="max-w-md"
        />
      </div>

      <div className="mt-4">
        <FilterBar
          options={categoryOptions}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : filteredDishes.length === 0 ? (
        <EmptyState
          title="No dishes found"
          description={
            searchQuery
              ? 'Try adjusting your search criteria'
              : 'Add your first dish to get started'
          }
          action={
            !searchQuery
              ? { label: 'Add Dish', onClick: () => navigate('/menu/add') }
              : undefined
          }
        />
      ) : (
        <div className="mt-6 space-y-4">
          {filteredDishes.map((dish) => (
            <DishCard
              key={dish.id}
              dish={dish}
              onEdit={(id) => navigate(`/menu/edit/${id}`)}
              onDelete={handleDeleteDish}
              onToggleAvailability={handleToggleAvailability}
            />
          ))}
        </div>
      )}
    </div>
  );
};
