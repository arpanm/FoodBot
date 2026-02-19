/**
 * Tests for Platform Factory and Platform Detection
 */

import { PlatformDetector, PlatformFactory } from '../../src/content-scripts/platforms/platform-factory';
import { Platform } from '../../src/content-scripts/platforms/types';

// Mock window.location
const mockLocation = (href: string, hostname: string) => {
  delete (window as { location?: unknown }).location;
  (window as { location: { href: string; hostname: string } }).location = {
    href,
    hostname,
  };
};

// Mock document
const mockDocument = (html: string) => {
  document.body.innerHTML = html;
};

describe('PlatformDetector', () => {
  let detector: PlatformDetector;

  beforeEach(() => {
    detector = new PlatformDetector();
  });

  describe('URL-based detection', () => {
    it('should detect Swiggy from URL', () => {
      mockLocation('https://www.swiggy.com/restaurants', 'www.swiggy.com');
      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.SWIGGY);
      expect(result.confidence).toBe(1.0);
      expect(result.detection.url).toBe(true);
    });

    it('should detect Zomato from URL', () => {
      mockLocation('https://www.zomato.com/restaurants', 'www.zomato.com');
      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.ZOMATO);
      expect(result.confidence).toBe(1.0);
      expect(result.detection.url).toBe(true);
    });

    it('should return UNKNOWN for unsupported platform', () => {
      mockLocation('https://www.example.com', 'www.example.com');
      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.UNKNOWN);
      expect(result.confidence).toBe(0);
    });
  });

  describe('Meta tag detection', () => {
    it('should detect Swiggy from meta tags', () => {
      mockLocation('https://example.com', 'example.com');
      mockDocument('<meta property="og:site_name" content="Swiggy" />');

      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.SWIGGY);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.detection.metaTags).toBe(true);
    });

    it('should detect Zomato from meta tags', () => {
      mockLocation('https://example.com', 'example.com');
      mockDocument('<meta property="og:site_name" content="Zomato" />');

      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.ZOMATO);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.detection.metaTags).toBe(true);
    });
  });

  describe('DOM signature detection', () => {
    it('should detect Swiggy from DOM signatures', () => {
      mockLocation('https://example.com', 'example.com');
      mockDocument('<div id="swiggy-app"></div>');

      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.SWIGGY);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.detection.domSignatures).toBe(true);
    });

    it('should detect Zomato from DOM signatures', () => {
      mockLocation('https://example.com', 'example.com');
      mockDocument('<div id="zomato-app"></div>');

      const result = detector.detectPlatform();

      expect(result.platform).toBe(Platform.ZOMATO);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.detection.domSignatures).toBe(true);
    });
  });

  describe('validatePlatform', () => {
    it('should validate correct platform', () => {
      mockLocation('https://www.swiggy.com', 'www.swiggy.com');
      const result = detector.validatePlatform(Platform.SWIGGY);

      expect(result).toBe(true);
    });

    it('should invalidate incorrect platform', () => {
      mockLocation('https://www.swiggy.com', 'www.swiggy.com');
      const result = detector.validatePlatform(Platform.ZOMATO);

      expect(result).toBe(false);
    });

    it('should invalidate low confidence detection', () => {
      mockLocation('https://example.com', 'example.com');
      const result = detector.validatePlatform(Platform.SWIGGY);

      expect(result).toBe(false);
    });
  });
});

describe('PlatformFactory', () => {
  beforeEach(() => {
    // Reset factory state
    jest.clearAllMocks();
  });

  describe('isSupported', () => {
    it('should return true for Swiggy', () => {
      mockLocation('https://www.swiggy.com', 'www.swiggy.com');
      const supported = PlatformFactory.isSupported();

      expect(supported).toBe(true);
    });

    it('should return true for Zomato', () => {
      mockLocation('https://www.zomato.com', 'www.zomato.com');
      const supported = PlatformFactory.isSupported();

      expect(supported).toBe(true);
    });

    it('should return false for unsupported platforms', () => {
      mockLocation('https://www.example.com', 'www.example.com');
      const supported = PlatformFactory.isSupported();

      expect(supported).toBe(false);
    });
  });

  describe('getDetectedPlatform', () => {
    it('should return detected platform', () => {
      mockLocation('https://www.swiggy.com', 'www.swiggy.com');
      const platform = PlatformFactory.getDetectedPlatform();

      expect(platform).toBe(Platform.SWIGGY);
    });
  });

  describe('createContentScript', () => {
    it('should create Swiggy content script', async () => {
      mockLocation('https://www.swiggy.com', 'www.swiggy.com');
      const script = await PlatformFactory.createContentScript();

      expect(script).not.toBeNull();
      expect(script?.platform).toBe(Platform.SWIGGY);
    });

    it('should create Zomato content script', async () => {
      mockLocation('https://www.zomato.com', 'www.zomato.com');
      const script = await PlatformFactory.createContentScript();

      expect(script).not.toBeNull();
      expect(script?.platform).toBe(Platform.ZOMATO);
    });

    it('should return null for unsupported platforms', async () => {
      mockLocation('https://www.example.com', 'www.example.com');
      const script = await PlatformFactory.createContentScript();

      expect(script).toBeNull();
    });

    it('should return null for low confidence detection', async () => {
      mockLocation('https://example.com', 'example.com');
      const script = await PlatformFactory.createContentScript();

      expect(script).toBeNull();
    });
  });
});
