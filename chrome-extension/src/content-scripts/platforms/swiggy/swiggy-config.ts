/**
 * Swiggy platform configuration
 */

import { Platform, PlatformConfig } from '../types';
import { SWIGGY_SELECTORS } from './swiggy-selectors';

export const SWIGGY_CONFIG: PlatformConfig = {
  platform: Platform.SWIGGY,
  baseUrl: 'https://www.swiggy.com',
  restaurantsUrl: 'https://www.swiggy.com/restaurants',
  cartUrl: 'https://www.swiggy.com/cart',
  checkoutUrl: 'https://www.swiggy.com/checkout',
  selectors: SWIGGY_SELECTORS,
  urlPatterns: {
    home: /^https?:\/\/(www\.)?swiggy\.com\/?$/i,
    restaurantList: /^https?:\/\/(www\.)?swiggy\.com\/(restaurants|city\/.+)$/i,
    restaurantDetail: /^https?:\/\/(www\.)?swiggy\.com\/restaurants\/.+\/menu\/.+$/i,
    cart: /^https?:\/\/(www\.)?swiggy\.com\/cart$/i,
    checkout: /^https?:\/\/(www\.)?swiggy\.com\/checkout$/i,
    orderConfirmation: /^https?:\/\/(www\.)?swiggy\.com\/(order-confirmation|track-order)\/.+$/i,
  },
};
