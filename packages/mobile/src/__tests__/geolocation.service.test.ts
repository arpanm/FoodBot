import { GeolocationService } from '../geolocation/geolocation.service';
import type { GeolocationPosition } from '../types/mobile.types';

describe('GeolocationService', () => {
  let service: GeolocationService;

  beforeEach(() => {
    service = new GeolocationService('ios');
    service.setPermissionStatus('granted');
  });

  describe('getCurrentPosition', () => {
    it('should return current position', async () => {
      const position = await service.getCurrentPosition();

      expect(position).toHaveProperty('latitude');
      expect(position).toHaveProperty('longitude');
      expect(position).toHaveProperty('accuracy');
      expect(position).toHaveProperty('timestamp');
    });

    it('should return updated position after set', async () => {
      const testPosition: GeolocationPosition = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 5,
        altitude: 10,
        altitudeAccuracy: 2,
        heading: 90,
        speed: 1.5,
        timestamp: Date.now(),
      };

      service.setCurrentPosition(testPosition);
      const position = await service.getCurrentPosition();

      expect(position.latitude).toBe(40.7128);
      expect(position.longitude).toBe(-74.006);
    });

    it('should throw when permission is denied', async () => {
      service.setPermissionStatus('denied');

      await expect(service.getCurrentPosition()).rejects.toThrow(
        'Geolocation permission denied'
      );
    });

    it('should auto-request permission when status is prompt', async () => {
      service.setPermissionStatus('prompt');
      const position = await service.getCurrentPosition();

      expect(position).toBeDefined();
      const status = await service.checkPermission();
      expect(status).toBe('granted');
    });

    it('should accept options parameter', async () => {
      const position = await service.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000,
      });

      expect(position).toBeDefined();
    });
  });

  describe('watchPosition', () => {
    it('should return a watch id', () => {
      const handler = jest.fn();
      const watchId = service.watchPosition(handler);

      expect(typeof watchId).toBe('number');
      expect(watchId).toBeGreaterThan(0);
    });

    it('should return incrementing watch ids', () => {
      const handler = jest.fn();
      const watchId1 = service.watchPosition(handler);
      const watchId2 = service.watchPosition(handler);

      expect(watchId2).toBeGreaterThan(watchId1);
    });

    it('should invoke handler on position updates', () => {
      const handler = jest.fn();
      service.watchPosition(handler);

      const newPosition: GeolocationPosition = {
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      service.simulatePositionUpdate(newPosition);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 51.5074,
          longitude: -0.1278,
        })
      );
    });

    it('should invoke multiple handlers on position updates', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      service.watchPosition(handler1);
      service.watchPosition(handler2);

      const newPosition: GeolocationPosition = {
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      service.simulatePositionUpdate(newPosition);

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearWatch', () => {
    it('should remove the watcher', () => {
      const handler = jest.fn();
      const watchId = service.watchPosition(handler);

      expect(service.getActiveWatchCount()).toBe(1);

      service.clearWatch(watchId);

      expect(service.getActiveWatchCount()).toBe(0);
    });

    it('should not invoke cleared handler on position updates', () => {
      const handler = jest.fn();
      const watchId = service.watchPosition(handler);
      service.clearWatch(watchId);

      const newPosition: GeolocationPosition = {
        latitude: 51.5074,
        longitude: -0.1278,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      service.simulatePositionUpdate(newPosition);

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two positions (NYC to LA)', () => {
      const nyc: GeolocationPosition = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      const la: GeolocationPosition = {
        latitude: 34.0522,
        longitude: -118.2437,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      const distance = service.calculateDistance(nyc, la);

      // NYC to LA is approximately 3944 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it('should return 0 for same position', () => {
      const pos: GeolocationPosition = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      const distance = service.calculateDistance(pos, pos);
      expect(distance).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      const pos1: GeolocationPosition = {
        latitude: 40.7128,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      const pos2: GeolocationPosition = {
        latitude: 40.7138,
        longitude: -74.006,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        timestamp: Date.now(),
      };

      const distance = service.calculateDistance(pos1, pos2);

      // ~0.111 km for 0.001 degree latitude difference
      expect(distance).toBeGreaterThan(0.1);
      expect(distance).toBeLessThan(0.15);
    });
  });

  describe('checkPermission', () => {
    it('should return current permission status', async () => {
      service.setPermissionStatus('granted');
      expect(await service.checkPermission()).toBe('granted');

      service.setPermissionStatus('denied');
      expect(await service.checkPermission()).toBe('denied');

      service.setPermissionStatus('prompt');
      expect(await service.checkPermission()).toBe('prompt');
    });
  });

  describe('requestPermission', () => {
    it('should grant permission when status is prompt', async () => {
      service.setPermissionStatus('prompt');
      const result = await service.requestPermission();

      expect(result).toBe('granted');
    });

    it('should keep denied status when already denied', async () => {
      service.setPermissionStatus('denied');
      const result = await service.requestPermission();

      expect(result).toBe('denied');
    });

    it('should keep granted status when already granted', async () => {
      service.setPermissionStatus('granted');
      const result = await service.requestPermission();

      expect(result).toBe('granted');
    });
  });

  describe('getPlatform', () => {
    it('should return the platform', () => {
      expect(service.getPlatform()).toBe('ios');
    });
  });
});
