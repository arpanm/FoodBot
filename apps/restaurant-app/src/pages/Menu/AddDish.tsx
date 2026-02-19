/**
 * AddDish Page - Create a new dish with full form, customizations, dietary info
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { ErrorAlert, LoadingSpinner } from '../../components/common';
import { useRestaurant } from '../../contexts/restaurant-context';
import { menuApi } from '../../services/menu-api';
import { getErrorMessage } from '../../services/api-client';
import { validateDishForm } from '../../utils/validation';

interface DishFormState {
  name: string;
  description: string;
  price: number;
  discountedPrice: number;
  category: string;
  preparationTime: number;
  spiceLevel: number;
  isAvailable: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isHalal: boolean;
  isKosher: boolean;
  ingredients: string;
  allergens: string;
  tags: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

const DEFAULT_FORM: DishFormState = {
  name: '',
  description: '',
  price: 0,
  discountedPrice: 0,
  category: '',
  preparationTime: 15,
  spiceLevel: 0,
  isAvailable: true,
  isVegetarian: false,
  isVegan: false,
  isGlutenFree: false,
  isDairyFree: false,
  isNutFree: false,
  isHalal: false,
  isKosher: false,
  ingredients: '',
  allergens: '',
  tags: '',
  calories: 0,
  protein: 0,
  carbohydrates: 0,
  fat: 0,
};

export const AddDish: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant } = useRestaurant();

  const [form, setForm] = useState<DishFormState>(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = useCallback(
    (field: keyof DishFormState) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        const value =
          event.target.type === 'checkbox'
            ? (event.target as HTMLInputElement).checked
            : event.target.type === 'number'
              ? Number(event.target.value)
              : event.target.value;
        setForm((prev) => ({ ...prev, [field]: value }));
        setFormErrors((prev) => ({ ...prev, [field]: '' }));
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

      if (!restaurant?.id) {
        setError('Restaurant not found');
        return;
      }

      setIsSubmitting(true);
      setError(null);

      try {
        await menuApi.createDish({
          restaurantId: restaurant.id,
          name: form.name,
          description: form.description,
          price: form.price,
          discountedPrice: form.discountedPrice || undefined,
          category: form.category,
          preparationTime: form.preparationTime,
          spiceLevel: form.spiceLevel || undefined,
          isAvailable: form.isAvailable,
          dietary: {
            isVegetarian: form.isVegetarian,
            isVegan: form.isVegan,
            isGlutenFree: form.isGlutenFree,
            isDairyFree: form.isDairyFree,
            isNutFree: form.isNutFree,
            isHalal: form.isHalal,
            isKosher: form.isKosher,
          },
          ingredients: form.ingredients
            .split(',')
            .map((i) => i.trim())
            .filter(Boolean),
          allergens: form.allergens
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
          tags: form.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
          nutritionalInfo: {
            calories: form.calories,
            protein: form.protein,
            carbohydrates: form.carbohydrates,
            fat: form.fat,
          },
        });
        navigate('/menu');
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, restaurant?.id, navigate]
  );

  return (
    <div data-testid="add-dish-page">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/menu')}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Add New Dish</h1>
      </div>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      <form onSubmit={handleSubmit} className="mt-6" data-testid="add-dish-form">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Dish Name</label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${formErrors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
              />
              {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={form.description}
                onChange={handleChange('description')}
                rows={3}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${formErrors.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'}`}
              />
              {formErrors.description && <p className="mt-1 text-xs text-red-600">{formErrors.description}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price ($)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={handleChange('price')} className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${formErrors.price ? 'border-red-300' : 'border-gray-300'} focus:border-primary-500 focus:ring-primary-500`} />
              {formErrors.price && <p className="mt-1 text-xs text-red-600">{formErrors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Discounted Price ($) <span className="text-gray-400">(optional)</span></label>
              <input type="number" step="0.01" min="0" value={form.discountedPrice} onChange={handleChange('discountedPrice')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input type="text" value={form.category} onChange={handleChange('category')} className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${formErrors.category ? 'border-red-300' : 'border-gray-300'} focus:border-primary-500 focus:ring-primary-500`} placeholder="e.g., Appetizers, Main Course" />
              {formErrors.category && <p className="mt-1 text-xs text-red-600">{formErrors.category}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Preparation Time (min)</label>
              <input type="number" min="1" value={form.preparationTime} onChange={handleChange('preparationTime')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Spice Level (0-5)</label>
              <input type="number" min="0" max="5" value={form.spiceLevel} onChange={handleChange('spiceLevel')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tags <span className="text-gray-400">(comma-separated)</span></label>
              <input type="text" value={form.tags} onChange={handleChange('tags')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="spicy, bestseller" />
            </div>
          </div>
        </div>

        {/* Dietary Info */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Dietary Information</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ['isVegetarian', 'Vegetarian'],
              ['isVegan', 'Vegan'],
              ['isGlutenFree', 'Gluten Free'],
              ['isDairyFree', 'Dairy Free'],
              ['isNutFree', 'Nut Free'],
              ['isHalal', 'Halal'],
              ['isKosher', 'Kosher'],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form[field] as boolean}
                  onChange={handleChange(field)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Ingredients & Allergens */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Ingredients & Allergens</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Ingredients <span className="text-gray-400">(comma-separated)</span></label>
              <textarea value={form.ingredients} onChange={handleChange('ingredients')} rows={3} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="chicken, rice, spices" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Allergens <span className="text-gray-400">(comma-separated)</span></label>
              <textarea value={form.allergens} onChange={handleChange('allergens')} rows={3} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" placeholder="peanuts, gluten, dairy" />
            </div>
          </div>
        </div>

        {/* Nutritional Info */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Nutritional Information <span className="text-sm font-normal text-gray-400">(optional)</span></h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Calories</label>
              <input type="number" min="0" value={form.calories} onChange={handleChange('calories')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Protein (g)</label>
              <input type="number" min="0" value={form.protein} onChange={handleChange('protein')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Carbs (g)</label>
              <input type="number" min="0" value={form.carbohydrates} onChange={handleChange('carbohydrates')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fat (g)</label>
              <input type="number" min="0" value={form.fat} onChange={handleChange('fat')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={form.isAvailable}
              onChange={handleChange('isAvailable')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Available for ordering</span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/menu')} className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="submit-dish"
            className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Create Dish'}
          </button>
        </div>
      </form>
    </div>
  );
};
