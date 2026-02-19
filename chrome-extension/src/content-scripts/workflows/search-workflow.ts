/**
 * Search Workflow - Handles restaurant and dish search operations
 */

import { ActionSimulator } from '../action-simulator';
import { DomParser, Restaurant } from '../dom-parser';
import { ElementFinder } from '../element-finder';

export interface SearchWorkflowOptions {
  searchQuery: string;
  waitForResults?: boolean;
  maxRetries?: number;
}

export interface SearchWorkflowResult {
  success: boolean;
  restaurants: Restaurant[];
  error?: string;
}

export class SearchWorkflow {
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
   * Execute search workflow
   */
  public async execute(options: SearchWorkflowOptions): Promise<SearchWorkflowResult> {
    try {
      const {
        searchQuery,
        waitForResults = true,
        maxRetries = 3,
      } = options;

      this.logger.log('Starting search workflow for:', searchQuery);

      // Step 1: Find search input
      const searchInput = await this.findSearchInputWithRetry(maxRetries);
      if (!searchInput) {
        throw new Error('Search input not found');
      }

      // Step 2: Type search query
      await this.actionSimulator.typeIntoInput(searchInput, searchQuery, {
        clearFirst: true,
        pressEnter: false,
      });

      // Step 3: Find and click search button (if exists)
      const searchButton = await this.elementFinder.findSearchButton({
        timeout: 2000,
      });

      if (searchButton) {
        await this.actionSimulator.clickElement(searchButton);
      } else {
        // If no search button, press Enter
        searchInput.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
          })
        );
      }

      // Step 4: Wait for search results to load
      if (waitForResults) {
        await this.waitForSearchResults();
      }

      // Step 5: Extract restaurant data
      const restaurants = this.domParser.extractRestaurants();

      this.logger.log('Search workflow completed. Found restaurants:', restaurants.length);

      return {
        success: true,
        restaurants,
      };
    } catch (error) {
      this.logger.error('Search workflow failed:', error);
      return {
        success: false,
        restaurants: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search for a specific restaurant by name
   */
  public async searchRestaurant(restaurantName: string): Promise<SearchWorkflowResult> {
    try {
      this.logger.log('Searching for restaurant:', restaurantName);

      // Execute search
      const result = await this.execute({
        searchQuery: restaurantName,
        waitForResults: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      // Filter restaurants by name match
      const normalizedName = restaurantName.toLowerCase().trim();
      const matchingRestaurants = result.restaurants.filter((restaurant) =>
        restaurant.name.toLowerCase().includes(normalizedName)
      );

      return {
        success: true,
        restaurants: matchingRestaurants,
      };
    } catch (error) {
      this.logger.error('Restaurant search failed:', error);
      return {
        success: false,
        restaurants: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Search for a specific dish
   */
  public async searchDish(dishName: string): Promise<SearchWorkflowResult> {
    try {
      this.logger.log('Searching for dish:', dishName);

      // Execute search
      const result = await this.execute({
        searchQuery: dishName,
        waitForResults: true,
      });

      if (!result.success) {
        throw new Error(result.error || 'Search failed');
      }

      return result;
    } catch (error) {
      this.logger.error('Dish search failed:', error);
      return {
        success: false,
        restaurants: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear search input
   */
  public async clearSearch(): Promise<boolean> {
    try {
      const searchInput = await this.elementFinder.findSearchInput();
      if (!searchInput) {
        throw new Error('Search input not found');
      }

      searchInput.value = '';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      searchInput.dispatchEvent(new Event('change', { bubbles: true }));

      return true;
    } catch (error) {
      this.logger.error('Failed to clear search:', error);
      return false;
    }
  }

  /**
   * Navigate to restaurant page
   */
  public async navigateToRestaurant(restaurant: Restaurant): Promise<boolean> {
    try {
      this.logger.log('Navigating to restaurant:', restaurant.name);

      // Scroll to restaurant card
      await this.actionSimulator.scrollToElement(restaurant.element);

      // Click on restaurant card
      await this.actionSimulator.clickElement(restaurant.element);

      // Wait for navigation
      await this.waitForPageLoad();

      return true;
    } catch (error) {
      this.logger.error('Failed to navigate to restaurant:', error);
      return false;
    }
  }

  /**
   * Find search input with retry logic
   */
  private async findSearchInputWithRetry(maxRetries: number): Promise<HTMLInputElement | null> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.logger.log(`Finding search input (attempt ${attempt}/${maxRetries})`);

      const searchInput = await this.elementFinder.findSearchInput({
        timeout: 3000,
      });

      if (searchInput) {
        return searchInput;
      }

      if (attempt < maxRetries) {
        // Try scrolling to top and retry
        await this.actionSimulator.scrollToTop();
        await this.actionSimulator.waitForPageIdle(500);
      }
    }

    return null;
  }

  /**
   * Wait for search results to load
   */
  private async waitForSearchResults(): Promise<void> {
    this.logger.log('Waiting for search results...');

    // Wait for restaurant cards to appear
    await this.actionSimulator.waitFor(
      () => {
        const cards = this.domParser.extractRestaurants();
        return cards.length > 0;
      },
      { timeout: 10000, interval: 500 }
    );

    // Additional wait for animations
    await this.actionSimulator.waitForPageIdle(1000);
  }

  /**
   * Wait for page to load after navigation
   */
  private async waitForPageLoad(): Promise<void> {
    await this.actionSimulator.waitForPageIdle(2000);

    // Wait for menu items to load
    await this.actionSimulator.waitFor(
      () => {
        const menuItems = this.domParser.extractMenuItems();
        return menuItems.length > 0;
      },
      { timeout: 10000, interval: 500 }
    );
  }

  /**
   * Get search suggestions (if available)
   */
  public async getSearchSuggestions(): Promise<string[]> {
    try {
      const suggestions: string[] = [];

      // Look for suggestion elements
      const suggestionElements = document.querySelectorAll(
        '[data-testid*="suggestion"], .suggestion, .search-suggestion, [role="option"]'
      );

      suggestionElements.forEach((element) => {
        const text = element.textContent?.trim();
        if (text) {
          suggestions.push(text);
        }
      });

      return suggestions;
    } catch (error) {
      this.logger.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Apply filters to search results
   */
  public async applyFilters(filters: {
    rating?: number;
    deliveryTime?: string;
    cuisine?: string;
  }): Promise<boolean> {
    try {
      this.logger.log('Applying filters:', filters);

      // This is a placeholder - actual implementation depends on the site's filter UI
      // Filters might be dropdowns, checkboxes, or buttons

      if (filters.rating) {
        const ratingFilter = await this.elementFinder.findByText(`${filters.rating}+`);
        if (ratingFilter) {
          await this.actionSimulator.clickElement(ratingFilter);
        }
      }

      if (filters.cuisine) {
        const cuisineFilter = await this.elementFinder.findByText(filters.cuisine);
        if (cuisineFilter) {
          await this.actionSimulator.clickElement(cuisineFilter);
        }
      }

      // Wait for filtered results
      await this.actionSimulator.waitForPageIdle(1000);

      return true;
    } catch (error) {
      this.logger.error('Failed to apply filters:', error);
      return false;
    }
  }
}
