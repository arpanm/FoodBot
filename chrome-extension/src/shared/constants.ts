/**
 * Shared constants for FoodBot Chrome Extension
 */

// API Configuration
export const API_CONFIG = {
  PRODUCTION_URL: 'https://api.foodbot.com',
  DEVELOPMENT_URL: 'http://localhost:3000',
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Platform URLs
export const PLATFORM_URLS = {
  SWIGGY: {
    BASE: 'https://www.swiggy.com',
    RESTAURANTS: 'https://www.swiggy.com/restaurants',
  },
  ZOMATO: {
    BASE: 'https://www.zomato.com',
    RESTAURANTS: 'https://www.zomato.com/restaurants',
  },
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  SESSION_ID: 'foodbot_session_id',
  USER_ID: 'foodbot_user_id',
  API_KEY: 'foodbot_api_key',
  CURRENT_ORDER: 'foodbot_current_order',
  PREFERENCES: 'foodbot_preferences',
  AUTH_TOKEN: 'foodbot_auth_token',
} as const;

// Timeouts
export const TIMEOUTS = {
  PAGE_LOAD: 10000,
  ELEMENT_WAIT: 5000,
  ACTION_DELAY: 1000,
  LLM_REQUEST: 30000,
  API_REQUEST: 10000,
} as const;

// Selectors for Swiggy
export const SWIGGY_SELECTORS = {
  SEARCH_INPUT: 'input[placeholder*="Search"]',
  RESTAURANT_CARD: '[data-testid="restaurant-card"]',
  MENU_ITEM: '[data-testid="menu-item"]',
  ADD_TO_CART_BUTTON: 'button:has-text("ADD")',
  CART_ICON: '[data-testid="cart-icon"]',
  CHECKOUT_BUTTON: 'button:has-text("Checkout")',
  ADDRESS_INPUT: 'input[placeholder*="address"]',
  PLACE_ORDER_BUTTON: 'button:has-text("Place Order")',
} as const;

// Selectors for Zomato
export const ZOMATO_SELECTORS = {
  SEARCH_INPUT: 'input[placeholder*="Search"]',
  RESTAURANT_CARD: '.restaurant-card',
  MENU_ITEM: '.menu-item',
  ADD_TO_CART_BUTTON: 'button:contains("Add")',
  CART_ICON: '.cart-icon',
  CHECKOUT_BUTTON: 'button:contains("Checkout")',
  ADDRESS_INPUT: 'input[name="address"]',
  PLACE_ORDER_BUTTON: 'button:contains("Place Order")',
} as const;

// Messages
export const MESSAGES = {
  EXTENSION_READY: 'FoodBot extension is ready',
  ORDER_STARTED: 'Starting order process...',
  ANALYZING_PAGE: 'Analyzing page...',
  WAITING_FOR_LLM: 'Waiting for AI response...',
  EXECUTING_ACTION: 'Executing action...',
  ORDER_COMPLETE: 'Order completed successfully!',
  ORDER_FAILED: 'Order failed. Please try again.',
} as const;

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  ELEMENT_NOT_FOUND: 'ELEMENT_NOT_FOUND',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  PAGE_LOAD_ERROR: 'PAGE_LOAD_ERROR',
  LLM_ERROR: 'LLM_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Action Delays (ms)
export const ACTION_DELAYS = {
  CLICK: 500,
  TYPE: 100,
  SCROLL: 300,
  WAIT_FOR_NAVIGATION: 2000,
  WAIT_FOR_ELEMENT: 1000,
} as const;

// LLM Configuration
export const LLM_CONFIG = {
  MODEL: 'claude-3-5-sonnet-20241022',
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  SYSTEM_PROMPT: `You are FoodBot, an AI assistant that helps users order food online.
You analyze web pages and provide step-by-step instructions to complete food orders.
You have access to the current page's HTML structure and can see available restaurants and menu items.
Provide clear, actionable instructions in JSON format.`,
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  ICON_URL: chrome.runtime.getURL('images/icon48.png'),
  DEFAULT_PRIORITY: 1,
  TIMEOUT_MS: 5000,
} as const;

// Chrome Storage Quota
export const STORAGE_QUOTA = {
  MAX_SESSIONS: 10,
  SESSION_EXPIRY_HOURS: 24,
  CLEANUP_INTERVAL_MS: 3600000, // 1 hour
} as const;

// Feature Flags
export const FEATURE_FLAGS = {
  ENABLE_ZOMATO: true, // Zomato support now available
  ENABLE_VOICE_COMMANDS: false, // Future feature
  ENABLE_ANALYTICS: true,
  ENABLE_DEBUG_LOGGING: true,
} as const;

// Version
export const VERSION = '1.0.0';
