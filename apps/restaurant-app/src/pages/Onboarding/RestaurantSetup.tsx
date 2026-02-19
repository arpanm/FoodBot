/**
 * Restaurant Setup / Onboarding Page
 * Multi-step onboarding: restaurant info, document upload, verification status
 * Integrates with restaurantOnboarding workflow from packages/workflows/
 */

import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { restaurantApi } from '../../services/restaurant-api';
import { getErrorMessage } from '../../services/api-client';
import { useAuth } from '../../contexts/auth-context';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

type OnboardingStep = 'restaurant_info' | 'documents' | 'verification';

const STEPS: Array<{ key: OnboardingStep; label: string; description: string }> = [
  {
    key: 'restaurant_info',
    label: 'Restaurant Information',
    description: 'Enter your restaurant details',
  },
  {
    key: 'documents',
    label: 'Document Upload',
    description: 'Upload required verification documents',
  },
  {
    key: 'verification',
    label: 'Verification',
    description: 'Awaiting email and admin verification',
  },
];

export const RestaurantSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>('restaurant_info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurantData, setRestaurantData] = useState({
    name: '',
    description: '',
    cuisine: [] as string[],
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: user?.email ?? '',
    priceRange: 2,
    minimumOrder: 10,
  });

  const [cuisineInput, setCuisineInput] = useState('');

  const handleChange = useCallback(
    (field: string) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
        setRestaurantData((prev) => ({ ...prev, [field]: event.target.value }));
      },
    []
  );

  const handleAddCuisine = useCallback((): void => {
    if (cuisineInput.trim()) {
      setRestaurantData((prev) => ({
        ...prev,
        cuisine: [...prev.cuisine, cuisineInput.trim()],
      }));
      setCuisineInput('');
    }
  }, [cuisineInput]);

  const handleRemoveCuisine = useCallback((index: number): void => {
    setRestaurantData((prev) => ({
      ...prev,
      cuisine: prev.cuisine.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmitRestaurantInfo = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    setError(null);

    try {
      await restaurantApi.create({
        name: restaurantData.name,
        description: restaurantData.description,
        cuisine: restaurantData.cuisine,
        location: {
          address: restaurantData.address,
          city: restaurantData.city,
          state: restaurantData.state,
          zipCode: restaurantData.zipCode,
        },
        contactInfo: {
          phone: restaurantData.phone,
          email: restaurantData.email,
        },
        priceRange: restaurantData.priceRange,
        minimumOrder: restaurantData.minimumOrder,
      });
      setCurrentStep('documents');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [restaurantData]);

  const handleDocumentUpload = useCallback((): void => {
    setCurrentStep('verification');
  }, []);

  const handleComplete = useCallback((): void => {
    navigate('/dashboard');
  }, [navigate]);

  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">FoodBot</h1>
          <p className="mt-1 text-gray-500">Set up your restaurant</p>
        </div>

        {/* Progress Stepper */}
        <div className="mt-8 flex items-center justify-center">
          {STEPS.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    index <= currentStepIndex
                      ? 'border-primary-600 bg-primary-600 text-white'
                      : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  {index + 1}
                </div>
                <p className="mt-2 text-xs font-medium text-gray-600">{step.label}</p>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-4 h-0.5 w-20 ${
                    index < currentStepIndex ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          {error && <ErrorAlert message={error} onDismiss={() => setError(null)} className="mb-6" />}

          {currentStep === 'restaurant_info' && (
            <div data-testid="step-restaurant-info">
              <h2 className="text-lg font-semibold text-gray-900">Restaurant Details</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Restaurant Name</label>
                  <input
                    type="text"
                    value={restaurantData.name}
                    onChange={handleChange('name')}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="My Restaurant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={restaurantData.description}
                    onChange={handleChange('description')}
                    rows={3}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="A brief description of your restaurant"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cuisine Types</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      value={cuisineInput}
                      onChange={(e) => setCuisineInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCuisine())}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="e.g., Italian, Indian"
                    />
                    <button
                      type="button"
                      onClick={handleAddCuisine}
                      className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
                    >
                      Add
                    </button>
                  </div>
                  {restaurantData.cuisine.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {restaurantData.cuisine.map((c, i) => (
                        <span key={i} className="flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700">
                          {c}
                          <button type="button" onClick={() => handleRemoveCuisine(i)} className="text-primary-500 hover:text-primary-700">&times;</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Street Address</label>
                    <input type="text" value={restaurantData.address} onChange={handleChange('address')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input type="text" value={restaurantData.city} onChange={handleChange('city')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input type="text" value={restaurantData.state} onChange={handleChange('state')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">ZIP Code</label>
                    <input type="text" value={restaurantData.zipCode} onChange={handleChange('zipCode')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <input type="tel" value={restaurantData.phone} onChange={handleChange('phone')} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <button
                  type="button"
                  onClick={handleSubmitRestaurantInfo}
                  disabled={isSubmitting || !restaurantData.name}
                  className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {isSubmitting ? <LoadingSpinner size="sm" /> : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'documents' && (
            <div data-testid="step-documents">
              <h2 className="text-lg font-semibold text-gray-900">Upload Documents</h2>
              <p className="mt-2 text-sm text-gray-500">
                Please upload the following documents for verification.
              </p>
              <div className="mt-6 space-y-4">
                {['Business License', 'Food Safety Certificate', 'Tax ID', 'Owner ID'].map((doc) => (
                  <div key={doc} className="flex items-center justify-between rounded-lg border border-dashed border-gray-300 p-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc}</p>
                      <p className="text-xs text-gray-500">PDF, JPG, or PNG (max 5MB)</p>
                    </div>
                    <label className="cursor-pointer rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Upload
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={handleDocumentUpload}
                className="mt-6 w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Submit for Verification
              </button>
            </div>
          )}

          {currentStep === 'verification' && (
            <div data-testid="step-verification" className="text-center py-8">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-4 text-lg font-semibold text-gray-900">Application Submitted</h2>
              <p className="mt-2 text-sm text-gray-500">
                We have sent a verification email to your registered email address.
                Please verify your email to proceed. Our team will review your
                application within 2-3 business days.
              </p>
              <div className="mt-6 rounded-lg bg-blue-50 p-4 text-left">
                <h3 className="text-sm font-semibold text-blue-900">What happens next?</h3>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-700">
                  <li>Verify your email address</li>
                  <li>Admin reviews your application</li>
                  <li>Payment account setup via Stripe Connect</li>
                  <li>Your restaurant goes live</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleComplete}
                className="mt-6 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
