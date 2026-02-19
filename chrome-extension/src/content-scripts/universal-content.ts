/**
 * Universal Content Script - Platform-agnostic entry point
 * Automatically detects platform and initializes appropriate content script
 */

import { PlatformFactory } from './platforms/platform-factory';
import { IPlatformContentScript } from './platforms/types';

/**
 * Universal content script that adapts to any supported platform
 */
class UniversalContentScript {
  private readonly logger = console;
  private platformScript: IPlatformContentScript | null = null;

  /**
   * Initialize the universal content script
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.log('🌐 [Universal] Detecting platform...');

      // Check if platform is supported
      if (!PlatformFactory.isSupported()) {
        this.logger.warn('[Universal] Current platform is not supported');
        return;
      }

      const platform = PlatformFactory.getDetectedPlatform();
      this.logger.log(`✅ [Universal] Platform detected: ${platform}`);

      // Create platform-specific content script
      this.platformScript = await PlatformFactory.createContentScript();

      if (!this.platformScript) {
        this.logger.error('[Universal] Failed to create platform content script');
        return;
      }

      // Initialize platform-specific content script
      await this.platformScript.initialize();

      this.logger.log(`✅ [Universal] ${platform} content script initialized`);
    } catch (error) {
      this.logger.error('[Universal] Failed to initialize content script:', error);
    }
  }

  /**
   * Get the platform-specific content script instance
   */
  public getPlatformScript(): IPlatformContentScript | null {
    return this.platformScript;
  }
}

// Initialize universal content script when loaded
const universalScript = new UniversalContentScript();
universalScript.initialize().catch((error) => {
  console.error('[Universal] Initialization error:', error);
});

// Export for testing
export default universalScript;
