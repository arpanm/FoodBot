/**
 * Content Scripts - Entry point for all content script modules
 */

// Platform abstraction exports
export { PlatformFactory, PlatformDetector } from './platforms/platform-factory';
export { SwiggyContentScript } from './platforms/swiggy/swiggy-content';
export { ZomatoContentScript } from './platforms/zomato/zomato-content';

export type {
  Platform,
  SelectorConfig,
  PlatformConfig,
  IPlatformContentScript,
  IPageDetector,
  PlatformDetectionResult,
  ExtensionMessage,
  MessageResponse,
  SearchResult,
  CartResult,
  CheckoutResult,
} from './platforms/types';

// Shared component exports (legacy)
export { DomParser } from './dom-parser';
export { ActionSimulator } from './action-simulator';
export { ElementFinder } from './element-finder';
export { SearchWorkflow } from './workflows/search-workflow';
export { CartWorkflow } from './workflows/cart-workflow';
export { CheckoutWorkflow } from './workflows/checkout-workflow';

export type {
  DOMSnapshot,
  ElementInfo,
  Restaurant,
  Dish,
  CartItem,
  OrderSummary,
} from './dom-parser';

export type {
  ClickOptions,
  TypeOptions,
  ScrollOptions,
} from './action-simulator';

export type {
  FindOptions,
} from './element-finder';

export type {
  SearchWorkflowOptions,
  SearchWorkflowResult,
} from './workflows/search-workflow';

export type {
  AddToCartOptions,
  CartWorkflowResult,
} from './workflows/cart-workflow';

export type {
  CheckoutOptions,
  CheckoutWorkflowResult,
} from './workflows/checkout-workflow';
