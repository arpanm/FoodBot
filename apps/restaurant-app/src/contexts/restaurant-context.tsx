/**
 * Restaurant Context
 * Manages the current restaurant state, profile data, and real-time updates
 */

import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';

import { restaurantApi } from '../services/restaurant-api';
import { wsService } from '../services/websocket-service';
import { getErrorMessage } from '../services/api-client';
import type { Restaurant } from '../types/models';
import type { WebSocketMessage } from '../types/api.types';

import { useAuth } from './auth-context';

interface RestaurantState {
  restaurant: Restaurant | null;
  isLoading: boolean;
  error: string | null;
}

interface RestaurantContextValue extends RestaurantState {
  refreshRestaurant: () => Promise<void>;
  updateRestaurant: (data: Partial<Restaurant>) => Promise<void>;
  toggleOpen: (isOpen: boolean) => Promise<void>;
}

const RestaurantContext = createContext<RestaurantContextValue | undefined>(undefined);

export function RestaurantProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<RestaurantState>({
    restaurant: null,
    isLoading: false,
    error: null,
  });

  const fetchRestaurant = useCallback(async (): Promise<void> => {
    if (!user?.restaurantId) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const restaurant = await restaurantApi.getById(user.restaurantId);
      setState({ restaurant, isLoading: false, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: getErrorMessage(error),
      }));
    }
  }, [user?.restaurantId]);

  useEffect(() => {
    if (isAuthenticated && user?.restaurantId) {
      void fetchRestaurant();
    }
  }, [isAuthenticated, user?.restaurantId, fetchRestaurant]);

  useEffect(() => {
    if (!user?.restaurantId) {
      return;
    }

    wsService.connect(user.restaurantId);

    const unsubscribe = wsService.on('restaurant.updated', (message: WebSocketMessage) => {
      const updated = message.payload as Partial<Restaurant>;
      setState((prev) => {
        if (!prev.restaurant) {
          return prev;
        }
        return {
          ...prev,
          restaurant: { ...prev.restaurant, ...updated },
        };
      });
    });

    return () => {
      unsubscribe();
      wsService.disconnect();
    };
  }, [user?.restaurantId]);

  const refreshRestaurant = useCallback(async (): Promise<void> => {
    await fetchRestaurant();
  }, [fetchRestaurant]);

  const updateRestaurant = useCallback(
    async (data: Partial<Restaurant>): Promise<void> => {
      if (!state.restaurant) {
        return;
      }

      try {
        const updated = await restaurantApi.update(state.restaurant.id, data);
        setState((prev) => ({ ...prev, restaurant: updated }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },
    [state.restaurant]
  );

  const toggleOpen = useCallback(
    async (isOpen: boolean): Promise<void> => {
      if (!state.restaurant) {
        return;
      }

      try {
        const updated = await restaurantApi.toggleOpen(state.restaurant.id, isOpen);
        setState((prev) => ({ ...prev, restaurant: updated }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },
    [state.restaurant]
  );

  const value: RestaurantContextValue = {
    ...state,
    refreshRestaurant,
    updateRestaurant,
    toggleOpen,
  };

  return (
    <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>
  );
}

export function useRestaurant(): RestaurantContextValue {
  const context = useContext(RestaurantContext);
  if (context === undefined) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
