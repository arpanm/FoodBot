/**
 * Platform abstraction types for multi-platform support
 */

import { Restaurant, MenuItem, CartItem } from '../../shared/types';

/**
 * Supported food delivery platforms
 */
export enum Platform {
  SWIGGY = 'swiggy',
  ZOMATO = 'zomato',
  UNKNOWN = 'unknown',
}

/**
 * Selector configuration with fallback support
 * Each selector is an array with priority-ordered fallbacks
 */
export interface SelectorConfig {
  // Search functionality
  searchInput: string[];
  searchButton: string[];

  // Restaurant listing
  restaurantCard: string[];
  restaurantName: string[];
  restaurantCuisine: string[];
  restaurantRating: string[];
  restaurantDeliveryTime: string[];
  restaurantDistance: string[];
  restaurantPriceForTwo: string[];

  // Menu page
  menuItem: string[];
  menuItemName: string[];
  menuItemPrice: string[];
  menuItemDescription: string[];
  menuItemRating: string[];
  menuItemImage: string[];
  menuCategory: string[];

  // Cart operations
  addToCartButton: string[];
  removeFromCartButton: string[];
  increaseQuantityButton: string[];
  decreaseQuantityButton: string[];
  quantityInput: string[];
  cartIcon: string[];
  cartItemCount: string[];
  cartTotal: string[];
  cartItems: string[];

  // Checkout page
  checkoutButton: string[];
  addressInput: string[];
  addressSuggestion: string[];
  addressSaveButton: string[];
  paymentOptions: string[];
  paymentCard: string[];
  paymentUPI: string[];
  paymentCash: string[];
  paymentWallet: string[];
  couponInput: string[];
  applyCouponButton: string[];
  placeOrderButton: string[];

  // Order confirmation
  orderIdElement: string[];
  orderStatus: string[];
  orderTotal: string[];

  // Common elements
  loader: string[];
  errorMessage: string[];
  modalOverlay: string[];
  closeButton: string[];
}

/**
 * Platform-specific configuration
 */
export interface PlatformConfig {
  platform: Platform;
  baseUrl: string;
  restaurantsUrl: string;
  cartUrl: string;
  checkoutUrl: string;
  selectors: SelectorConfig;
  urlPatterns: {
    home: RegExp;
    restaurantList: RegExp;
    restaurantDetail: RegExp;
    cart: RegExp;
    checkout: RegExp;
    orderConfirmation: RegExp;
  };
}

/**
 * Platform detection result
 */
export interface PlatformDetectionResult {
  platform: Platform;
  confidence: number;
  detection: {
    url: boolean;
    metaTags: boolean;
    domSignatures: boolean;
  };
}

/**
 * Message types for platform content scripts
 */
export interface ExtensionMessage {
  type: string;
  payload?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Response format for content script operations
 */
export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Result wrapper for operations
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Search result for restaurants
 */
export interface SearchResult {
  success: boolean;
  restaurants: Restaurant[];
  error?: string;
}

/**
 * Cart operation result
 */
export interface CartResult {
  success: boolean;
  cartItems: CartItem[];
  error?: string;
}

/**
 * Checkout operation result
 */
export interface CheckoutResult {
  success: boolean;
  orderId?: string;
  orderSummary?: {
    items: CartItem[];
    subtotal: number;
    deliveryFee: number;
    tax: number;
    total: number;
  };
  error?: string;
}

/**
 * Interface that all platform content scripts must implement
 */
export interface IPlatformContentScript {
  /**
   * Platform identifier
   */
  readonly platform: Platform;

  /**
   * Initialize the content script
   */
  initialize(): Promise<void>;

  /**
   * Handle incoming messages from background script
   */
  handleMessage(message: ExtensionMessage): Promise<MessageResponse>;

  /**
   * Get platform-specific selectors
   */
  getSelectors(): SelectorConfig;

  /**
   * Get platform configuration
   */
  getConfig(): PlatformConfig;

  /**
   * Extract restaurants from current page
   */
  extractRestaurants(): Restaurant[];

  /**
   * Extract menu items from current page
   */
  extractMenuItems(): MenuItem[];

  /**
   * Extract cart items from current page
   */
  extractCartItems(): CartItem[];

  /**
   * Search for a restaurant
   */
  searchRestaurant(restaurantName: string): Promise<SearchResult>;

  /**
   * Search for a dish
   */
  searchDish(dishName: string): Promise<SearchResult>;

  /**
   * Add item to cart
   */
  addToCart(options: {
    dishName: string;
    quantity?: number;
    customizations?: string[];
  }): Promise<CartResult>;

  /**
   * Remove item from cart
   */
  removeFromCart(dishName: string): Promise<CartResult>;

  /**
   * Get current cart contents
   */
  getCartContents(): Promise<CartResult>;

  /**
   * Clear cart
   */
  clearCart(): Promise<CartResult>;

  /**
   * Start checkout process
   */
  startCheckout(options?: {
    address?: string;
    paymentMethod?: 'card' | 'upi' | 'cash' | 'wallet';
    saveAddress?: boolean;
  }): Promise<CheckoutResult>;

  /**
   * Apply coupon code
   */
  applyCoupon(couponCode: string): Promise<boolean>;
}

/**
 * Page detector interface for platform-specific page detection
 */
export interface IPageDetector {
  /**
   * Detect platform from current page
   */
  detectPlatform(): PlatformDetectionResult;

  /**
   * Check if we're on the home page
   */
  isHomePage(): boolean;

  /**
   * Check if we're on the restaurant listing page
   */
  isRestaurantListPage(): boolean;

  /**
   * Check if we're on a restaurant detail/menu page
   */
  isRestaurantDetailPage(): boolean;

  /**
   * Check if we're on the cart page
   */
  isCartPage(): boolean;

  /**
   * Check if we're on the checkout page
   */
  isCheckoutPage(): boolean;

  /**
   * Check if we're on the order confirmation page
   */
  isOrderConfirmationPage(): boolean;
}
