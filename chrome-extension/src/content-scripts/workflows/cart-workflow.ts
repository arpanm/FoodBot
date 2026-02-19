/**
 * Cart Workflow - Handles adding items to cart and cart management
 */

import { ActionSimulator } from '../action-simulator';
import { DomParser, Dish, CartItem } from '../dom-parser';
import { ElementFinder } from '../element-finder';

export interface AddToCartOptions {
  dishName: string;
  quantity?: number;
  customizations?: string[];
}

export interface CartWorkflowResult {
  success: boolean;
  cartItems?: CartItem[];
  error?: string;
}

export class CartWorkflow {
  private readonly logger = console;
  private readonly actionSimulator: ActionSimulator;
  private readonly domParser: DomParser;
  private readonly elementFinder: ElementFinder;

  constructor() {
    this.actionSimulator = new ActionSimulator();
    this.domParser = new DomParser();
    this.elementFinder = new ElementFinder();
  }

  /**
   * Add item to cart
   */
  public async addToCart(options: AddToCartOptions): Promise<CartWorkflowResult> {
    try {
      const { dishName, quantity = 1, customizations = [] } = options;

      this.logger.log('Adding to cart:', dishName, 'quantity:', quantity);

      // Step 1: Find the dish on the menu
      const dish = await this.findDishByName(dishName);
      if (!dish) {
        throw new Error(`Dish not found: ${dishName}`);
      }

      // Step 2: Scroll to dish
      await this.actionSimulator.scrollToElement(dish.element);

      // Step 3: Find and click "Add to Cart" button
      const addButton = await this.elementFinder.findAddToCartButton(dish.element);
      if (!addButton) {
        throw new Error('Add to cart button not found');
      }

      await this.actionSimulator.clickElement(addButton);

      // Step 4: Handle customizations if modal appears
      if (customizations.length > 0) {
        await this.handleCustomizations(customizations);
      }

      // Step 5: Handle quantity if > 1
      if (quantity > 1) {
        await this.updateQuantity(dish, quantity);
      }

      // Step 6: Wait for cart to update
      await this.actionSimulator.waitForPageIdle(1000);

      // Step 7: Verify item was added
      const cartItems = this.domParser.extractCartItems();
      const addedItem = cartItems.find((item) =>
        item.name.toLowerCase().includes(dishName.toLowerCase())
      );

      if (!addedItem) {
        throw new Error('Item not found in cart after adding');
      }

      this.logger.log('Item added to cart successfully');

      return {
        success: true,
        cartItems,
      };
    } catch (error) {
      this.logger.error('Failed to add to cart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Add multiple items to cart
   */
  public async addMultipleToCart(
    items: AddToCartOptions[]
  ): Promise<CartWorkflowResult> {
    try {
      this.logger.log('Adding multiple items to cart:', items.length);

      const results: boolean[] = [];

      for (const item of items) {
        const result = await this.addToCart(item);
        results.push(result.success);

        if (!result.success) {
          this.logger.warn('Failed to add item:', item.dishName);
        }

        // Small delay between additions
        await this.actionSimulator.waitForPageIdle(500);
      }

      const allSuccess = results.every((r) => r);
      const cartItems = this.domParser.extractCartItems();

      return {
        success: allSuccess,
        cartItems,
        error: allSuccess ? undefined : 'Some items failed to add',
      };
    } catch (error) {
      this.logger.error('Failed to add multiple items:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Remove item from cart
   */
  public async removeFromCart(dishName: string): Promise<CartWorkflowResult> {
    try {
      this.logger.log('Removing from cart:', dishName);

      // Step 1: Open cart if not visible
      await this.openCart();

      // Step 2: Find the cart item
      const cartItems = this.domParser.extractCartItems();
      const itemIndex = cartItems.findIndex((item) =>
        item.name.toLowerCase().includes(dishName.toLowerCase())
      );

      if (itemIndex === -1) {
        throw new Error(`Item not found in cart: ${dishName}`);
      }

      // Step 3: Find remove button for the item
      const cartItemElements = document.querySelectorAll(
        '[data-testid="cart-item"], .cart-item'
      );
      const itemElement = cartItemElements[itemIndex] as HTMLElement;

      if (!itemElement) {
        throw new Error('Cart item element not found');
      }

      const removeButton = itemElement.querySelector(
        'button[aria-label*="Remove"], button[aria-label*="Delete"], button.remove-button'
      ) as HTMLButtonElement;

      if (!removeButton) {
        throw new Error('Remove button not found');
      }

      // Step 4: Click remove button
      await this.actionSimulator.clickElement(removeButton);

      // Step 5: Confirm removal if modal appears
      await this.confirmRemoval();

      // Step 6: Wait for cart to update
      await this.actionSimulator.waitForPageIdle(1000);

      const updatedCartItems = this.domParser.extractCartItems();

      return {
        success: true,
        cartItems: updatedCartItems,
      };
    } catch (error) {
      this.logger.error('Failed to remove from cart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update quantity of item in cart
   */
  public async updateCartItemQuantity(
    dishName: string,
    newQuantity: number
  ): Promise<CartWorkflowResult> {
    try {
      this.logger.log('Updating quantity for:', dishName, 'to:', newQuantity);

      if (newQuantity <= 0) {
        return await this.removeFromCart(dishName);
      }

      // Step 1: Open cart
      await this.openCart();

      // Step 2: Find the cart item
      const cartItems = this.domParser.extractCartItems();
      const itemIndex = cartItems.findIndex((item) =>
        item.name.toLowerCase().includes(dishName.toLowerCase())
      );

      if (itemIndex === -1) {
        throw new Error(`Item not found in cart: ${dishName}`);
      }

      const currentQuantity = cartItems[itemIndex].quantity;
      const quantityDiff = newQuantity - currentQuantity;

      // Step 3: Find quantity controls
      const cartItemElements = document.querySelectorAll(
        '[data-testid="cart-item"], .cart-item'
      );
      const itemElement = cartItemElements[itemIndex] as HTMLElement;

      if (quantityDiff > 0) {
        // Increase quantity
        const increaseButton = itemElement.querySelector(
          'button[aria-label*="Increase"], button[aria-label*="+"], button.increment'
        ) as HTMLButtonElement;

        if (!increaseButton) {
          throw new Error('Increase button not found');
        }

        for (let i = 0; i < quantityDiff; i++) {
          await this.actionSimulator.clickElement(increaseButton);
          await this.actionSimulator.waitForPageIdle(300);
        }
      } else if (quantityDiff < 0) {
        // Decrease quantity
        const decreaseButton = itemElement.querySelector(
          'button[aria-label*="Decrease"], button[aria-label*="-"], button.decrement'
        ) as HTMLButtonElement;

        if (!decreaseButton) {
          throw new Error('Decrease button not found');
        }

        for (let i = 0; i < Math.abs(quantityDiff); i++) {
          await this.actionSimulator.clickElement(decreaseButton);
          await this.actionSimulator.waitForPageIdle(300);
        }
      }

      // Step 4: Wait for cart to update
      await this.actionSimulator.waitForPageIdle(1000);

      const updatedCartItems = this.domParser.extractCartItems();

      return {
        success: true,
        cartItems: updatedCartItems,
      };
    } catch (error) {
      this.logger.error('Failed to update cart item quantity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear cart
   */
  public async clearCart(): Promise<CartWorkflowResult> {
    try {
      this.logger.log('Clearing cart');

      // Step 1: Open cart
      await this.openCart();

      // Step 2: Find clear cart button
      const clearButton = await this.elementFinder.findByText('Clear Cart');

      if (!clearButton) {
        // Alternative: Remove items one by one
        const cartItems = this.domParser.extractCartItems();
        for (const item of cartItems) {
          await this.removeFromCart(item.name);
        }
      } else {
        await this.actionSimulator.clickElement(clearButton);
        await this.confirmClearCart();
      }

      // Step 3: Wait for cart to update
      await this.actionSimulator.waitForPageIdle(1000);

      return {
        success: true,
        cartItems: [],
      };
    } catch (error) {
      this.logger.error('Failed to clear cart:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current cart contents
   */
  public async getCartContents(): Promise<CartWorkflowResult> {
    try {
      await this.openCart();
      const cartItems = this.domParser.extractCartItems();

      return {
        success: true,
        cartItems,
      };
    } catch (error) {
      this.logger.error('Failed to get cart contents:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Open cart view
   */
  private async openCart(): Promise<void> {
    try {
      // Check if cart is already open
      const cartView = document.querySelector(
        '[data-testid="cart-view"], .cart-view, .cart-panel'
      );

      if (cartView && this.isElementVisible(cartView as HTMLElement)) {
        return;
      }

      // Find and click cart button
      const cartButton = await this.elementFinder.findCartButton();
      if (cartButton) {
        await this.actionSimulator.clickElement(cartButton);
        await this.actionSimulator.waitForPageIdle(1000);
      }
    } catch (error) {
      this.logger.error('Failed to open cart:', error);
    }
  }

  /**
   * Find dish by name on menu
   */
  private async findDishByName(dishName: string): Promise<Dish | null> {
    const dishes = this.domParser.extractMenuItems();
    const normalizedName = dishName.toLowerCase().trim();

    return (
      dishes.find((dish) => dish.name.toLowerCase().includes(normalizedName)) || null
    );
  }

  /**
   * Handle customizations modal
   */
  private async handleCustomizations(customizations: string[]): Promise<void> {
    try {
      // Wait for customization modal
      const modal = await this.actionSimulator.waitForElement(
        '[data-testid="customization-modal"], .customization-modal, .customize-modal',
        { timeout: 3000 }
      );

      if (!modal) {
        return;
      }

      // Select customizations
      for (const customization of customizations) {
        const option = await this.elementFinder.findByText(customization);
        if (option) {
          await this.actionSimulator.clickElement(option);
          await this.actionSimulator.waitForPageIdle(200);
        }
      }

      // Click confirm button
      const confirmButton = await this.elementFinder.findByText('Add to Cart');
      if (confirmButton) {
        await this.actionSimulator.clickElement(confirmButton);
      }
    } catch (error) {
      this.logger.warn('Customization handling failed:', error);
    }
  }

  /**
   * Update quantity for a dish
   */
  private async updateQuantity(dish: Dish, quantity: number): Promise<void> {
    try {
      for (let i = 1; i < quantity; i++) {
        const increaseButton = dish.element.querySelector(
          'button[aria-label*="+"], button.increment'
        ) as HTMLButtonElement;

        if (increaseButton) {
          await this.actionSimulator.clickElement(increaseButton);
          await this.actionSimulator.waitForPageIdle(300);
        }
      }
    } catch (error) {
      this.logger.warn('Quantity update failed:', error);
    }
  }

  /**
   * Confirm removal action
   */
  private async confirmRemoval(): Promise<void> {
    try {
      const confirmButton = await this.actionSimulator.waitForElement(
        'button:has-text("Remove"), button:has-text("Yes"), button:has-text("Confirm")',
        { timeout: 2000 }
      );

      if (confirmButton) {
        await this.actionSimulator.clickElement(confirmButton);
      }
    } catch {
      // No confirmation needed
    }
  }

  /**
   * Confirm clear cart action
   */
  private async confirmClearCart(): Promise<void> {
    try {
      const confirmButton = await this.actionSimulator.waitForElement(
        'button:has-text("Clear"), button:has-text("Yes"), button:has-text("Confirm")',
        { timeout: 2000 }
      );

      if (confirmButton) {
        await this.actionSimulator.clickElement(confirmButton);
      }
    } catch {
      // No confirmation needed
    }
  }

  /**
   * Check if element is visible
   */
  private isElementVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  }
}
