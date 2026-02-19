/**
 * Platform Factory - Creates appropriate content script based on platform detection
 */

import {
  Platform,
  PlatformDetectionResult,
  IPlatformContentScript,
} from './types';

/**
 * Multi-stage platform detection
 */
export class PlatformDetector {
  private readonly logger = console;

  /**
   * Detect platform using multi-stage approach
   * Stage 1: URL-based detection (fastest, most reliable)
   * Stage 2: Meta tag detection
   * Stage 3: DOM signature detection
   */
  public detectPlatform(): PlatformDetectionResult {
    const urlDetection = this.detectFromURL();
    const metaDetection = this.detectFromMetaTags();
    const domDetection = this.detectFromDOMSignatures();

    // Priority: URL > Meta > DOM
    let platform = Platform.UNKNOWN;
    let confidence = 0;

    if (urlDetection.platform !== Platform.UNKNOWN) {
      platform = urlDetection.platform;
      confidence = urlDetection.confidence;
    } else if (metaDetection.platform !== Platform.UNKNOWN) {
      platform = metaDetection.platform;
      confidence = metaDetection.confidence;
    } else if (domDetection.platform !== Platform.UNKNOWN) {
      platform = domDetection.platform;
      confidence = domDetection.confidence;
    }

    this.logger.log(`Platform detected: ${platform} (confidence: ${confidence})`);

    return {
      platform,
      confidence,
      detection: {
        url: urlDetection.platform !== Platform.UNKNOWN,
        metaTags: metaDetection.platform !== Platform.UNKNOWN,
        domSignatures: domDetection.platform !== Platform.UNKNOWN,
      },
    };
  }

  /**
   * Stage 1: URL-based detection
   */
  private detectFromURL(): { platform: Platform; confidence: number } {
    const url = window.location.href.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();

    // Swiggy patterns
    if (
      hostname.includes('swiggy.com') ||
      url.includes('swiggy.com') ||
      hostname === 'www.swiggy.com'
    ) {
      return { platform: Platform.SWIGGY, confidence: 1.0 };
    }

    // Zomato patterns
    if (
      hostname.includes('zomato.com') ||
      url.includes('zomato.com') ||
      hostname === 'www.zomato.com'
    ) {
      return { platform: Platform.ZOMATO, confidence: 1.0 };
    }

    return { platform: Platform.UNKNOWN, confidence: 0 };
  }

  /**
   * Stage 2: Meta tag detection
   */
  private detectFromMetaTags(): { platform: Platform; confidence: number } {
    // Check meta tags for platform identifiers
    const metaTags = document.querySelectorAll('meta');

    for (const meta of Array.from(metaTags)) {
      const property = meta.getAttribute('property')?.toLowerCase() || '';
      const name = meta.getAttribute('name')?.toLowerCase() || '';
      const content = meta.getAttribute('content')?.toLowerCase() || '';

      // Swiggy meta tags
      if (
        property.includes('swiggy') ||
        name.includes('swiggy') ||
        content.includes('swiggy')
      ) {
        return { platform: Platform.SWIGGY, confidence: 0.9 };
      }

      // Zomato meta tags
      if (
        property.includes('zomato') ||
        name.includes('zomato') ||
        content.includes('zomato')
      ) {
        return { platform: Platform.ZOMATO, confidence: 0.9 };
      }

      // Check og:site_name
      if (property === 'og:site_name') {
        if (content.includes('swiggy')) {
          return { platform: Platform.SWIGGY, confidence: 0.95 };
        }
        if (content.includes('zomato')) {
          return { platform: Platform.ZOMATO, confidence: 0.95 };
        }
      }
    }

    return { platform: Platform.UNKNOWN, confidence: 0 };
  }

  /**
   * Stage 3: DOM signature detection
   */
  private detectFromDOMSignatures(): { platform: Platform; confidence: number } {
    // Swiggy-specific DOM signatures
    const swiggySignatures = [
      '#root[data-testid*="swiggy"]',
      '[class*="_swiggy"]',
      '[class*="Swiggy"]',
      '#swiggy-app',
      '[data-testid="swiggy-logo"]',
    ];

    for (const selector of swiggySignatures) {
      if (document.querySelector(selector)) {
        return { platform: Platform.SWIGGY, confidence: 0.8 };
      }
    }

    // Zomato-specific DOM signatures
    const zomatoSignatures = [
      '#root[data-theme*="zomato"]',
      '[class*="_zomato"]',
      '[class*="Zomato"]',
      '#zomato-app',
      '[data-testid="zomato-logo"]',
    ];

    for (const selector of zomatoSignatures) {
      if (document.querySelector(selector)) {
        return { platform: Platform.ZOMATO, confidence: 0.8 };
      }
    }

    // Check for specific text patterns in the page
    const bodyText = document.body.textContent?.toLowerCase() || '';

    // Swiggy pattern
    if (bodyText.includes('swiggy') && bodyText.includes('food delivery')) {
      return { platform: Platform.SWIGGY, confidence: 0.7 };
    }

    // Zomato pattern
    if (bodyText.includes('zomato') && bodyText.includes('food delivery')) {
      return { platform: Platform.ZOMATO, confidence: 0.7 };
    }

    return { platform: Platform.UNKNOWN, confidence: 0 };
  }

  /**
   * Validate platform detection
   */
  public validatePlatform(platform: Platform): boolean {
    const detection = this.detectPlatform();
    return detection.platform === platform && detection.confidence > 0.5;
  }
}

/**
 * Platform Factory - Creates appropriate content script instance
 */
export class PlatformFactory {
  private static readonly logger = console;
  private static detector = new PlatformDetector();

  /**
   * Create platform-specific content script
   */
  public static async createContentScript(): Promise<IPlatformContentScript | null> {
    try {
      const detection = this.detector.detectPlatform();

      if (detection.confidence < 0.5) {
        this.logger.warn(
          `Low confidence platform detection: ${detection.platform} (${detection.confidence})`
        );
        return null;
      }

      switch (detection.platform) {
        case Platform.SWIGGY:
          const { SwiggyContentScript } = await import('../platforms/swiggy/swiggy-content');
          return new SwiggyContentScript();

        case Platform.ZOMATO:
          const { ZomatoContentScript } = await import('../platforms/zomato/zomato-content');
          return new ZomatoContentScript();

        case Platform.UNKNOWN:
        default:
          this.logger.warn(`Unknown platform: ${detection.platform}`);
          return null;
      }
    } catch (error) {
      this.logger.error('Failed to create content script:', error);
      return null;
    }
  }

  /**
   * Get platform detector instance
   */
  public static getDetector(): PlatformDetector {
    return this.detector;
  }

  /**
   * Check if current page is supported
   */
  public static isSupported(): boolean {
    const detection = this.detector.detectPlatform();
    return (
      detection.platform !== Platform.UNKNOWN &&
      detection.confidence > 0.5
    );
  }

  /**
   * Get detected platform
   */
  public static getDetectedPlatform(): Platform {
    return this.detector.detectPlatform().platform;
  }
}
