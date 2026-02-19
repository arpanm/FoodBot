/**
 * Swiggy Content Script - Platform-specific implementation
 */

import { DomParser, Restaurant, Dish, CartItem as DomCartItem } from '../../dom-parser';
import { ActionSimulator } from '../../action-simulator';
import { ElementFinder } from '../../element-finder';
import { SearchWorkflow } from '../../workflows/search-workflow';
import { CartWorkflow } from '../../workflows/cart-workflow';
import { CheckoutWorkflow } from '../../workflows/checkout-workflow';

import {
  Platform,
  SelectorConfig,
  PlatformConfig,
  IPlatformContentScript,
  ExtensionMessage,
  MessageResponse,
  SearchResult,
  CartResult,
  CheckoutResult,
} from '../types';

import { SWIGGY_CONFIG } from './swiggy-config';
import { SwiggyPageDetector } from './swiggy-page-detector';

// Import legacy types for backward compatibility
import {
  MessageType,
  PageAnalysis,
  PageType,
  PageElement,
  BrowserAction,
  ActionInstruction,
  MenuItem,
  CartItem,
} from '../../../shared/types';

/**
 * Swiggy-specific content script implementation
 */
export class SwiggyContentScript implements IPlatformContentScript {
  public readonly platform = Platform.SWIGGY;
  private readonly logger = console;
  private readonly config: PlatformConfig;
  private readonly pageDetector: SwiggyPageDetector;
  private readonly domParser: DomParser;
  private readonly actionSimulator: ActionSimulator;
  private readonly elementFinder: ElementFinder;
  private readonly searchWorkflow: SearchWorkflow;
  private readonly cartWorkflow: CartWorkflow;
  private readonly checkoutWorkflow: CheckoutWorkflow;
  private isInitialized = false;

  constructor() {
    this.config = SWIGGY_CONFIG;
    this.pageDetector = new SwiggyPageDetector();
    this.domParser = new DomParser();
    this.actionSimulator = new ActionSimulator();
    this.elementFinder = new ElementFinder();
    this.searchWorkflow = new SearchWorkflow();
    this.cartWorkflow = new CartWorkflow();
    this.checkoutWorkflow = new CheckoutWorkflow();
  }

  /**
   * Get platform-specific selectors
   */
  public getSelectors(): SelectorConfig {
    return this.config.selectors;
  }

  /**
   * Get platform configuration
   */
  public getConfig(): PlatformConfig {
    return this.config;
  }

