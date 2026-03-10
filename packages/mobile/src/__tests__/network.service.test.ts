import { NetworkService } from '../network/network.service';

describe('NetworkService', () => {
  let service: NetworkService;

  beforeEach(() => {
    service = new NetworkService();
  });

  describe('getStatus', () => {
    it('should return connected with wifi by default', async () => {
      const status = await service.getStatus();

      expect(status.connected).toBe(true);
      expect(status.connectionType).toBe('wifi');
    });

    it('should reflect status changes', async () => {
      service.simulateOffline();
      const status = await service.getStatus();

      expect(status.connected).toBe(false);
      expect(status.connectionType).toBe('none');
    });
  });

  describe('onStatusChange', () => {
    it('should invoke handler on status change', () => {
      const handler = jest.fn();
      service.onStatusChange(handler);

      service.simulateOffline();

      expect(handler).toHaveBeenCalledWith({
        connected: false,
        connectionType: 'none',
      });
    });

    it('should invoke multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.onStatusChange(handler1);
      service.onStatusChange(handler2);

      service.simulateOffline();

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe handler', () => {
      const handler = jest.fn();
      const unsubscribe = service.onStatusChange(handler);

      unsubscribe();
      service.simulateOffline();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should track handler count correctly', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      expect(service.getHandlerCount()).toBe(0);

      const unsub1 = service.onStatusChange(handler1);
      expect(service.getHandlerCount()).toBe(1);

      service.onStatusChange(handler2);
      expect(service.getHandlerCount()).toBe(2);

      unsub1();
      expect(service.getHandlerCount()).toBe(1);
    });
  });

  describe('isOnline', () => {
    it('should return true by default', () => {
      expect(service.isOnline()).toBe(true);
    });

    it('should return false after going offline', () => {
      service.simulateOffline();
      expect(service.isOnline()).toBe(false);
    });

    it('should return true after going back online', () => {
      service.simulateOffline();
      service.simulateOnline();
      expect(service.isOnline()).toBe(true);
    });
  });

  describe('getConnectionType', () => {
    it('should return wifi by default', () => {
      expect(service.getConnectionType()).toBe('wifi');
    });

    it('should return cellular when simulated', () => {
      service.simulateOnline('cellular');
      expect(service.getConnectionType()).toBe('cellular');
    });

    it('should return none when offline', () => {
      service.simulateOffline();
      expect(service.getConnectionType()).toBe('none');
    });
  });

  describe('simulateStatusChange', () => {
    it('should update connected state and connection type', () => {
      service.simulateStatusChange(false, 'none');

      expect(service.isOnline()).toBe(false);
      expect(service.getConnectionType()).toBe('none');
    });

    it('should notify all handlers', () => {
      const handler = jest.fn();
      service.onStatusChange(handler);

      service.simulateStatusChange(true, 'cellular');

      expect(handler).toHaveBeenCalledWith({
        connected: true,
        connectionType: 'cellular',
      });
    });
  });

  describe('simulateOnline', () => {
    it('should default to wifi connection type', () => {
      service.simulateOffline();
      service.simulateOnline();

      expect(service.isOnline()).toBe(true);
      expect(service.getConnectionType()).toBe('wifi');
    });

    it('should accept custom connection type', () => {
      service.simulateOffline();
      service.simulateOnline('cellular');

      expect(service.isOnline()).toBe(true);
      expect(service.getConnectionType()).toBe('cellular');
    });
  });
});
