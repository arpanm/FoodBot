/**
 * App - Root application component with routing, providers, and layout
 */

import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './contexts/auth-context';
import { RestaurantProvider } from './contexts/restaurant-context';
import { OrderProvider } from './contexts/order-context';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy-loaded pages for code splitting
const Login = lazy(() => import('./pages/Auth/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() =>
  import('./pages/Auth/Register').then((m) => ({ default: m.Register }))
);
const RestaurantSetup = lazy(() =>
  import('./pages/Onboarding/RestaurantSetup').then((m) => ({ default: m.RestaurantSetup }))
);
const Dashboard = lazy(() =>
  import('./pages/Dashboard/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const Menu = lazy(() => import('./pages/Menu/Menu').then((m) => ({ default: m.Menu })));
const AddDish = lazy(() =>
  import('./pages/Menu/AddDish').then((m) => ({ default: m.AddDish }))
);
const EditDish = lazy(() =>
  import('./pages/Menu/EditDish').then((m) => ({ default: m.EditDish }))
);
const CategoryManagement = lazy(() =>
  import('./pages/Menu/CategoryManagement').then((m) => ({ default: m.CategoryManagement }))
);
const OrderList = lazy(() =>
  import('./pages/Orders/OrderList').then((m) => ({ default: m.OrderList }))
);
const OrderDetail = lazy(() =>
  import('./pages/Orders/OrderDetail').then((m) => ({ default: m.OrderDetail }))
);
const RestaurantProfile = lazy(() =>
  import('./pages/Profile/RestaurantProfile').then((m) => ({
    default: m.RestaurantProfile,
  }))
);
const Analytics = lazy(() =>
  import('./pages/Analytics/Analytics').then((m) => ({ default: m.Analytics }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function SuspenseFallback(): JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<SuspenseFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Onboarding Route */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <RestaurantSetup />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes with Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <RestaurantProvider>
                      <OrderProvider>
                        <AppLayout />
                      </OrderProvider>
                    </RestaurantProvider>
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/orders" element={<OrderList />} />
                <Route path="/orders/:orderId" element={<OrderDetail />} />
                <Route path="/menu" element={<Menu />} />
                <Route path="/menu/add" element={<AddDish />} />
                <Route path="/menu/edit/:dishId" element={<EditDish />} />
                <Route path="/menu/categories" element={<CategoryManagement />} />
                <Route path="/profile" element={<RestaurantProfile />} />
                <Route path="/analytics" element={<Analytics />} />
              </Route>

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
