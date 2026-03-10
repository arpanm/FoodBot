import { BiometricService } from '../biometric/biometric.service';
import type { Platform } from '../types/mobile.types';

describe('BiometricService', () => {
  let service: BiometricService;

  beforeEach(() => {
    service = new BiometricService('ios');
  });

  describe('isAvailable', () => {
    it('should return available with faceId for ios', async () => {
      const result = await service.isAvailable();

      expect(result.isAvailable).toBe(true);
      expect(result.biometricType).toBe('faceId');
      expect(result.reason).toBeUndefined();
    });

    it('should return available with fingerprint for android', async () => {
      const androidService = new BiometricService('android');
      const result = await androidService.isAvailable();

      expect(result.isAvailable).toBe(true);
      expect(result.biometricType).toBe('fingerprint');
    });

    it('should return not available for web', async () => {
      const webService = new BiometricService('web');
      const result = await webService.isAvailable();

      expect(result.isAvailable).toBe(false);
      expect(result.biometricType).toBe('none');
      expect(result.reason).toBeDefined();
    });

    it('should return not available when manually disabled', async () => {
      service.setAvailable(false);
      const result = await service.isAvailable();

      expect(result.isAvailable).toBe(false);
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully on ios', async () => {
      const result = await service.authenticate('Confirm your identity');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should authenticate successfully on android', async () => {
      const androidService = new BiometricService('android');
      const result = await androidService.authenticate('Confirm identity');

      expect(result.success).toBe(true);
    });

    it('should fail authentication on web', async () => {
      const webService = new BiometricService('web');
      const result = await webService.authenticate('Test reason');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not supported on web');
    });

    it('should fail when biometric is not available', async () => {
      service.setAvailable(false);
      const result = await service.authenticate('Test reason');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not available');
    });

    it('should fail when reason is empty', async () => {
      const result = await service.authenticate('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('reason is required');
    });

    it('should fail when reason is whitespace only', async () => {
      const result = await service.authenticate('   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('reason is required');
    });

    it('should fail when simulated auth failure is set', async () => {
      service.setSimulateAuthSuccess(false);
      const result = await service.authenticate('Test reason');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('getType', () => {
    it('should return faceId for ios', async () => {
      const result = await service.getType();
      expect(result).toBe('faceId');
    });

    it('should return fingerprint for android', async () => {
      const androidService = new BiometricService('android');
      const result = await androidService.getType();
      expect(result).toBe('fingerprint');
    });

    it('should return none for web', async () => {
      const webService = new BiometricService('web');
      const result = await webService.getType();
      expect(result).toBe('none');
    });

    it('should return custom type when set', async () => {
      service.setBiometricType('iris');
      const result = await service.getType();
      expect(result).toBe('iris');
    });
  });

  describe('getPlatform', () => {
    it.each<Platform>(['ios', 'android', 'web'])(
      'should return platform %s',
      (platform) => {
        const svc = new BiometricService(platform);
        expect(svc.getPlatform()).toBe(platform);
      }
    );
  });
});
