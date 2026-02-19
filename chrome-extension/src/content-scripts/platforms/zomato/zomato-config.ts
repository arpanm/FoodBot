/**
 * Zomato platform configuration
 */

import { Platform, PlatformConfig } from '../types';
import { ZOMATO_SELECTORS } from './zomato-selectors';

export const ZOMATO_CONFIG: PlatformConfig = {
  platform: Platform.ZOMATO,
  baseUrl: 'https://www.zomato.com',
  restaurantsUrl: 'https://www.zomato.com/restaurants',
  cartUrl: 'https://www.zomato.com/cart',
  checkoutUrl: 'https://www.zomato.com/checkout',
  selectors: ZOMATO_SELECTORS,
  urlPatterns: {
    home: /^https?:\/\/(www\.)?zomato\.com\/?$/i,
    restaurantList: /^https?:\/\/(www\.)?zomato\.com\/(city\/.+\/restaurants|restaurants)$/i,
    restaurantDetail: /^https?:\/\/(www\.)?zomato\.com\/.+\/restaurant\/.+$/i,
    cart: /^https?:\/\/(www\.)?zomato\.com\/cart$/i,
    checkout: /^https?:\/\/(www\.)?zomato\.com\/checkout$/i,
    orderConfirmation: /^https?:\/\/(www\.)?zomato\.com\/(order\/confirm|order-status)\/.+$/i,
  },
};
