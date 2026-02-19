/**
 * CategoryManagement Page - Manage dish categories: create, edit, reorder, delete
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { LoadingSpinner, ErrorAlert, Modal } from '../../components/common';
import { useRestaurant } from '../../contexts/restaurant-context';
import { menuApi } from '../../services/menu-api';
import { getErrorMessage } from '../../services/api-client';
import type { DishCategory } from '../../types/models';

export const CategoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  const [categories, setCategories] = useState<DishCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!restaurant?.id) {
      return;
    }

    async function fetchCategories(): Promise<void> {
      try {
        const cats = await menuApi.getCategories(restaurant!.id);
        setCategories(cats);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchCategories();
  }, [restaurant?.id]);

  const handleAddCategory = useCallback(async (): Promise<void> => {
    if (!restaurant?.id || !newCategoryName.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const category = await menuApi.createCategory(restaurant.id, {
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim() || undefined,
      });
      setCategories((prev) => [...prev, category]);
      setShowAddModal(false);
      setNewCategoryName('');
      setNewCategoryDescription('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [restaurant?.id, newCategoryName, newCategoryDescription]);

  const handleDeleteCategory = useCallback(
    async (categoryId: string): Promise<void> => {
      if (!restaurant?.id || !confirm('Delete this category?')) {
        return;
      }

      try {
        await menuApi.deleteCategory(restaurant.id, categoryId);
        setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    [restaurant?.id]
  );

  const handleToggleActive = useCallback(
    async (categoryId: string, isActive: boolean): Promise<void> => {
      if (!restaurant?.id) {
        return;
      }

      try {
        await menuApi.updateCategory(restaurant.id, categoryId, { isActive });
        setCategories((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, isActive } : c))
        );
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    [restaurant?.id]
  );

  return (
    <div data-testid="category-management-page">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/menu')} className="text-gray-400 hover:text-gray-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Manage Categories</h1>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="mt-8 flex justify-center py-12"><LoadingSpinner /></div>
      ) : categories.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-gray-500">No categories yet</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-6 py-4 shadow-sm">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{category.name}</h3>
                {category.description && (
                  <p className="text-xs text-gray-500">{category.description}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">{category.dishCount} dish(es)</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={category.isActive}
                    onChange={(e) => handleToggleActive(category.id, e.target.checked)}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-xs text-gray-600">Active</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(category.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Category"
        size="sm"
        footer={
          <>
            <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleAddCategory} disabled={isSubmitting || !newCategoryName.trim()} className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Category Name</label>
            <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="e.g., Appetizers" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={newCategoryDescription} onChange={(e) => setNewCategoryDescription(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
          </div>
        </div>
      </Modal>
    </div>
  );
};
