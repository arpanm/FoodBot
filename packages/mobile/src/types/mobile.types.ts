export type Platform = 'ios' | 'android' | 'web';

export interface DeviceInfo {
  platform: Platform;
  model: string;
  osVersion: string;
  appVersion: string;
  isVirtual: boolean;
  manufacturer: string;
}

export interface NetworkStatus {
  connected: boolean;
  connectionType: ConnectionType;
}

export type ConnectionType = 'wifi' | 'cellular' | 'none' | 'unknown';

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, string>;
  timestamp: number;
  channelId?: string;
}

export interface PushRegistration {
  token: string;
  platform: Platform;
}

export interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  importance: ChannelImportance;
  sound?: string;
  vibration?: boolean;
}

export type ChannelImportance = 'high' | 'default' | 'low' | 'min';

export type BiometricType = 'fingerprint' | 'faceId' | 'iris' | 'none';

export interface BiometricAvailability {
  isAvailable: boolean;
  biometricType: BiometricType;
  reason?: string;
}

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export type PermissionStatus = 'granted' | 'denied' | 'prompt';

export interface CameraOptions {
  quality?: number;
  width?: number;
  height?: number;
  allowEditing?: boolean;
  resultType?: CameraResultType;
}

export type CameraResultType = 'dataUrl' | 'uri';

export interface CameraResult {
  dataUrl?: string;
  uri?: string;
  format: string;
  width: number;
  height: number;
}

export type Unsubscribe = () => void;

export type WatchId = number;

export type NotificationHandler = (notification: PushNotification) => void;

export type PositionHandler = (position: GeolocationPosition) => void;

export type NetworkStatusHandler = (status: NetworkStatus) => void;

export interface DeepLinkRoute {
  path: string;
  params: Record<string, string>;
}

export type DeepLinkHandler = (route: DeepLinkRoute) => void;
