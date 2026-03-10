import type {
  Platform,
  BiometricType,
  BiometricAvailability,
  BiometricResult,
} from '../types/mobile.types.js';

export class BiometricService {
  private readonly platform: Platform;
  private available: boolean;
  private biometricType: BiometricType;
  private simulateAuthSuccess: boolean;

  constructor(platform: Platform) {
    this.platform = platform;
    this.available = platform !== 'web';
    this.biometricType = this.getDefaultBiometricType(platform);
    this.simulateAuthSuccess = true;
  }

  async isAvailable(): Promise<BiometricAvailability> {
    if (this.platform === 'web') {
      return {
        isAvailable: false,
        biometricType: 'none',
        reason: 'Biometric authentication is not available on web platform',
      };
    }

    return {
      isAvailable: this.available,
      biometricType: this.biometricType,
    };
  }

  async authenticate(reason: string): Promise<BiometricResult> {
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Authentication reason is required',
      };
    }

    if (this.platform === 'web') {
      return {
        success: false,
        error: 'Biometric authentication is not supported on web',
      };
    }

    if (!this.available) {
      return {
        success: false,
        error: 'Biometric authentication is not available on this device',
      };
    }

    if (this.simulateAuthSuccess) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Authentication failed',
    };
  }

  async getType(): Promise<BiometricType> {
    if (this.platform === 'web') {
      return 'none';
    }
    return this.biometricType;
  }

  getPlatform(): Platform {
    return this.platform;
  }

  setAvailable(available: boolean): void {
    this.available = available;
  }

  setSimulateAuthSuccess(success: boolean): void {
    this.simulateAuthSuccess = success;
  }

  setBiometricType(biometricType: BiometricType): void {
    this.biometricType = biometricType;
  }

  private getDefaultBiometricType(platform: Platform): BiometricType {
    switch (platform) {
      case 'ios':
        return 'faceId';
      case 'android':
        return 'fingerprint';
      case 'web':
        return 'none';
    }
  }
}
