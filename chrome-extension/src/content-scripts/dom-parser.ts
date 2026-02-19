/**
 * DOM Parser for extracting structured data from Swiggy/Zomato pages
 */

export interface ElementInfo {
  id: string;
  tag: string;
  text: string;
  className: string;
  role?: string;
  ariaLabel?: string;
  href?: string;
  isInteractive: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface DOMSnapshot {
  url: string;
  title: string;
  timestamp: number;
  elements: ElementInfo[];
  scrollPosition: {
    x: number;
    y: number;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  cuisine: string[];
  deliveryTime: string;
  priceForTwo?: number;
  distance?: string;
  element: HTMLElement;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  description: string;
  isVeg: boolean;
  rating?: number;
  element: HTMLElement;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  customizations?: string[];
}

export interface OrderSummary {
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  taxes: number;
  total: number;
}

export class DomParser {
  private readonly logger = console;

  /**
   * Build a structured snapshot of the current DOM
   */
  public buildDOMSnapshot(): DOMSnapshot {
    try {
      const interactiveElements = this.getInteractiveElements();
      const elements = interactiveElements.map((el) => this.createElementInfo(el));

      return {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        elements,
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY,
        },
      };
    } catch (error) {
      this.logger.error('Failed to build DOM snapshot:', error);
      throw error;
    }
  }

  /**
   * Get all interactive elements on the page
   */
  private getInteractiveElements(): HTMLElement[] {
    const selectors = [
      'button',
      'a',
      'input',
      'select',
      'textarea',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[tabindex]:not([tabindex="-1"])',
      '[onclick]',
    ];

    const elements = document.querySelectorAll(selectors.join(', '));
    return Array.from(elements) as HTMLElement[];
  }

  /**
   * Create structured element info from HTMLElement
   */
  private createElementInfo(element: HTMLElement): ElementInfo {
    const rect = element.getBoundingClientRect();
    const text = this.getElementText(element);

    return {
      id: element.id || this.generateElementId(element),
      tag: element.tagName.toLowerCase(),
      text,
      className: element.className,
      role: element.getAttribute('role') || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined,
      href: (element as HTMLAnchorElement).href || undefined,
      isInteractive: this.isElementInteractive(element),
      bounds: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      },
    };
  }

  /**
   * Get visible text from element
   */
  private getElementText(element: HTMLElement): string {
    // Try aria-label first
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel.trim();
    }

