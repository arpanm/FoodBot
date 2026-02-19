/**
 * Order Context
 * Manages real-time order state, new order notifications, and sound alerts
 */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react';

import { orderApi } from '../services/order-api';
import { wsService } from '../services/websocket-service';
import { getErrorMessage } from '../services/api-client';
import type { Order, OrderStatus } from '../types/models';
import type { WebSocketMessage } from '../types/api.types';

import { useAuth } from './auth-context';

interface OrderState {
  activeOrders: Order[];
  newOrderCount: number;
  isLoading: boolean;
  error: string | null;
}

interface OrderContextValue extends OrderState {
  refreshOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  clearNewOrderCount: () => void;
  acceptOrder: (orderId: string, estimatedTime?: string) => Promise<void>;
  markPreparing: (orderId: string) => Promise<void>;
  markReady: (orderId: string) => Promise<void>;
  cancelOrder: (orderId: string, reason: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextValue | undefined>(undefined);

const NEW_ORDER_SOUND_URL = '/sounds/new-order.mp3';

export function OrderProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { user, isAuthenticated } = useAuth();
  const [state, setState] = useState<OrderState>({
    activeOrders: [],
    newOrderCount: 0,
    isLoading: false,
    error: null,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(NEW_ORDER_SOUND_URL);
    audioRef.current.volume = 0.7;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const fetchActiveOrders = useCallback(async (): Promise<void> => {
    if (!user?.restaurantId) {
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const orders = await orderApi.getActiveOrders(user.restaurantId);
      setState((prev) => ({
        ...prev,
        activeOrders: orders,
        isLoading: false,
        error: null,
      }));
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
      void fetchActiveOrders();
    }
  }, [isAuthenticated, user?.restaurantId, fetchActiveOrders]);

  useEffect(() => {
    if (!user?.restaurantId) {
      return;
    }

    const unsubNewOrder = wsService.on('order.new', (message: WebSocketMessage) => {
      const newOrder = message.payload as unknown as Order;
      setState((prev) => ({
        ...prev,
        activeOrders: [newOrder, ...prev.activeOrders],
        newOrderCount: prev.newOrderCount + 1,
      }));

      void playNewOrderSound();
    });

    const unsubStatusChange = wsService.on(
      'order.status.changed',
      (message: WebSocketMessage) => {
        const { orderId, newStatus } = message.payload as {
          orderId: string;
          newStatus: OrderStatus;
        };

        setState((prev) => {
          const terminalStatuses: OrderStatus[] = [
            'DELIVERED',
            'CANCELLED',
            'REFUNDED',
          ];

          if (terminalStatuses.includes(newStatus)) {
            return {
              ...prev,
              activeOrders: prev.activeOrders.filter((o) => o.id !== orderId),
            };
          }

          return {
            ...prev,
            activeOrders: prev.activeOrders.map((o) =>
              o.id === orderId ? { ...o, status: newStatus } : o
            ),
          };
        });
      }
    );

    const unsubCancelled = wsService.on('order.cancelled', (message: WebSocketMessage) => {
      const { orderId } = message.payload as { orderId: string };
      setState((prev) => ({
        ...prev,
        activeOrders: prev.activeOrders.filter((o) => o.id !== orderId),
      }));
    });

    return () => {
      unsubNewOrder();
      unsubStatusChange();
      unsubCancelled();
    };
  }, [user?.restaurantId]);

  async function playNewOrderSound(): Promise<void> {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      }
    } catch {
      // Sound playback may be blocked by browser autoplay policy
    }
  }

  const refreshOrders = useCallback(async (): Promise<void> => {
    await fetchActiveOrders();
  }, [fetchActiveOrders]);

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus): Promise<void> => {
      try {
        const updated = await orderApi.updateOrderStatus(orderId, { status });
        setState((prev) => ({
          ...prev,
          activeOrders: prev.activeOrders.map((o) =>
            o.id === orderId ? updated : o
          ),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },
    []
  );

  const clearNewOrderCount = useCallback((): void => {
    setState((prev) => ({ ...prev, newOrderCount: 0 }));
  }, []);

  const acceptOrder = useCallback(
    async (orderId: string, estimatedTime?: string): Promise<void> => {
      try {
        const updated = await orderApi.acceptOrder(orderId, estimatedTime);
        setState((prev) => ({
          ...prev,
          activeOrders: prev.activeOrders.map((o) =>
            o.id === orderId ? updated : o
          ),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },
    []
  );

  const markPreparing = useCallback(async (orderId: string): Promise<void> => {
    try {
      const updated = await orderApi.markPreparing(orderId);
      setState((prev) => ({
        ...prev,
        activeOrders: prev.activeOrders.map((o) =>
          o.id === orderId ? updated : o
        ),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: getErrorMessage(error),
      }));
      throw error;
    }
  }, []);

  const markReady = useCallback(async (orderId: string): Promise<void> => {
    try {
      const updated = await orderApi.markReady(orderId);
      setState((prev) => ({
        ...prev,
        activeOrders: prev.activeOrders.map((o) =>
          o.id === orderId ? updated : o
        ),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: getErrorMessage(error),
      }));
      throw error;
    }
  }, []);

  const cancelOrder = useCallback(
    async (orderId: string, reason: string): Promise<void> => {
      try {
        await orderApi.cancelOrder(orderId, reason);
        setState((prev) => ({
          ...prev,
          activeOrders: prev.activeOrders.filter((o) => o.id !== orderId),
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: getErrorMessage(error),
        }));
        throw error;
      }
    },
    []
  );

  const value: OrderContextValue = {
    ...state,
    refreshOrders,
    updateOrderStatus,
    clearNewOrderCount,
    acceptOrder,
    markPreparing,
    markReady,
    cancelOrder,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders(): OrderContextValue {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
