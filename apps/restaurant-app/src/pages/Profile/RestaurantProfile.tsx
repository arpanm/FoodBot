/**
 * RestaurantProfile Page
 * Unified profile page with tabs: Info, Operating Hours, Delivery Settings, Payment
 */

import React, { useState, useCallback } from 'react';

import { ErrorAlert, LoadingSpinner } from '../../components/common';
import { useRestaurant } from '../../contexts/restaurant-context';
import { restaurantApi } from '../../services/restaurant-api';
import { getErrorMessage } from '../../services/api-client';
import type { OperatingHours, DayHours, DeliverySettings } from '../../types/models';
import { DAYS_OF_WEEK } from '../../utils/constants';

type ProfileTab = 'info' | 'hours' | 'delivery' | 'payment';

const TABS: Array<{ key: ProfileTab; label: string }> = [
  { key: 'info', label: 'Restaurant Info' },
  { key: 'hours', label: 'Operating Hours' },
  { key: 'delivery', label: 'Delivery Settings' },
  { key: 'payment', label: 'Payment Settings' },
];

const DEFAULT_DAY_HOURS: DayHours = { open: '09:00', close: '22:00', isClosed: false };

export const RestaurantProfile: React.FC = () => {
  const { restaurant, updateRestaurant, refreshRestaurant } = useRestaurant();

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Info form
  const [infoForm, setInfoForm] = useState({
    name: restaurant?.name ?? '',
    description: restaurant?.description ?? '',
    phone: restaurant?.contactInfo?.phone ?? '',
    email: restaurant?.contactInfo?.email ?? '',
    website: restaurant?.contactInfo?.website ?? '',
    priceRange: restaurant?.priceRange ?? 2,
    minimumOrder: restaurant?.minimumOrder ?? 10,
  });

  // Hours form
  const [hoursForm, setHoursForm] = useState<OperatingHours>(
    restaurant?.hours ?? {
      monday: { ...DEFAULT_DAY_HOURS },
      tuesday: { ...DEFAULT_DAY_HOURS },
      wednesday: { ...DEFAULT_DAY_HOURS },
      thursday: { ...DEFAULT_DAY_HOURS },
      friday: { ...DEFAULT_DAY_HOURS },
      saturday: { ...DEFAULT_DAY_HOURS },
      sunday: { open: '10:00', close: '21:00', isClosed: false },
    }
  );

  // Delivery settings form
  const [deliveryForm, setDeliveryForm] = useState<DeliverySettings>(
    restaurant?.deliverySettings ?? {
      deliveryRadius: 5,
      deliveryFee: 3.99,
      freeDeliveryMinimum: 30,
      estimatedDeliveryTime: '30-45 min',
      acceptsDelivery: true,
      acceptsPickup: true,
    }
  );

  const showSuccess = useCallback((message: string): void => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  const handleSaveInfo = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);
    try {
      await updateRestaurant({
        name: infoForm.name,
        description: infoForm.description,
        contactInfo: {
          phone: infoForm.phone,
          email: infoForm.email || undefined,
          website: infoForm.website || undefined,
        },
        priceRange: infoForm.priceRange,
        minimumOrder: infoForm.minimumOrder,
      });
      showSuccess('Restaurant info saved successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [infoForm, updateRestaurant, showSuccess]);

  const handleSaveHours = useCallback(async (): Promise<void> => {
    if (!restaurant?.id) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await restaurantApi.updateOperatingHours(restaurant.id, { hours: hoursForm });
      await refreshRestaurant();
      showSuccess('Operating hours saved successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [restaurant?.id, hoursForm, refreshRestaurant, showSuccess]);

  const handleSaveDelivery = useCallback(async (): Promise<void> => {
    if (!restaurant?.id) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await restaurantApi.updateDeliverySettings(restaurant.id, { settings: deliveryForm });
      await refreshRestaurant();
      showSuccess('Delivery settings saved successfully');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [restaurant?.id, deliveryForm, refreshRestaurant, showSuccess]);

  const handleDayChange = useCallback(
    (day: string, field: keyof DayHours, value: string | boolean): void => {
      setHoursForm((prev) => ({
        ...prev,
        [day]: { ...prev[day as keyof OperatingHours], [field]: value },
      }));
    },
    []
  );

  if (!restaurant) {
    return <div className="flex justify-center py-12"><LoadingSpinner /></div>;
  }

  return (
    <div data-testid="restaurant-profile-page">
      <h1 className="text-2xl font-bold text-gray-900">Restaurant Settings</h1>
      <p className="mt-1 text-sm text-gray-500">Manage your restaurant profile and preferences</p>

      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mt-4" />}

      {successMessage && (
        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 border-b border-gray-200">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'info' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="tab-info">
            <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Restaurant Name</label>
                <input type="text" value={infoForm.name} onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea value={infoForm.description} onChange={(e) => setInfoForm((p) => ({ ...p, description: e.target.value }))} rows={3} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input type="tel" value={infoForm.phone} onChange={(e) => setInfoForm((p) => ({ ...p, phone: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" value={infoForm.email} onChange={(e) => setInfoForm((p) => ({ ...p, email: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Website</label>
                <input type="url" value={infoForm.website} onChange={(e) => setInfoForm((p) => ({ ...p, website: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Range (1-4)</label>
                <select value={infoForm.priceRange} onChange={(e) => setInfoForm((p) => ({ ...p, priceRange: Number(e.target.value) }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm">
                  <option value={1}>$ - Budget</option>
                  <option value={2}>$$ - Moderate</option>
                  <option value={3}>$$$ - Upscale</option>
                  <option value={4}>$$$$ - Fine Dining</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Minimum Order ($)</label>
                <input type="number" min="0" step="0.01" value={infoForm.minimumOrder} onChange={(e) => setInfoForm((p) => ({ ...p, minimumOrder: Number(e.target.value) }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={handleSaveInfo} disabled={isSubmitting} className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'hours' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="tab-hours">
            <h2 className="text-lg font-semibold text-gray-900">Operating Hours</h2>
            <div className="mt-4 space-y-3">
              {DAYS_OF_WEEK.map((day) => {
                const dayHours = hoursForm[day as keyof OperatingHours];
                return (
                  <div key={day} className="flex items-center gap-4 rounded-lg border border-gray-100 p-3">
                    <span className="w-24 text-sm font-medium capitalize text-gray-700">{day}</span>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={!dayHours.isClosed} onChange={(e) => handleDayChange(day, 'isClosed', !e.target.checked)} className="rounded border-gray-300 text-primary-600" />
                      <span className="text-xs text-gray-500">Open</span>
                    </label>
                    {!dayHours.isClosed && (
                      <>
                        <input type="time" value={dayHours.open} onChange={(e) => handleDayChange(day, 'open', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                        <span className="text-gray-400">to</span>
                        <input type="time" value={dayHours.close} onChange={(e) => handleDayChange(day, 'close', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
                      </>
                    )}
                    {dayHours.isClosed && <span className="text-sm text-red-500">Closed</span>}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={handleSaveHours} disabled={isSubmitting} className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Hours'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="tab-delivery">
            <h2 className="text-lg font-semibold text-gray-900">Delivery Settings</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Radius (km)</label>
                <input type="number" min="0" step="0.5" value={deliveryForm.deliveryRadius} onChange={(e) => setDeliveryForm((p) => ({ ...p, deliveryRadius: Number(e.target.value) }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Delivery Fee ($)</label>
                <input type="number" min="0" step="0.01" value={deliveryForm.deliveryFee} onChange={(e) => setDeliveryForm((p) => ({ ...p, deliveryFee: Number(e.target.value) }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Free Delivery Minimum ($)</label>
                <input type="number" min="0" step="0.01" value={deliveryForm.freeDeliveryMinimum ?? 0} onChange={(e) => setDeliveryForm((p) => ({ ...p, freeDeliveryMinimum: Number(e.target.value) }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Estimated Delivery Time</label>
                <input type="text" value={deliveryForm.estimatedDeliveryTime} onChange={(e) => setDeliveryForm((p) => ({ ...p, estimatedDeliveryTime: e.target.value }))} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm" placeholder="30-45 min" />
              </div>
              <div className="md:col-span-2 flex gap-6">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={deliveryForm.acceptsDelivery} onChange={(e) => setDeliveryForm((p) => ({ ...p, acceptsDelivery: e.target.checked }))} className="rounded border-gray-300 text-primary-600" />
                  <span className="text-sm text-gray-700">Accepts Delivery</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={deliveryForm.acceptsPickup} onChange={(e) => setDeliveryForm((p) => ({ ...p, acceptsPickup: e.target.checked }))} className="rounded border-gray-300 text-primary-600" />
                  <span className="text-sm text-gray-700">Accepts Pickup</span>
                </label>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={handleSaveDelivery} disabled={isSubmitting} className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
                {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Delivery Settings'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'payment' && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm" data-testid="tab-payment">
            <h2 className="text-lg font-semibold text-gray-900">Payment Settings</h2>
            <p className="mt-2 text-sm text-gray-500">
              Manage your Stripe Connect account for receiving payments.
            </p>
            <div className="mt-6 rounded-lg bg-gray-50 p-6 text-center">
              {restaurant.paymentAccountId ? (
                <div>
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900">Stripe Connect Active</p>
                  <p className="mt-1 text-xs text-gray-500">Account ID: {restaurant.paymentAccountId}</p>
                  <button type="button" className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
                    Manage on Stripe
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600">
                    Connect your Stripe account to start receiving payments.
                  </p>
                  <button type="button" className="mt-4 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
                    Connect Stripe Account
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