    // Get text content, but limit depth to avoid getting too much text
    const text = element.textContent || '';
    return text.trim().substring(0, 200);
  }

  /**
   * Generate a unique ID for an element
   */
  private generateElementId(element: HTMLElement): string {
    const tag = element.tagName.toLowerCase();
    const className = element.className.split(' ')[0] || '';
    const text = this.getElementText(element).substring(0, 20).replace(/\s+/g, '-');
    return `${tag}-${className}-${text}`.toLowerCase();
  }

  /**
   * Check if element is interactive
   */
  private isElementInteractive(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    if (interactiveTags.includes(element.tagName.toLowerCase())) {
      return true;
    }

    const role = element.getAttribute('role');
    if (role && ['button', 'link', 'menuitem'].includes(role)) {
      return true;
    }

    return element.hasAttribute('onclick') || element.hasAttribute('tabindex');
  }

  /**
   * Find element by text content
   */
  public findElementByText(text: string): HTMLElement | null {
    try {
      const normalizedText = text.toLowerCase().trim();

      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const elements: HTMLElement[] = [];
      let node: Node | null;

      while ((node = walker.nextNode())) {
        const textContent = node.textContent?.toLowerCase().trim();
        if (textContent?.includes(normalizedText)) {
          const parent = node.parentElement;
          if (parent && !elements.includes(parent)) {
            elements.push(parent);
          }
        }
      }

      // Return the most specific matching element
      return elements.length > 0 ? elements[0] : null;
    } catch (error) {
      this.logger.error('Failed to find element by text:', error);
      return null;
    }
  }

  /**
   * Find element by role
   */
  public findElementByRole(role: string): HTMLElement | null {
    try {
      return document.querySelector(`[role="${role}"]`) as HTMLElement | null;
    } catch (error) {
      this.logger.error('Failed to find element by role:', error);
      return null;
    }
  }

  /**
   * Find element by CSS selector
   */
  public findElementBySelector(selector: string): HTMLElement | null {
    try {
      return document.querySelector(selector) as HTMLElement | null;
    } catch (error) {
      this.logger.error('Failed to find element by selector:', error);
      return null;
    }
  }

  /**
   * Extract restaurant information from the page
   */
  public extractRestaurants(): Restaurant[] {
    try {
      const restaurants: Restaurant[] = [];

      // Swiggy restaurant card selectors
      const restaurantCards = document.querySelectorAll(
        '[data-testid="restaurant-card"], .RestaurantList__card, .restaurant-card'
      );

      restaurantCards.forEach((card, index) => {
        const element = card as HTMLElement;
        const name = this.extractText(element, [
          '[data-testid="restaurant-name"]',
          '.restaurant-name',
          'h3',
          'h4',
        ]);

        if (!name) {
          return;
        }

        const ratingText = this.extractText(element, [
          '[data-testid="restaurant-rating"]',
          '.rating',
          '.star-rating',
        ]);
        const rating = ratingText ? parseFloat(ratingText) : 0;

        const cuisine = this.extractText(element, [
          '[data-testid="restaurant-cuisine"]',
          '.cuisine',
          '.cuisines',
        ]);

        const deliveryTime = this.extractText(element, [
          '[data-testid="delivery-time"]',
          '.delivery-time',
          '.time',
        ]);

        const priceForTwoText = this.extractText(element, [
          '[data-testid="price-for-two"]',
          '.price-for-two',
          '.cost',
        ]);
        const priceForTwo = priceForTwoText ? this.parsePrice(priceForTwoText) : undefined;

        restaurants.push({
          id: element.id || `restaurant-${index}`,
          name,
          rating,
          cuisine: cuisine ? cuisine.split(',').map(c => c.trim()) : ['Unknown'],
          deliveryTime: deliveryTime || 'N/A',
          priceForTwo,
          element,
        });
      });

      return restaurants;
    } catch (error) {
      this.logger.error('Failed to extract restaurants:', error);
      return [];
    }
  }

  /**
   * Extract menu items from the page
   */
  public extractMenuItems(): Dish[] {
    try {
      const dishes: Dish[] = [];

      // Swiggy menu item selectors
      const menuItems = document.querySelectorAll(
        '[data-testid="menu-item"], .menu-item, .dish-card, .item-card'
      );

      menuItems.forEach((item, index) => {
        const element = item as HTMLElement;
        const name = this.extractText(element, [
          '[data-testid="dish-name"]',
          '.dish-name',
          '.item-name',
          'h3',
          'h4',
        ]);

        if (!name) {
          return;
        }

        const priceText = this.extractText(element, [
          '[data-testid="dish-price"]',
          '.price',
          '.item-price',
        ]);
        const price = priceText ? this.parsePrice(priceText) : 0;

        const description = this.extractText(element, [
          '[data-testid="dish-description"]',
          '.description',
          '.item-description',
          'p',
        ]);

        const isVeg = this.checkVegNonVeg(element);

        const ratingText = this.extractText(element, [
          '[data-testid="dish-rating"]',
          '.rating',
          '.item-rating',
        ]);
        const rating = ratingText ? parseFloat(ratingText) : undefined;

        dishes.push({
          id: element.id || `dish-${index}`,
          name,
          price,
          description: description || '',
          isVeg,
          rating,
          element,
        });
      });

      return dishes;
    } catch (error) {
      this.logger.error('Failed to extract menu items:', error);
      return [];
    }
  }

  /**
   * Extract cart items from the page
   */
  public extractCartItems(): CartItem[] {
    try {
      const cartItems: CartItem[] = [];

      // Swiggy cart item selectors
      const items = document.querySelectorAll(
        '[data-testid="cart-item"], .cart-item, .cart-line-item'
      );

      items.forEach((item) => {
        const element = item as HTMLElement;
        const dishName = this.extractText(element, [
          '[data-testid="cart-item-name"]',
          '.item-name',
          '.dish-name',
          'h4',
        ]);

        if (!dishName) {
          return;
        }

        const quantityText = this.extractText(element, [
          '[data-testid="cart-item-quantity"]',
          '.quantity',
          '.qty',
        ]);
        const quantity = quantityText ? parseInt(quantityText, 10) : 1;

        const priceText = this.extractText(element, [
          '[data-testid="cart-item-price"]',
          '.price',
          '.item-price',
        ]);
        const price = priceText ? this.parsePrice(priceText) : 0;

        cartItems.push({
          menuItemId: element.id || `cart-item-${cartItems.length}`,
          name: dishName,
          quantity,
          price,
          customizations: [],
        });
      });

      return cartItems;
    } catch (error) {
      this.logger.error('Failed to extract cart items:', error);
      return [];
    }
  }

  /**
   * Extract order summary from the page
   */
  public extractOrderSummary(): OrderSummary {
    try {
      const items = this.extractCartItems();

      const subtotalText = this.extractText(document.body, [
        '[data-testid="cart-subtotal"]',
        '.subtotal',
        '.item-total',
      ]);
      const subtotal = subtotalText ? this.parsePrice(subtotalText) : 0;

      const deliveryFeeText = this.extractText(document.body, [
        '[data-testid="delivery-fee"]',
        '.delivery-fee',
        '.delivery-charge',
      ]);
      const deliveryFee = deliveryFeeText ? this.parsePrice(deliveryFeeText) : 0;

      const taxesText = this.extractText(document.body, [
        '[data-testid="taxes"]',
        '.taxes',
        '.gst',
      ]);
      const taxes = taxesText ? this.parsePrice(taxesText) : 0;

      const totalText = this.extractText(document.body, [
        '[data-testid="cart-total"]',
        '.total',
        '.grand-total',
      ]);
      const total = totalText ? this.parsePrice(totalText) : subtotal + deliveryFee + taxes;

      return {
        items,
        subtotal,
        deliveryFee,
        taxes,
        total,
      };
    } catch (error) {
      this.logger.error('Failed to extract order summary:', error);
      return {
        items: [],
        subtotal: 0,
        deliveryFee: 0,
        taxes: 0,
        total: 0,
      };
    }
  }

  /**
   * Helper to extract text from element using multiple selectors
   */
  private extractText(root: Element, selectors: string[]): string {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }
    return '';
  }

  /**
   * Parse price from text (handles ₹, $, commas, etc.)
   */
  private parsePrice(priceText: string): number {
    const cleaned = priceText.replace(/[₹$,\s]/g, '');
    const price = parseFloat(cleaned);
    return isNaN(price) ? 0 : price;
  }

  /**
   * Check if dish is veg or non-veg
   */
  private checkVegNonVeg(element: HTMLElement): boolean {
    const vegIndicators = [
      '.veg-icon',
      '.veg-indicator',
      '[data-testid="veg-icon"]',
      'img[alt*="veg"]',
    ];

    for (const selector of vegIndicators) {
      if (element.querySelector(selector)) {
        return true;
      }
    }

    // Check text content for "veg" keyword
    const text = element.textContent?.toLowerCase() || '';
    return text.includes('veg') && !text.includes('non-veg');
  }
}
