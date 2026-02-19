/**
 * WebSocket service for real-time order updates, new order notifications,
 * and dish availability sync
 */

import type { WebSocketMessage, WebSocketEventType } from '../types/api.types';
import { WS_URL, JWT_STORAGE_KEY } from '../utils/constants';

type WebSocketHandler = (message: WebSocketMessage) => void;

const RECONNECT_INTERVAL_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL_MS = 30000;

export class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<WebSocketEventType | 'all', Set<WebSocketHandler>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isConnecting = false;
  private restaurantId: string | null = null;

  connect(restaurantId: string): void {
    if (this.isConnecting || (this.socket?.readyState === WebSocket.OPEN)) {
      return;
    }

    this.restaurantId = restaurantId;
    this.isConnecting = true;

    const token = localStorage.getItem(JWT_STORAGE_KEY);
    const url = `${WS_URL}?restaurantId=${restaurantId}&token=${token}`;

    try {
      this.socket = new WebSocket(url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.clearTimers();
    this.reconnectAttempts = MAX_RECONNECT_ATTEMPTS;

    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
  }

  on(eventType: WebSocketEventType | 'all', handler: WebSocketHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  send(message: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private handleOpen(): void {
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data as string);

      const typeHandlers = this.handlers.get(message.type);
      if (typeHandlers) {
        typeHandlers.forEach((handler) => handler(message));
      }

      const allHandlers = this.handlers.get('all');
      if (allHandlers) {
        allHandlers.forEach((handler) => handler(message));
      }
    } catch {
      // Silently ignore malformed messages
    }
  }

  private handleClose(event: CloseEvent): void {
    this.isConnecting = false;
    this.clearTimers();

    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(): void {
    this.isConnecting = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      if (this.restaurantId) {
        this.connect(this.restaurantId);
      }
    }, RECONNECT_INTERVAL_MS * Math.pow(2, this.reconnectAttempts));
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping' });
    }, HEARTBEAT_INTERVAL_MS);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

export const wsService = new WebSocketService();
