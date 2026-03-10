import type {
  Platform,
  GeolocationPosition,
  GeolocationOptions,
  PermissionStatus,
  PositionHandler,
  WatchId,
} from '../types/mobile.types.js';

const EARTH_RADIUS_KM = 6371;
const DEFAULT_TIMEOUT = 10000;
const DEFAULT_MAXIMUM_AGE = 0;

export class GeolocationService {
  private readonly platform: Platform;
  private permissionStatus: PermissionStatus;
  private readonly watchers: Map<WatchId, PositionHandler> = new Map();
  private nextWatchId: WatchId = 1;
  private currentPosition: GeolocationPosition;

  constructor(platform: Platform) {
    this.platform = platform;
    this.permissionStatus = 'prompt';
    this.currentPosition = {
      latitude: 0,
      longitude: 0,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      timestamp: Date.now(),
    };
  }

  async getCurrentPosition(
    options?: GeolocationOptions
  ): Promise<GeolocationPosition> {
    await this.ensurePermission();
    this.applyOptions(options);

    return { ...this.currentPosition, timestamp: Date.now() };
  }

  watchPosition(
    handler: PositionHandler,
    _options?: GeolocationOptions
  ): WatchId {
    const watchId = this.nextWatchId;
    this.nextWatchId += 1;
    this.watchers.set(watchId, handler);
    return watchId;
  }

  clearWatch(watchId: WatchId): void {
    this.watchers.delete(watchId);
  }

  calculateDistance(
    pos1: GeolocationPosition,
    pos2: GeolocationPosition
  ): number {
    return haversineDistance(
      pos1.latitude,
      pos1.longitude,
      pos2.latitude,
      pos2.longitude
    );
  }

  async checkPermission(): Promise<PermissionStatus> {
    return this.permissionStatus;
  }

  async requestPermission(): Promise<PermissionStatus> {
    if (this.permissionStatus === 'prompt') {
      this.permissionStatus = 'granted';
    }
    return this.permissionStatus;
  }

  getActiveWatchCount(): number {
    return this.watchers.size;
  }

  getPlatform(): Platform {
    return this.platform;
  }

  setPermissionStatus(status: PermissionStatus): void {
    this.permissionStatus = status;
  }

  setCurrentPosition(position: GeolocationPosition): void {
    this.currentPosition = { ...position };
  }

  simulatePositionUpdate(position: GeolocationPosition): void {
    this.currentPosition = { ...position };
    for (const handler of this.watchers.values()) {
      handler({ ...position });
    }
  }

  private async ensurePermission(): Promise<void> {
    if (this.permissionStatus === 'denied') {
      throw new Error('Geolocation permission denied');
    }
    if (this.permissionStatus === 'prompt') {
      await this.requestPermission();
    }
  }

  private applyOptions(options?: GeolocationOptions): void {
    const _timeout = options?.timeout ?? DEFAULT_TIMEOUT;
    const _maximumAge = options?.maximumAge ?? DEFAULT_MAXIMUM_AGE;
    // Options applied for future real Capacitor integration
    void _timeout;
    void _maximumAge;
  }
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}