  /**
   * Initialize content script
   */
  public async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        this.logger.warn('[Swiggy] Content script already initialized');
        return;
      }

      this.logger.log('🚀 [Swiggy] Initializing content script...');

      // Wait for page to be ready
      if (document.readyState !== 'complete') {
        await new Promise<void>((resolve) => {
          window.addEventListener('load', () => resolve());
        });
      }

      // Set up message listener
      this.setupMessageListener();

      // Inject CSS for highlighting elements
      this.injectStyles();

      // Notify background script that content script is ready
      this.notifyReady();

      this.isInitialized = true;
      this.logger.log('✅ [Swiggy] Content script initialized');
    } catch (error) {
      this.logger.error('[Swiggy] Failed to initialize content script:', error);
      throw error;
    }
  }

  /**
   * Set up message listener for background script
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener(
      (message: ExtensionMessage, _sender, sendResponse: (response: MessageResponse) => void) => {
        this.handleMessage(message)
          .then((response) => sendResponse(response))
          .catch((error) => {
            sendResponse({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });

        // Return true to indicate async response
        return true;
      }
    );
  }

  /**
   * Handle incoming messages from background script
   */
  public async handleMessage(message: ExtensionMessage): Promise<MessageResponse> {
    try {
      this.logger.log('[Swiggy] Received message:', message.type, message.payload);

      switch (message.type) {
        // New workflow-based messages
        case 'GET_DOM_SNAPSHOT':
          return await this.handleGetDOMSnapshot();

        case 'SEARCH_RESTAURANT':
          return await this.handleSearchRestaurant(message.payload as Record<string, unknown>);

        case 'SEARCH_DISH':
          return await this.handleSearchDish(message.payload as Record<string, unknown>);

        case 'ADD_TO_CART':
          return await this.handleAddToCart(message.payload as Record<string, unknown>);

        case 'REMOVE_FROM_CART':
          return await this.handleRemoveFromCart(message.payload as Record<string, unknown>);

        case 'UPDATE_CART_QUANTITY':
          return await this.handleUpdateCartQuantity(message.payload as Record<string, unknown>);

        case 'GET_CART_CONTENTS':
          return await this.handleGetCartContents();

        case 'CLEAR_CART':
          return await this.handleClearCart();

        case 'START_CHECKOUT':
          return await this.handleStartCheckout(message.payload as Record<string, unknown>);

        case 'APPLY_COUPON':
          return await this.handleApplyCoupon(message.payload as Record<string, unknown>);

        // Legacy message types for backward compatibility
        case MessageType.START_ORDER:
          return await this.handleStartOrder(message.payload);

        case MessageType.EXTRACT_MENU:
          return await this.handleExtractMenu();

        case MessageType.ANALYZE_PAGE:
          return await this.handleAnalyzePage();

        case MessageType.EXECUTE_ACTION:
          return await this.handleExecuteAction(message.payload as ActionInstruction);

        default:
          return {
            success: false,
            error: `Unknown message type: ${message.type}`,
          };
      }
    } catch (error) {
      this.logger.error('[Swiggy] Error handling message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract restaurants from current page
   */
  public extractRestaurants(): Restaurant[] {
    return this.domParser.extractRestaurants();
  }

  /**
   * Extract menu items from current page
   */
  public extractMenuItems(): MenuItem[] {
    const dishes = this.domParser.extractMenuItems();
    return dishes.map((dish) => this.convertDishToMenuItem(dish));
  }

  /**
   * Extract cart items from current page
   */
  public extractCartItems(): CartItem[] {
    const domCartItems = this.domParser.extractCartItems();
    return domCartItems.map((item) => this.convertDomCartItemToCartItem(item));
  }

  /**
   * Search for a restaurant
   */
  public async searchRestaurant(restaurantName: string): Promise<SearchResult> {
    const result = await this.searchWorkflow.searchRestaurant(restaurantName);
    return {
      success: result.success,
      restaurants: result.restaurants,
      error: result.error,
    };
  }

  /**
   * Search for a dish
   */
  public async searchDish(dishName: string): Promise<SearchResult> {
    const result = await this.searchWorkflow.searchDish(dishName);
    return {
      success: result.success,
      restaurants: result.restaurants,
      error: result.error,
    };
  }

  /**
   * Add item to cart
   */
  public async addToCart(options: {
    dishName: string;
    quantity?: number;
    customizations?: string[];
  }): Promise<CartResult> {
    const result = await this.cartWorkflow.addToCart({
      dishName: options.dishName,
      quantity: options.quantity,
      customizations: options.customizations,
    });

    return {
      success: result.success,
      cartItems: result.cartItems.map((item) => this.convertDomCartItemToCartItem(item)),
      error: result.error,
    };
  }

  /**
   * Remove item from cart
   */
  public async removeFromCart(dishName: string): Promise<CartResult> {
    const result = await this.cartWorkflow.removeFromCart(dishName);
    return {
      success: result.success,
      cartItems: result.cartItems.map((item) => this.convertDomCartItemToCartItem(item)),
      error: result.error,
    };
  }

  /**
   * Get current cart contents
   */
  public async getCartContents(): Promise<CartResult> {
    const result = await this.cartWorkflow.getCartContents();
    return {
      success: result.success,
      cartItems: result.cartItems.map((item) => this.convertDomCartItemToCartItem(item)),
      error: result.error,
    };
  }

  /**
   * Clear cart
   */
  public async clearCart(): Promise<CartResult> {
    const result = await this.cartWorkflow.clearCart();
    return {
      success: result.success,
      cartItems: result.cartItems.map((item) => this.convertDomCartItemToCartItem(item)),
      error: result.error,
    };
  }

  /**
   * Start checkout process
   */
  public async startCheckout(options?: {
    address?: string;
    paymentMethod?: 'card' | 'upi' | 'cash' | 'wallet';
    saveAddress?: boolean;
  }): Promise<CheckoutResult> {
    const result = await this.checkoutWorkflow.execute(options);
    return {
      success: result.success,
      orderId: result.orderId,
      orderSummary: result.orderSummary,
      error: result.error,
    };
  }

  /**
   * Apply coupon code
   */
  public async applyCoupon(couponCode: string): Promise<boolean> {
    return await this.checkoutWorkflow.applyCoupon(couponCode);
  }

  // Private helper methods for message handlers

  private async handleGetDOMSnapshot(): Promise<MessageResponse> {
    const snapshot = this.domParser.buildDOMSnapshot();
    return {
      success: true,
      data: snapshot,
    };
  }

  private async handleSearchRestaurant(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { restaurantName } = payload;

    if (typeof restaurantName !== 'string') {
      return {
        success: false,
        error: 'restaurantName is required',
      };
    }

    const result = await this.searchRestaurant(restaurantName);
    return {
      success: result.success,
      data: { restaurants: result.restaurants },
      error: result.error,
    };
  }

  private async handleSearchDish(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { dishName } = payload;

    if (typeof dishName !== 'string') {
      return {
        success: false,
        error: 'dishName is required',
      };
    }

    const result = await this.searchDish(dishName);
    return {
      success: result.success,
      data: { restaurants: result.restaurants },
      error: result.error,
    };
  }

  private async handleAddToCart(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { dishName, quantity = 1, customizations = [] } = payload;

    if (typeof dishName !== 'string') {
      return {
        success: false,
        error: 'dishName is required',
      };
    }

    const result = await this.addToCart({
      dishName,
      quantity: quantity as number,
      customizations: customizations as string[],
    });

    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  private async handleRemoveFromCart(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { dishName } = payload;

    if (typeof dishName !== 'string') {
      return {
        success: false,
        error: 'dishName is required',
      };
    }

    const result = await this.removeFromCart(dishName);
    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  private async handleUpdateCartQuantity(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { dishName, quantity } = payload;

    if (typeof dishName !== 'string' || typeof quantity !== 'number') {
      return {
        success: false,
        error: 'dishName and quantity are required',
      };
    }

    const result = await this.cartWorkflow.updateCartItemQuantity(dishName, quantity);
    return {
      success: result.success,
      data: { cartItems: result.cartItems.map((item) => this.convertDomCartItemToCartItem(item)) },
      error: result.error,
    };
  }

  private async handleGetCartContents(): Promise<MessageResponse> {
    const result = await this.getCartContents();
    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  private async handleClearCart(): Promise<MessageResponse> {
    const result = await this.clearCart();
    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  private async handleStartCheckout(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { address, paymentMethod, saveAddress } = payload;

    const result = await this.startCheckout({
      address: address as string | undefined,
      paymentMethod: paymentMethod as 'card' | 'upi' | 'cash' | 'wallet' | undefined,
      saveAddress: saveAddress as boolean | undefined,
    });

    return {
      success: result.success,
      data: {
        orderSummary: result.orderSummary,
        orderId: result.orderId,
      },
      error: result.error,
    };
  }

  private async handleApplyCoupon(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { couponCode } = payload;

    if (typeof couponCode !== 'string') {
      return {
        success: false,
        error: 'couponCode is required',
      };
    }

    const success = await this.applyCoupon(couponCode);
    return {
      success,
      error: success ? undefined : 'Failed to apply coupon',
    };
  }

  // Legacy handlers for backward compatibility

  private async handleStartOrder(payload: unknown): Promise<MessageResponse> {
    this.logger.log('[Swiggy] Starting order automation with payload:', payload);

    const pageAnalysis = await this.analyzePage();

    return {
      success: true,
      data: pageAnalysis,
    };
  }

  private async handleExtractMenu(): Promise<MessageResponse> {
    const menuItems = this.extractMenuItems();
    return {
      success: true,
      data: menuItems,
    };
  }

  private async handleAnalyzePage(): Promise<MessageResponse> {
    const pageAnalysis = await this.analyzePage();
    return {
      success: true,
      data: pageAnalysis,
    };
  }

  private async handleExecuteAction(instruction: ActionInstruction): Promise<MessageResponse> {
    this.logger.log('[Swiggy] Executing action:', instruction.action);

    try {
      switch (instruction.action) {
        case BrowserAction.SEARCH_RESTAURANT:
          await this.legacySearchRestaurant(instruction.value as string);
          break;

        case BrowserAction.SELECT_RESTAURANT:
          await this.legacySelectRestaurant(instruction.target as string);
          break;

        case BrowserAction.ADD_TO_CART:
          await this.legacyAddToCart(instruction.target as string);
          break;

        case BrowserAction.CHECKOUT:
          await this.legacyCheckout();
          break;

        case BrowserAction.WAIT:
          await this.legacyWait(instruction.value as number);
          break;

        default:
          throw new Error(`Unknown action: ${instruction.action}`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Legacy methods

  private async analyzePage(): Promise<PageAnalysis> {
    const url = window.location.href;
    const pageType = this.detectPageType();

    const analysis: PageAnalysis = {
      url,
      platform: 'swiggy',
      pageType,
      elements: this.extractPageElements(),
    };

    switch (pageType) {
      case PageType.RESTAURANT_LIST:
        analysis.restaurants = this.extractRestaurants();
        break;
      case PageType.RESTAURANT_DETAIL:
        analysis.menuItems = this.extractMenuItems();
        break;
      case PageType.CART:
        analysis.cartItems = this.extractCartItems();
        break;
    }

    return analysis;
  }

  private detectPageType(): PageType {
    if (this.pageDetector.isOrderConfirmationPage()) return PageType.ORDER_CONFIRMATION;
    if (this.pageDetector.isCheckoutPage()) return PageType.CHECKOUT;
    if (this.pageDetector.isCartPage()) return PageType.CART;
    if (this.pageDetector.isRestaurantDetailPage()) return PageType.RESTAURANT_DETAIL;
    if (this.pageDetector.isRestaurantListPage()) return PageType.RESTAURANT_LIST;
    if (this.pageDetector.isHomePage()) return PageType.HOME;
    return PageType.HOME;
  }

  private extractPageElements(): PageElement[] {
    const snapshot = this.domParser.buildDOMSnapshot();
    return snapshot.elements.map((el) => ({
      type: el.tag,
      selector: `#${el.id}`,
      text: el.text,
      attributes: Object.fromEntries(
        Object.entries({
          role: el.role,
          ariaLabel: el.ariaLabel,
        }).filter(([_, value]) => value !== undefined) as [string, string][]
      ),
    }));
  }

  private async legacySearchRestaurant(query: string): Promise<void> {
    const searchInput = await this.elementFinder.findSearchInput();
    if (searchInput) {
      await this.actionSimulator.typeIntoInput(searchInput, query, { pressEnter: true });
    }
  }

  private async legacySelectRestaurant(restaurantName: string): Promise<void> {
    const restaurants = this.domParser.extractRestaurants();
    const restaurant = restaurants.find((r) =>
      r.name.toLowerCase().includes(restaurantName.toLowerCase())
    );
    if (restaurant) {
      await this.actionSimulator.clickElement(restaurant.element);
    }
  }

  private async legacyAddToCart(itemName: string): Promise<void> {
    await this.cartWorkflow.addToCart({ dishName: itemName });
  }

  private async legacyCheckout(): Promise<void> {
    await this.checkoutWorkflow.execute();
  }

  private async legacyWait(ms: number): Promise<void> {
    await this.actionSimulator.waitForPageIdle(ms);
  }

  // Type conversion helpers

  private convertDishToMenuItem(dish: Dish): MenuItem {
    return {
      id: dish.id,
      name: dish.name,
      price: dish.price,
      description: dish.description,
      isVeg: dish.isVeg,
      rating: dish.rating,
      available: true,
    };
  }

  private convertDomCartItemToCartItem(item: DomCartItem): CartItem {
    return {
      menuItemId: item.menuItemId,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      customizations: item.customizations,
    };
  }

  /**
   * Inject custom styles for element highlighting
   */
  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .foodbot-highlight {
        outline: 2px solid #ff6b35 !important;
        outline-offset: 2px !important;
        animation: foodbot-pulse 1s infinite;
      }

      @keyframes foodbot-pulse {
        0%, 100% {
          outline-color: #ff6b35;
        }
        50% {
          outline-color: #ffa500;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Notify background script that content script is ready
   */
  private notifyReady(): void {
    chrome.runtime.sendMessage({
      type: MessageType.UPDATE_STATUS,
      payload: {
        status: 'ready',
        platform: this.platform,
        url: window.location.href,
        timestamp: Date.now(),
      },
    });
  }
}
