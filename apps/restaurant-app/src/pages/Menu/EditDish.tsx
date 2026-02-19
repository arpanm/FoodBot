/**
 * EditDish Page - Update an existing dish
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { ErrorAlert, LoadingSpinner } from '../../components/common';
import { menuApi } from '../../services/menu-api';
import { getErrorMessage } from '../../services/api-client';
import type { Dish } from '../../types/models';
import { validateDishForm } from '../../utils/validation';

export const EditDish: React.FC = () => {
  const navigate = useNavigate();
  const { dishId } = useParams<{ dishId: string }>();

  const [dish, setDish] = useState<Dish | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    preparationTime: 15,
    spiceLevel: 0,
    isAvailable: true,
    tags: '',
  });

  useEffect(() => {
    if (!dishId) {
      return;
    }

    async function fetchDish(): Promise<void> {
      try {
        const fetchedDish = await menuApi.getDishById(dishId!);
        setDish(fetchedDish);
        setForm({
          name: fetchedDish.name,
          description: fetchedDish.description,
          price: fetchedDish.price,
          category: fetchedDish.category,
          preparationTime: fetchedDish.preparationTime,
          spiceLevel: fetchedDish.spiceLevel ?? 0,
          isAvailable: fetchedDish.isAvailable,
          tags: fetchedDish.tags.join(', '),
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    void fetchDish();
  }, [dishId]);

  const handleChange = useCallback(
    (field: string) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const value =
          event.target.type === 'checkbox'
            ? (event.target as HTMLInputElement).checked
            : event.target.type === 'number'
              ? Number(event.target.value)
              : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
      },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent): Promise<void> => {
      event.preventDefault();

      const validation = validateDishForm({
        name: form.name,
        description: form.description,
        price: form.price,
        category: form.category,
        preparationTime: form.preparationTime,
      });

      if (!validation.isValid) {
        setFormErrors(validation.errors);
        return;
      }

      if (!dishId) {
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await menuApi.updateDish(dishId, {
          name: form.name,
          description: form.description,
          price: form.price,
          category: form.category,
          preparationTime: form.preparationTime,
          spiceLevel: form.spiceLevel || undefined,
          isAvailable: form.isAvailable,
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        });
        navigate('/menu');
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, dishId, navigate]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!dish) {
    return (
      <ErrorAlert message="Dish not found" onRetry={() => navigate('/menu')} />
    );
  }

  return (
    <div data-testid="edit-dish-page">
      <div className="flex items-center gap-4">
        <button type="button" onClick={() => navigate('/menu')} className="text-gray-400 hover:text-gray-600">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Edit: {dish.name}</h1>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      <form onSubmit={handleSubmit} className="mt-6" data-testid="edit-dish-form">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Dish Name</label>
              <input type="text" value={form.name} onChange={handleChange('name')} className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm ${formErrors.name ? 'border-red-300' : 'border-gray-300'}`} />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea value={form.description} onChange={handleChange('description')} rows={3} className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm ${formErrors.description ? 'border-red-300' : 'border-gray-300'}`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price ($)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={handleChange('price')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input type="text" value={form.category} onChange={handleChange('category')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preparation Time (min)</label>
              <input type="number" min="1" value={form.preparationTime} onChange={handleChange('preparationTime')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <input type="text" value={form.tags} onChange={handleChange('tags')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.isAvailable} onChange={handleChange('isAvailable')} className="rounded border-gray-300 text-primary-600" />
              <span className="text-sm font-medium text-gray-700">Available for ordering</span>
            </label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/menu')} className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
