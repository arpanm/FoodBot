/**
 * Swiggy page detector - Detects which page we're currently on
 */

import { IPageDetector, PlatformDetectionResult, Platform } from '../types';
import { SWIGGY_CONFIG } from './swiggy-config';

export class SwiggyPageDetector implements IPageDetector {
  private readonly logger = console;
  private readonly config = SWIGGY_CONFIG;

  /**
   * Detect platform (should always return Swiggy for this class)
   */
  public detectPlatform(): PlatformDetectionResult {
    const url = window.location.href.toLowerCase();

    if (url.includes('swiggy.com')) {
      return {
        platform: Platform.SWIGGY,
        confidence: 1.0,
        detection: {
          url: true,
          metaTags: false,
          domSignatures: false,
        },
      };
    }

    return {
      platform: Platform.UNKNOWN,
      confidence: 0,
      detection: {
        url: false,
        metaTags: false,
        domSignatures: false,
      },
    };
  }

  /**
   * Check if we're on the home page
   */
  public isHomePage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.home.test(url);

    this.logger.log(`[SwiggyPageDetector] isHomePage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the restaurant listing page
   */
  public isRestaurantListPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.restaurantList.test(url);

    this.logger.log(`[SwiggyPageDetector] isRestaurantListPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on a restaurant detail/menu page
   */
  public isRestaurantDetailPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.restaurantDetail.test(url);

    this.logger.log(`[SwiggyPageDetector] isRestaurantDetailPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the cart page
   */
  public isCartPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.cart.test(url);

    this.logger.log(`[SwiggyPageDetector] isCartPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the checkout page
   */
  public isCheckoutPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.checkout.test(url);

    this.logger.log(`[SwiggyPageDetector] isCheckoutPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the order confirmation page
   */
  public isOrderConfirmationPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.orderConfirmation.test(url);

    this.logger.log(`[SwiggyPageDetector] isOrderConfirmationPage: ${match}`);
    return match;
  }

  /**
   * Get current page type as string
   */
  public getCurrentPageType(): string {
    if (this.isOrderConfirmationPage()) return 'ORDER_CONFIRMATION';
    if (this.isCheckoutPage()) return 'CHECKOUT';
    if (this.isCartPage()) return 'CART';
    if (this.isRestaurantDetailPage()) return 'RESTAURANT_DETAIL';
    if (this.isRestaurantListPage()) return 'RESTAURANT_LIST';
    if (this.isHomePage()) return 'HOME';
    return 'UNKNOWN';
  }
}
