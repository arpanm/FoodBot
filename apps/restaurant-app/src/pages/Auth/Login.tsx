/**
 * Login Page
 * Handles restaurant owner authentication
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useAuth } from '../../contexts/auth-context';
import { ErrorAlert } from '../../components/common/ErrorAlert';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { validateEmail, validatePassword } from '../../utils/validation';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSubmit = useCallback(
    async (event: React.FormEvent): Promise<void> => {
      event.preventDefault();
      clearError();

      const errors: Record<string, string> = {};
      const emailError = validateEmail(email);
      if (emailError) errors.email = emailError;
      const passwordError = validatePassword(password);
      if (passwordError) errors.password = passwordError;

      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        return;
      }

      setFormErrors({});

      try {
        await login({ email, password });
        navigate('/dashboard');
      } catch {
        // Error is handled by context
      }
    },
    [email, password, login, navigate, clearError]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-600">FoodBot</h1>
          <p className="mt-1 text-gray-500">Restaurant Partner Portal</p>
        </div>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Sign in to your account</h2>

          {error && (
            <ErrorAlert message={error} onDismiss={clearError} className="mt-4" />
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" data-testid="login-form">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="password-input"
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 ${
                  formErrors.password
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                }`}
                placeholder="Enter your password"
              />
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit"
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            New restaurant partner?{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Register your restaurant
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
