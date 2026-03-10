import { CameraService } from '../camera/camera.service';

describe('CameraService', () => {
  let service: CameraService;

  beforeEach(() => {
    service = new CameraService('ios');
  });

  describe('takePhoto', () => {
    it('should return a camera result with dataUrl by default', async () => {
      const result = await service.takePhoto();

      expect(result.dataUrl).toBeDefined();
      expect(result.format).toBe('jpeg');
      expect(result.width).toBe(1024);
      expect(result.height).toBe(1024);
    });

    it('should respect custom dimensions', async () => {
      const result = await service.takePhoto({
        width: 800,
        height: 600,
      });

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
    });

    it('should respect custom quality', async () => {
      const result = await service.takePhoto({ quality: 50 });

      expect(result.dataUrl).toContain('q50');
    });

    it('should return uri when resultType is uri', async () => {
      const result = await service.takePhoto({ resultType: 'uri' });

      expect(result.uri).toBeDefined();
      expect(result.uri).toContain('file:///');
      expect(result.dataUrl).toBeUndefined();
    });

    it('should clamp quality to valid range', async () => {
      const resultLow = await service.takePhoto({ quality: -10 });
      expect(resultLow.dataUrl).toContain('q1');

      const resultHigh = await service.takePhoto({ quality: 200 });
      expect(resultHigh.dataUrl).toContain('q100');
    });
  });

  describe('pickFromGallery', () => {
    it('should return a camera result with dataUrl by default', async () => {
      const result = await service.pickFromGallery();

      expect(result.dataUrl).toBeDefined();
      expect(result.dataUrl).toContain('gallery');
      expect(result.format).toBe('jpeg');
    });

    it('should respect custom options', async () => {
      const result = await service.pickFromGallery({
        width: 500,
        height: 500,
        quality: 75,
      });

      expect(result.width).toBe(500);
      expect(result.height).toBe(500);
      expect(result.dataUrl).toContain('q75');
    });

    it('should return uri when resultType is uri', async () => {
      const result = await service.pickFromGallery({ resultType: 'uri' });

      expect(result.uri).toBeDefined();
      expect(result.dataUrl).toBeUndefined();
    });
  });

  describe('compressImage', () => {
    it('should return compressed data url', async () => {
      const dataUrl = 'data:image/jpeg;base64,abc123';
      const result = await service.compressImage(dataUrl, 50);

      expect(result).toContain('compressed=true');
      expect(result).toContain('quality=50');
    });

    it('should clamp quality to valid range', async () => {
      const dataUrl = 'data:image/jpeg;base64,abc123';

      const resultLow = await service.compressImage(dataUrl, -10);
      expect(resultLow).toContain('quality=1');

      const resultHigh = await service.compressImage(dataUrl, 200);
      expect(resultHigh).toContain('quality=100');
    });

    it('should throw for empty data url', async () => {
      await expect(service.compressImage('', 50)).rejects.toThrow(
        'Data URL is required'
      );
    });

    it('should throw for whitespace-only data url', async () => {
      await expect(service.compressImage('   ', 50)).rejects.toThrow(
        'Data URL is required'
      );
    });
  });

  describe('getPlatform', () => {
    it('should return the platform', () => {
      expect(service.getPlatform()).toBe('ios');
    });

    it('should return android when constructed with android', () => {
      const androidService = new CameraService('android');
      expect(androidService.getPlatform()).toBe('android');
    });

    it('should return web when constructed with web', () => {
      const webService = new CameraService('web');
      expect(webService.getPlatform()).toBe('web');
    });
  });
});
