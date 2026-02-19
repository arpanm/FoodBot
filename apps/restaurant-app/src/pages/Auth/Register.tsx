/**
 * Register Page
 * Restaurant owner registration with form validation
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useAuth } from '../../contexts/auth-context';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { validateEmail, validatePassword, validateRequired, validatePhone } from '../../utils/validation';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback(
    (field: string) =>
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        setFormData((prev) => ({ ...prev, [field]: event.target.value }));
        setFormErrors((prev) => ({ ...prev, [field]: '' }));
      },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent): Promise<void> => {
      event.preventDefault();
      clearError();

      const errors: Record<string, string> = {};
      const nameError = validateRequired(formData.name, 'Name');
      if (nameError) errors.name = nameError;

      const emailError = validateEmail(formData.email);
      if (emailError) errors.email = emailError;

      const phoneError = validatePhone(formData.phone);
      if (phoneError) errors.phone = phoneError;

      const passwordError = validatePassword(formData.password);
      if (passwordError) errors.password = passwordError;

      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setFormErrors({});

      try {
        await register({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          password: formData.password,
          role: 'restaurant_owner',
        });
        navigate('/onboarding');
      } catch {
        // Error handled by context
      }
    },
    [formData, register, navigate, clearError]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">FoodBot</h1>
          <p className="mt-1 text-gray-500">Restaurant Partner Registration</p>
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Create your account</h2>

          {error && (
            <ErrorAlert message={error} onDismiss={clearError} className="mt-4" />
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
            data-testid="register-form"
          >
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={handleChange('name')}
                data-testid="name-input"
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  formErrors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="John Doe"
              />
              {formErrors.name && (
                <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                data-testid="email-input"
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  formErrors.email
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="owner@restaurant.com"
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number{' '}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange('phone')}
                data-testid="phone-input"
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  formErrors.phone
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="+1 (555) 123-4567"
              />
              {formErrors.phone && (
                <p className="mt-1 text-xs text-red-600">{formErrors.phone}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleChange('password')}
                data-testid="password-input"
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  formErrors.password
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="Min 8 characters"
              />
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                data-testid="confirm-password-input"
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  formErrors.confirmPassword
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="Re-enter your password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="register-submit"
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
