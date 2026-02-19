/**
 * Swiggy Content Script - Main entry point for Swiggy page automation
 */

import { DomParser } from './dom-parser';
import { ActionSimulator } from './action-simulator';
import { ElementFinder } from './element-finder';
import { SearchWorkflow } from './workflows/search-workflow';
import { CartWorkflow } from './workflows/cart-workflow';
import { CheckoutWorkflow } from './workflows/checkout-workflow';

// Import legacy types for backward compatibility
import {
  MessageType,
  ExtensionMessage,
  PageAnalysis,
  PageType,
  PageElement,
  BrowserAction,
  ActionInstruction,
} from '../shared/types';

export interface MessageResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Main content script class for Swiggy
 */
export class SwiggyContentScript {
  private readonly logger = console;
  private readonly domParser: DomParser;
  private readonly actionSimulator: ActionSimulator;
  private readonly elementFinder: ElementFinder;
  private readonly searchWorkflow: SearchWorkflow;
  private readonly cartWorkflow: CartWorkflow;
  private readonly checkoutWorkflow: CheckoutWorkflow;
  private isInitialized = false;

  constructor() {
    this.domParser = new DomParser();
    this.actionSimulator = new ActionSimulator();
    this.elementFinder = new ElementFinder();
    this.searchWorkflow = new SearchWorkflow();
    this.cartWorkflow = new CartWorkflow();
    this.checkoutWorkflow = new CheckoutWorkflow();
  }

