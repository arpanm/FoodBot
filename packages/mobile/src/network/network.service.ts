import type {
  NetworkStatus,
  ConnectionType,
  NetworkStatusHandler,
  Unsubscribe,
} from '../types/mobile.types.js';

export class NetworkService {
  private connected: boolean;
  private connectionType: ConnectionType;
  private readonly handlers: Set<NetworkStatusHandler> = new Set();

  constructor() {
    this.connected = true;
    this.connectionType = 'wifi';
  }

  async getStatus(): Promise<NetworkStatus> {
    return {
      connected: this.connected,
      connectionType: this.connectionType,
    };
  }

  onStatusChange(handler: NetworkStatusHandler): Unsubscribe {
    this.handlers.add(handler);
    return (): void => {
      this.handlers.delete(handler);
    };
  }

  isOnline(): boolean {
    return this.connected;
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }

  getHandlerCount(): number {
    return this.handlers.size;
  }

  simulateStatusChange(
    connected: boolean,
    connectionType: ConnectionType
  ): void {
    this.connected = connected;
    this.connectionType = connectionType;

    const status: NetworkStatus = { connected, connectionType };
    for (const handler of this.handlers) {
      handler(status);
    }
  }

  simulateOffline(): void {
    this.simulateStatusChange(false, 'none');
  }

  simulateOnline(connectionType: ConnectionType = 'wifi'): void {
    this.simulateStatusChange(true, connectionType);
  }
}
