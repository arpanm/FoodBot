/**
 * Tests for Selector Fallback Mechanism
 */

import { SWIGGY_SELECTORS } from '../../src/content-scripts/platforms/swiggy/swiggy-selectors';
import { ZOMATO_SELECTORS } from '../../src/content-scripts/platforms/zomato/zomato-selectors';
import { SelectorConfig } from '../../src/content-scripts/platforms/types';

/**
 * Helper to find element using selector fallback
 */
const findElementWithFallback = (selectors: string[]): HTMLElement | null => {
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        return element;
      }
    } catch (error) {
      // Invalid selector, continue to next
      continue;
    }
  }
  return null;
};

describe('Selector Fallback Mechanism', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('ARIA-based selectors (Priority 1)', () => {
    it('should find search input using ARIA label', () => {
      document.body.innerHTML = '<input aria-label="Search for restaurants" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).not.toBeNull();
      expect(element?.tagName).toBe('INPUT');
    });

    it('should find add to cart button using ARIA label', () => {
      document.body.innerHTML = '<button aria-label="Add to cart">Add</button>';

      const element = findElementWithFallback(SWIGGY_SELECTORS.addToCartButton);
      expect(element).not.toBeNull();
      expect(element?.tagName).toBe('BUTTON');
    });
  });

  describe('Placeholder-based selectors (Priority 2)', () => {
    it('should find search input using placeholder', () => {
      document.body.innerHTML = '<input placeholder="Search for dishes" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).not.toBeNull();
    });

    it('should find address input using placeholder', () => {
      document.body.innerHTML = '<input placeholder="Enter delivery address" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.addressInput);
      expect(element).not.toBeNull();
    });
  });

  describe('Semantic HTML selectors (Priority 3)', () => {
    it('should find search input using type attribute', () => {
      document.body.innerHTML = '<input type="search" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).not.toBeNull();
    });

    it('should find menu category using heading role', () => {
      document.body.innerHTML = '<h2 role="heading" aria-level="2">Main Course</h2>';

      const element = findElementWithFallback(SWIGGY_SELECTORS.menuCategory);
      expect(element).not.toBeNull();
    });
  });

  describe('Data attribute selectors (Priority 4)', () => {
    it('should find restaurant card using data-testid', () => {
      document.body.innerHTML = '<div data-testid="restaurant-card">Restaurant</div>';

      const element = findElementWithFallback(SWIGGY_SELECTORS.restaurantCard);
      expect(element).not.toBeNull();
    });

    it('should find menu item using data-testid', () => {
      document.body.innerHTML = '<div data-testid="menu-item">Dish Name</div>';

      const element = findElementWithFallback(SWIGGY_SELECTORS.menuItem);
      expect(element).not.toBeNull();
    });
  });

  describe('Class-based selectors (Priority 5)', () => {
    it('should find search input using class', () => {
      document.body.innerHTML = '<input class="search-input" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).not.toBeNull();
    });

    it('should find cart icon using class', () => {
      document.body.innerHTML = '<button class="cart-icon">Cart</button>';

      const element = findElementWithFallback(SWIGGY_SELECTORS.cartIcon);
      expect(element).not.toBeNull();
    });
  });

  describe('Structural selectors (Fallback)', () => {
    it('should find search input in header', () => {
      document.body.innerHTML = '<header><input type="text" /></header>';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).not.toBeNull();
    });
  });

  describe('Zomato-specific patterns', () => {
    it('should find Zomato restaurant card with data-result-type', () => {
      document.body.innerHTML = '<div data-result-type="ResCard_Default">Restaurant</div>';

      const element = findElementWithFallback(ZOMATO_SELECTORS.restaurantCard);
      expect(element).not.toBeNull();
    });

    it('should find Zomato search input with name attribute', () => {
      document.body.innerHTML = '<input name="search_keyword" />';

      const element = findElementWithFallback(ZOMATO_SELECTORS.searchInput);
      expect(element).not.toBeNull();
    });

    it('should find Zomato styled component classes', () => {
      document.body.innerHTML = '<div class="sc-restaurant-card">Restaurant</div>';

      const element = findElementWithFallback(ZOMATO_SELECTORS.restaurantCard);
      expect(element).not.toBeNull();
    });
  });

  describe('Multi-layered fallback', () => {
    it('should try all selectors until finding match', () => {
      // No ARIA, no placeholder, just a class
      document.body.innerHTML = '<input class="search-input" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).not.toBeNull();
    });

    it('should return null if no selector matches', () => {
      document.body.innerHTML = '<input class="other-input" />';

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element).toBeNull();
    });

    it('should use first matching selector', () => {
      // Multiple matching elements, should use highest priority
      document.body.innerHTML = `
        <input class="search-input" id="low-priority" />
        <input aria-label="Search" id="high-priority" />
      `;

      const element = findElementWithFallback(SWIGGY_SELECTORS.searchInput);
      expect(element?.id).toBe('high-priority');
    });
  });

  describe('Selector config completeness', () => {
    const requiredSelectors: (keyof SelectorConfig)[] = [
      'searchInput',
      'restaurantCard',
      'menuItem',
      'addToCartButton',
      'cartIcon',
      'checkoutButton',
    ];

    it('Swiggy selectors should have all required selectors', () => {
      for (const key of requiredSelectors) {
        expect(SWIGGY_SELECTORS[key]).toBeDefined();
        expect(Array.isArray(SWIGGY_SELECTORS[key])).toBe(true);
        expect(SWIGGY_SELECTORS[key].length).toBeGreaterThan(0);
      }
    });

    it('Zomato selectors should have all required selectors', () => {
      for (const key of requiredSelectors) {
        expect(ZOMATO_SELECTORS[key]).toBeDefined();
        expect(Array.isArray(ZOMATO_SELECTORS[key])).toBe(true);
        expect(ZOMATO_SELECTORS[key].length).toBeGreaterThan(0);
      }
    });

    it('Each selector array should have multiple fallbacks', () => {
      const minFallbacks = 3;

      for (const key of requiredSelectors) {
        expect(SWIGGY_SELECTORS[key].length).toBeGreaterThanOrEqual(minFallbacks);
        expect(ZOMATO_SELECTORS[key].length).toBeGreaterThanOrEqual(minFallbacks);
      }
    });
  });

  describe('Selector priority ordering', () => {
    it('ARIA selectors should come first', () => {
      const firstSelector = SWIGGY_SELECTORS.searchInput[0];
      expect(firstSelector).toMatch(/\[aria-/i);
    });

    it('Class-based selectors should come after semantic ones', () => {
      const selectors = SWIGGY_SELECTORS.searchInput;
      const ariaIndex = selectors.findIndex((s) => s.includes('aria-'));
      const classIndex = selectors.findIndex((s) => s.includes('class='));

      expect(ariaIndex).toBeLessThan(classIndex);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Swiggy restaurant list page', () => {
      document.body.innerHTML = `
        <div data-testid="restaurant-card" class="restaurant-card">
          <h3 data-testid="restaurant-name">Test Restaurant</h3>
          <p class="cuisine">Indian, Chinese</p>
          <div data-testid="restaurant-rating">4.5</div>
        </div>
      `;

      const card = findElementWithFallback(SWIGGY_SELECTORS.restaurantCard);
      const name = findElementWithFallback(SWIGGY_SELECTORS.restaurantName);
      const cuisine = findElementWithFallback(SWIGGY_SELECTORS.restaurantCuisine);

      expect(card).not.toBeNull();
      expect(name).not.toBeNull();
      expect(cuisine).not.toBeNull();
    });

    it('should handle Zomato restaurant detail page', () => {
      document.body.innerHTML = `
        <div class="sc-menu-item">
          <h4 class="sc-item-name">Butter Chicken</h4>
          <span class="sc-price">₹350</span>
          <button aria-label="Add to cart">Add</button>
        </div>
      `;

      const item = findElementWithFallback(ZOMATO_SELECTORS.menuItem);
      const name = findElementWithFallback(ZOMATO_SELECTORS.menuItemName);
      const price = findElementWithFallback(ZOMATO_SELECTORS.menuItemPrice);
      const button = findElementWithFallback(ZOMATO_SELECTORS.addToCartButton);

      expect(item).not.toBeNull();
      expect(name).not.toBeNull();
      expect(price).not.toBeNull();
      expect(button).not.toBeNull();
    });
  });
});