  /**
   * Initialize content script
   */
  public async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        this.logger.warn('Content script already initialized');
        return;
      }

      this.logger.log('🚀 Initializing Swiggy content script...');

      // Wait for page to be ready
      if (document.readyState !== 'complete') {
        await new Promise<void>((resolve) => {
          window.addEventListener('load', () => resolve());
        });
      }

      // Set up message listener
      this.setupMessageListener();

      // Inject CSS for highlighting elements (optional)
      this.injectStyles();

      // Notify background script that content script is ready
      this.notifyReady();

      this.isInitialized = true;
      this.logger.log('✅ Swiggy content script initialized');
    } catch (error) {
      this.logger.error('Failed to initialize content script:', error);
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
      this.logger.log('Received message:', message.type, message.payload);

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
      this.logger.error('Error handling message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Handler: Get DOM snapshot
   */
  private async handleGetDOMSnapshot(): Promise<MessageResponse> {
    const snapshot = this.domParser.buildDOMSnapshot();
    return {
      success: true,
      data: snapshot,
    };
  }

  /**
   * Handler: Search restaurant
   */
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

    const result = await this.searchWorkflow.searchRestaurant(restaurantName);
    return {
      success: result.success,
      data: { restaurants: result.restaurants },
      error: result.error,
    };
  }

  /**
   * Handler: Search dish
   */
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

    const result = await this.searchWorkflow.searchDish(dishName);
    return {
      success: result.success,
      data: { restaurants: result.restaurants },
      error: result.error,
    };
  }

  /**
   * Handler: Add to cart
   */
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

    const result = await this.cartWorkflow.addToCart({
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

  /**
   * Handler: Remove from cart
   */
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

    const result = await this.cartWorkflow.removeFromCart(dishName);
    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  /**
   * Handler: Update cart quantity
   */
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
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  /**
   * Handler: Get cart contents
   */
  private async handleGetCartContents(): Promise<MessageResponse> {
    const result = await this.cartWorkflow.getCartContents();
    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  /**
   * Handler: Clear cart
   */
  private async handleClearCart(): Promise<MessageResponse> {
    const result = await this.cartWorkflow.clearCart();
    return {
      success: result.success,
      data: { cartItems: result.cartItems },
      error: result.error,
    };
  }

  /**
   * Handler: Start checkout
   */
  private async handleStartCheckout(
    payload: Record<string, unknown> = {}
  ): Promise<MessageResponse> {
    const { address, paymentMethod, saveAddress } = payload;

    const result = await this.checkoutWorkflow.execute({
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

  /**
   * Handler: Apply coupon
   */
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

    const success = await this.checkoutWorkflow.applyCoupon(couponCode);
    return {
      success,
      error: success ? undefined : 'Failed to apply coupon',
    };
  }

  /**
   * Handler: Start order (legacy)
   */
  private async handleStartOrder(payload: unknown): Promise<MessageResponse> {
    this.logger.log('Starting order automation with payload:', payload);

    const pageAnalysis = await this.analyzePage();

    return {
      success: true,
      data: pageAnalysis,
    };
  }

  /**
   * Handler: Extract menu (legacy)
   */
  private async handleExtractMenu(): Promise<MessageResponse> {
    const menuItems = this.domParser.extractMenuItems();
    return {
      success: true,
      data: menuItems,
    };
  }

  /**
   * Handler: Analyze page (legacy)
   */
  private async handleAnalyzePage(): Promise<MessageResponse> {
    const pageAnalysis = await this.analyzePage();
    return {
      success: true,
      data: pageAnalysis,
    };
  }

  /**
   * Handler: Execute action (legacy)
   */
  private async handleExecuteAction(instruction: ActionInstruction): Promise<MessageResponse> {
    this.logger.log('Executing action:', instruction.action);

    try {
      switch (instruction.action) {
        case BrowserAction.SEARCH_RESTAURANT:
          await this.searchRestaurant(instruction.value as string);
          break;

        case BrowserAction.SELECT_RESTAURANT:
          await this.selectRestaurant(instruction.target as string);
          break;

        case BrowserAction.ADD_TO_CART:
          await this.addToCart(instruction.target as string);
          break;

        case BrowserAction.CHECKOUT:
          await this.checkout();
          break;

        case BrowserAction.WAIT:
          await this.wait(instruction.value as number);
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

  /**
   * Analyze current page (legacy method)
   */
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
        analysis.restaurants = this.domParser.extractRestaurants();
        break;
      case PageType.RESTAURANT_DETAIL:
        analysis.menuItems = this.domParser.extractMenuItems();
        break;
      case PageType.CART:
        analysis.cartItems = this.domParser.extractCartItems();
        break;
    }

    return analysis;
  }

  /**
   * Detect page type
   */
  private detectPageType(): PageType {
    const url = window.location.href;

    if (url.includes('/restaurants') && url.includes('/menu/')) {
      return PageType.RESTAURANT_DETAIL;
    } else if (url.includes('/restaurants')) {
      return PageType.RESTAURANT_LIST;
    } else if (url.includes('/checkout')) {
      return PageType.CHECKOUT;
    } else if (url.includes('/cart')) {
      return PageType.CART;
    } else if (url.includes('/order-confirmation')) {
      return PageType.ORDER_CONFIRMATION;
    }

    return PageType.HOME;
  }

  /**
   * Extract page elements
   */
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

  /**
   * Legacy action methods
   */
  private async searchRestaurant(query: string): Promise<void> {
    const searchInput = await this.elementFinder.findSearchInput();
    if (searchInput) {
      await this.actionSimulator.typeIntoInput(searchInput, query, { pressEnter: true });
    }
  }

  private async selectRestaurant(restaurantName: string): Promise<void> {
    const restaurants = this.domParser.extractRestaurants();
    const restaurant = restaurants.find((r) =>
      r.name.toLowerCase().includes(restaurantName.toLowerCase())
    );
    if (restaurant) {
      await this.actionSimulator.clickElement(restaurant.element);
    }
  }

  private async addToCart(itemName: string): Promise<void> {
    await this.cartWorkflow.addToCart({ dishName: itemName });
  }

  private async checkout(): Promise<void> {
    await this.checkoutWorkflow.execute();
  }

  private async wait(ms: number): Promise<void> {
    await this.actionSimulator.waitForPageIdle(ms);
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
        url: window.location.href,
        timestamp: Date.now(),
      },
    });
  }
}

// Initialize content script when loaded
const contentScript = new SwiggyContentScript();
contentScript.initialize().catch((error) => {
  console.error('Failed to initialize content script:', error);
});

// Export for testing
export default contentScript;
