/**
 * Element Finder for locating specific UI elements on Swiggy/Zomato
 */

export interface FindOptions {
  timeout?: number;
  retries?: number;
  scrollIntoView?: boolean;
}

export class ElementFinder {
  private readonly logger = console;
  private readonly DEFAULT_TIMEOUT = 5000;
  private readonly DEFAULT_RETRIES = 3;
  private readonly POLL_INTERVAL = 100;

  /**
   * Find search input field
   */
  public async findSearchInput(options: FindOptions = {}): Promise<HTMLInputElement | null> {
    try {
      const selectors = [
        'input[placeholder*="Search"]',
        'input[placeholder*="search"]',
        'input[type="search"]',
        'input[aria-label*="Search"]',
        'input[data-testid*="search"]',
        'input.search-input',
        'input#search',
        'input[name="search"]',
      ];

      return await this.findElement<HTMLInputElement>(selectors, options);
    } catch (error) {
      this.logger.error('Failed to find search input:', error);
      return null;
    }
  }

  /**
   * Find search button
   */
  public async findSearchButton(options: FindOptions = {}): Promise<HTMLButtonElement | null> {
    try {
      const selectors = [
        'button[aria-label*="Search"]',
        'button[data-testid*="search"]',
        'button.search-button',
        'button[type="submit"]',
        'button:has(svg[class*="search"])',
        '[role="button"][aria-label*="Search"]',
      ];

      return await this.findElement<HTMLButtonElement>(selectors, options);
    } catch (error) {
      this.logger.error('Failed to find search button:', error);
      return null;
    }
  }

  /**
   * Find all restaurant cards
   */
  public async findRestaurantCards(options: FindOptions = {}): Promise<HTMLElement[]> {
    try {
      const selectors = [
        '[data-testid="restaurant-card"]',
        '.restaurant-card',
        '.RestaurantList__card',
        '[class*="restaurant"][class*="card"]',
        'article[class*="restaurant"]',
      ];

      const elements: HTMLElement[] = [];

      for (const selector of selectors) {
        const found = await this.waitForElements(selector, {
          timeout: options.timeout || this.DEFAULT_TIMEOUT,
        });

        if (found.length > 0) {
          elements.push(...found);
          break;
        }
      }

      return elements;
    } catch (error) {
      this.logger.error('Failed to find restaurant cards:', error);
      return [];
    }
  }

  /**
   * Find menu items on restaurant page
   */
  public async findMenuItems(options: FindOptions = {}): Promise<HTMLElement[]> {
    try {
      const selectors = [
        '[data-testid="menu-item"]',
        '.menu-item',
        '.dish-card',
        '.item-card',
        '[class*="menu"][class*="item"]',
      ];

      const elements: HTMLElement[] = [];

      for (const selector of selectors) {
        const found = await this.waitForElements(selector, {
          timeout: options.timeout || this.DEFAULT_TIMEOUT,
        });

        if (found.length > 0) {
          elements.push(...found);
          break;
        }
      }

      return elements;
    } catch (error) {
      this.logger.error('Failed to find menu items:', error);
      return [];
    }
  }

