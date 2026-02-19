/**
 * useWebSocket hook - Provides reactive WebSocket connection management
 */

import { useEffect, useRef, useCallback, useState } from 'react';

import { wsService } from '../services/websocket-service';
import type { WebSocketMessage, WebSocketEventType } from '../types/api.types';

interface UseWebSocketOptions {
  restaurantId: string | undefined;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  subscribe: (
    eventType: WebSocketEventType | 'all',
    handler: (message: WebSocketMessage) => void
  ) => () => void;
  send: (message: Record<string, unknown>) => void;
}

export function useWebSocket({
  restaurantId,
  autoConnect = true,
}: UseWebSocketOptions): UseWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const checkInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!restaurantId || !autoConnect) {
      return;
    }

    wsService.connect(restaurantId);

    checkInterval.current = setInterval(() => {
      setIsConnected(wsService.isConnected);
    }, 1000);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
      }
    };
  }, [restaurantId, autoConnect]);

  const subscribe = useCallback(
    (
      eventType: WebSocketEventType | 'all',
      handler: (message: WebSocketMessage) => void
    ): (() => void) => {
      return wsService.on(eventType, handler);
    },
    []
  );

  const send = useCallback((message: Record<string, unknown>): void => {
    wsService.send(message);
  }, []);

  return { isConnected, subscribe, send };
}
