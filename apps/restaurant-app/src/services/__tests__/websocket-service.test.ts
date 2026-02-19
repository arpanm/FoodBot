import { WebSocketService } from '../websocket-service';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  sentMessages: string[] = [];

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(_code?: number, _reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
  }

  simulateMessage(data: Record<string, unknown>): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }
}

// Store reference to last created MockWebSocket
let lastMockWs: MockWebSocket;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = class extends MockWebSocket {
  constructor() {
    super();
    lastMockWs = this;
  }
};

// Also set the static properties on the global WebSocket
Object.assign((global as Record<string, unknown>).WebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
});

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService();
    jest.useFakeTimers();
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'test-token');
  });

  afterEach(() => {
    service.disconnect();
    jest.useRealTimers();
  });

  it('should connect to WebSocket server', () => {
    service.connect('restaurant-1');
    expect(lastMockWs).toBeDefined();
  });

  it('should register and fire event handlers', () => {
    service.connect('restaurant-1');
    lastMockWs.simulateOpen();

    const handler = jest.fn();
    service.on('order.new', handler);

    lastMockWs.simulateMessage({
      type: 'order.new',
      payload: { orderId: '123' },
      timestamp: new Date().toISOString(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order.new',
        payload: { orderId: '123' },
      })
    );
  });

  it('should fire "all" handlers for any event type', () => {
    service.connect('restaurant-1');
    lastMockWs.simulateOpen();

    const allHandler = jest.fn();
    service.on('all', allHandler);

    lastMockWs.simulateMessage({
      type: 'order.new',
      payload: {},
      timestamp: new Date().toISOString(),
    });

    lastMockWs.simulateMessage({
      type: 'order.status.changed',
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(allHandler).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe handlers correctly', () => {
    service.connect('restaurant-1');
    lastMockWs.simulateOpen();

    const handler = jest.fn();
    const unsubscribe = service.on('order.new', handler);

    lastMockWs.simulateMessage({
      type: 'order.new',
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(handler).toHaveBeenCalledTimes(1);

    unsubscribe();

    lastMockWs.simulateMessage({
      type: 'order.new',
      payload: {},
      timestamp: new Date().toISOString(),
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should send messages when connected', () => {
    service.connect('restaurant-1');
    lastMockWs.simulateOpen();

    service.send({ type: 'ping' });

    expect(lastMockWs.sentMessages).toHaveLength(1);
    expect(JSON.parse(lastMockWs.sentMessages[0])).toEqual({ type: 'ping' });
  });

  it('should report connection status', () => {
    service.connect('restaurant-1');
    lastMockWs.simulateOpen();

    expect(service.isConnected).toBe(true);
  });

  it('should handle malformed messages gracefully', () => {
    service.connect('restaurant-1');
    lastMockWs.simulateOpen();

    const handler = jest.fn();
    service.on('order.new', handler);

    // Send malformed message - should not throw
    if (lastMockWs.onmessage) {
      lastMockWs.onmessage(new MessageEvent('message', { data: 'not valid json' }));
    }

    expect(handler).not.toHaveBeenCalled();
  });
});