  /**
   * Find "Add to Cart" button for a specific dish
   */
  public async findAddToCartButton(
    dishElement: HTMLElement,
    _options: FindOptions = {}
  ): Promise<HTMLButtonElement | null> {
    try {
      const selectors = [
        'button[data-testid*="add"]',
        'button[aria-label*="Add"]',
        'button:has-text("ADD")',
        'button:has-text("Add")',
        'button.add-button',
        'button[class*="add"]',
        '[role="button"][aria-label*="Add"]',
      ];

      for (const selector of selectors) {
        const button = dishElement.querySelector(selector) as HTMLButtonElement | null;
        if (button && this.isElementVisible(button)) {
          return button;
        }
      }

      // Try finding by text content
      const buttons = dishElement.querySelectorAll('button');
      for (const button of Array.from(buttons)) {
        const text = button.textContent?.toUpperCase().trim();
        if (text === 'ADD' || text === 'ADD TO CART') {
          return button as HTMLButtonElement;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to find add to cart button:', error);
      return null;
    }
  }

  /**
   * Find cart icon/button
   */
  public async findCartButton(options: FindOptions = {}): Promise<HTMLButtonElement | null> {
    try {
      const selectors = [
        'button[aria-label*="Cart"]',
        'button[data-testid*="cart"]',
        'button.cart-button',
        'a[href*="cart"]',
        '[role="button"][aria-label*="Cart"]',
        'button:has(svg[class*="cart"])',
      ];

      return await this.findElement<HTMLButtonElement>(selectors, options);
    } catch (error) {
      this.logger.error('Failed to find cart button:', error);
      return null;
    }
  }

  /**
   * Find checkout button
   */
  public async findCheckoutButton(options: FindOptions = {}): Promise<HTMLButtonElement | null> {
    try {
      const selectors = [
        'button[data-testid*="checkout"]',
        'button[aria-label*="Checkout"]',
        'button:has-text("CHECKOUT")',
        'button:has-text("Checkout")',
        'button:has-text("Proceed")',
        'button.checkout-button',
        'button[class*="checkout"]',
      ];

      const button = await this.findElement<HTMLButtonElement>(selectors, options);
      if (button) {
        return button;
      }

      // Try finding by text content
      const buttons = document.querySelectorAll('button');
      for (const btn of Array.from(buttons)) {
        const text = btn.textContent?.toUpperCase().trim();
        if (
          text === 'CHECKOUT' ||
          text === 'PROCEED TO CHECKOUT' ||
          text === 'PLACE ORDER'
        ) {
          return btn as HTMLButtonElement;
        }
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to find checkout button:', error);
      return null;
    }
  }

  /**
   * Find address input field
   */
  public async findAddressInput(options: FindOptions = {}): Promise<HTMLInputElement | null> {
    try {
      const selectors = [
        'input[placeholder*="address"]',
        'input[placeholder*="Address"]',
        'input[aria-label*="address"]',
        'input[name*="address"]',
        'input[data-testid*="address"]',
        'input[type="text"]',
      ];

      return await this.findElement<HTMLInputElement>(selectors, options);
    } catch (error) {
      this.logger.error('Failed to find address input:', error);
      return null;
    }
  }

  /**
   * Find payment option elements
   */
  public async findPaymentOptions(options: FindOptions = {}): Promise<HTMLElement[]> {
    try {
      const selectors = [
        '[data-testid*="payment"]',
        '.payment-option',
        '[class*="payment"][class*="option"]',
        'input[name="paymentMethod"]',
      ];

      const elements: HTMLElement[] = [];

      for (const selector of selectors) {
        const found = await this.waitForElements(selector, {
          timeout: options.timeout || this.DEFAULT_TIMEOUT,
        });

        if (found.length > 0) {
          elements.push(...found);
          break;
        }
      }

      return elements;
    } catch (error) {
      this.logger.error('Failed to find payment options:', error);
      return [];
    }
  }

  /**
   * Find element by text content
   */
  public async findByText(
    text: string,
    options: FindOptions = {}
  ): Promise<HTMLElement | null> {
    try {
      const { timeout = this.DEFAULT_TIMEOUT } = options;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null
        );

        const normalizedText = text.toLowerCase().trim();
        let node: Node | null;

        while ((node = walker.nextNode())) {
          const textContent = node.textContent?.toLowerCase().trim();
          if (textContent?.includes(normalizedText)) {
            const parent = node.parentElement;
            if (parent && this.isElementVisible(parent)) {
              return parent;
            }
          }
        }

        await this.sleep(this.POLL_INTERVAL);
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to find element by text:', error);
      return null;
    }
  }

  /**
   * Wait for element to appear and be visible
   */
  public async waitForElement(
    selector: string,
    options: FindOptions = {}
  ): Promise<HTMLElement | null> {
    try {
      const { timeout = this.DEFAULT_TIMEOUT, scrollIntoView = false } = options;
      const startTime = Date.now();

      while (Date.now() - startTime < timeout) {
        const element = document.querySelector(selector) as HTMLElement | null;

        if (element && this.isElementVisible(element)) {
          if (scrollIntoView) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          return element;
        }

        await this.sleep(this.POLL_INTERVAL);
      }

      throw new Error(`Element not found within timeout: ${selector}`);
    } catch (error) {
      this.logger.error('Failed to wait for element:', error);
      return null;
    }
  }

  /**
   * Wait for multiple elements to appear
   */
  private async waitForElements(
    selector: string,
    options: { timeout?: number } = {}
  ): Promise<HTMLElement[]> {
    const { timeout = this.DEFAULT_TIMEOUT } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
      const visibleElements = elements.filter((el) => this.isElementVisible(el));

      if (visibleElements.length > 0) {
        return visibleElements;
      }

      await this.sleep(this.POLL_INTERVAL);
    }

    return [];
  }

  /**
   * Find first matching element from multiple selectors
   */
  private async findElement<T extends HTMLElement>(
    selectors: string[],
    options: FindOptions = {}
  ): Promise<T | null> {
    const { timeout = this.DEFAULT_TIMEOUT, retries = this.DEFAULT_RETRIES } = options;

    for (let attempt = 0; attempt < retries; attempt++) {
      for (const selector of selectors) {
        try {
          const element = await this.waitForElement(selector, { timeout });
          if (element) {
            return element as T;
          }
        } catch {
          // Continue to next selector
        }
      }

      if (attempt < retries - 1) {
        this.logger.log(`Retry ${attempt + 1}/${retries}`);
        await this.sleep(500);
      }
    }

    return null;
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
      style.display !== 'none' &&
      parseFloat(style.opacity) > 0
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Find element containing specific text
   */
  public async findElementContainingText(
    tag: string,
    text: string,
    options: FindOptions = {}
  ): Promise<HTMLElement | null> {
    try {
      const { timeout = this.DEFAULT_TIMEOUT } = options;
      const startTime = Date.now();
      const normalizedText = text.toLowerCase().trim();

      while (Date.now() - startTime < timeout) {
        const elements = document.querySelectorAll(tag);

        for (const element of Array.from(elements)) {
          const textContent = element.textContent?.toLowerCase().trim();
          if (
            textContent?.includes(normalizedText) &&
            this.isElementVisible(element as HTMLElement)
          ) {
            return element as HTMLElement;
          }
        }

        await this.sleep(this.POLL_INTERVAL);
      }

      return null;
    } catch (error) {
      this.logger.error('Failed to find element containing text:', error);
      return null;
    }
  }
}
