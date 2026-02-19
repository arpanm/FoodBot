/**
 * Zomato page detector - Detects which page we're currently on
 */

import { IPageDetector, PlatformDetectionResult, Platform } from '../types';
import { ZOMATO_CONFIG } from './zomato-config';

export class ZomatoPageDetector implements IPageDetector {
  private readonly logger = console;
  private readonly config = ZOMATO_CONFIG;

  /**
   * Detect platform (should always return Zomato for this class)
   */
  public detectPlatform(): PlatformDetectionResult {
    const url = window.location.href.toLowerCase();

    if (url.includes('zomato.com')) {
      return {
        platform: Platform.ZOMATO,
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

    this.logger.log(`[ZomatoPageDetector] isHomePage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the restaurant listing page
   */
  public isRestaurantListPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.restaurantList.test(url);

    this.logger.log(`[ZomatoPageDetector] isRestaurantListPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on a restaurant detail/menu page
   */
  public isRestaurantDetailPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.restaurantDetail.test(url);

    this.logger.log(`[ZomatoPageDetector] isRestaurantDetailPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the cart page
   */
  public isCartPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.cart.test(url);

    this.logger.log(`[ZomatoPageDetector] isCartPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the checkout page
   */
  public isCheckoutPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.checkout.test(url);

    this.logger.log(`[ZomatoPageDetector] isCheckoutPage: ${match}`);
    return match;
  }

  /**
   * Check if we're on the order confirmation page
   */
  public isOrderConfirmationPage(): boolean {
    const url = window.location.href;
    const match = this.config.urlPatterns.orderConfirmation.test(url);

    this.logger.log(`[ZomatoPageDetector] isOrderConfirmationPage: ${match}`);
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
