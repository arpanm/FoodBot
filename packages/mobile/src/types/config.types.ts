import type { Platform } from './mobile.types.js';

export interface MobileConfig {
  platform: Platform;
  appId: string;
  appName: string;
  push: PushConfig;
  biometric: BiometricConfig;
  geolocation: GeolocationConfig;
}

export interface PushConfig {
  enabled: boolean;
  defaultChannelId: string;
  defaultChannelName: string;
  requestPermissionOnStart: boolean;
}

export interface BiometricConfig {
  enabled: boolean;
  allowDeviceCredentials: boolean;
  invalidateOnBiometricChange: boolean;
  title: string;
  subtitle: string;
}

export interface GeolocationConfig {
  enableHighAccuracy: boolean;
  timeout: number;
  maximumAge: number;
  distanceFilter: number;
}
