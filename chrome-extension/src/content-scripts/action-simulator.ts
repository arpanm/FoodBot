/**
 * Action Simulator for human-like browser interactions
 */

export interface ClickOptions {
  delay?: number;
  doubleClick?: boolean;
  scrollIntoView?: boolean;
}

export interface TypeOptions {
  delay?: number;
  clearFirst?: boolean;
  pressEnter?: boolean;
}

export interface ScrollOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
}

export class ActionSimulator {
  private readonly logger = console;
  private readonly MIN_DELAY = 50;
  private readonly MAX_DELAY = 150;
  private readonly TYPING_MIN_DELAY = 50;
  private readonly TYPING_MAX_DELAY = 200;

  /**
   * Perform a human-like click on an element
   */
  public async clickElement(
    element: HTMLElement,
    options: ClickOptions = {}
  ): Promise<void> {
    try {
      const {
        delay = this.randomDelay(this.MIN_DELAY, this.MAX_DELAY),
        doubleClick = false,
        scrollIntoView = true,
      } = options;

      this.logger.log('Clicking element:', element);

      // Scroll element into view if needed
      if (scrollIntoView) {
        await this.scrollToElement(element);
        await this.sleep(this.randomDelay(100, 300));
      }

      // Check if element is visible and enabled
      if (!this.isElementVisible(element)) {
        throw new Error('Element is not visible');
      }

      if (element.hasAttribute('disabled')) {
        throw new Error('Element is disabled');
      }

      // Wait before clicking (human-like behavior)
      await this.sleep(delay);

      // Perform the click with mouse events for more realistic interaction
      await this.simulateMouseEvents(element, doubleClick);

      // Wait after click
      await this.sleep(this.randomDelay(100, 300));

      this.logger.log('Click completed');
    } catch (error) {
      this.logger.error('Failed to click element:', error);
      throw error;
    }
  }

  /**
   * Type text into an input field with human-like delays
   */
  public async typeIntoInput(
    input: HTMLInputElement | HTMLTextAreaElement,
    text: string,
    options: TypeOptions = {}
  ): Promise<void> {
    try {
      const { clearFirst = true, pressEnter = false } = options;

      this.logger.log('Typing into input:', input, 'text:', text);

      // Scroll to input
      await this.scrollToElement(input);

      // Focus the input
      input.focus();
      await this.sleep(this.randomDelay(100, 200));

      // Clear existing value if requested
      if (clearFirst && input.value) {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await this.sleep(this.randomDelay(50, 100));
      }

      // Type each character with random delays
      for (let i = 0; i < text.length; i++) {
        const char = text[i];

        // Simulate keydown
        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: char,
            code: `Key${char.toUpperCase()}`,
            bubbles: true,
          })
        );

        // Add character to input
        input.value += char;

        // Simulate input event
        input.dispatchEvent(new Event('input', { bubbles: true }));

        // Simulate keyup
        input.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: char,
            code: `Key${char.toUpperCase()}`,
            bubbles: true,
          })
        );

        // Random delay between characters
        await this.sleep(this.randomDelay(this.TYPING_MIN_DELAY, this.TYPING_MAX_DELAY));
      }

      // Dispatch change event
      input.dispatchEvent(new Event('change', { bubbles: true }));

      // Press Enter if requested
      if (pressEnter) {
        await this.sleep(this.randomDelay(100, 300));
        input.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
          })
        );
        input.dispatchEvent(
          new KeyboardEvent('keyup', {
            key: 'Enter',
            code: 'Enter',
            bubbles: true,
          })
        );
      }

      this.logger.log('Typing completed');
    } catch (error) {
      this.logger.error('Failed to type into input:', error);
      throw error;
    }
  }

  /**
   * Scroll to element with smooth animation
   */
  public async scrollToElement(
    element: HTMLElement,
    options: ScrollOptions = {}
  ): Promise<void> {
    try {
      const {
        behavior = 'smooth',
        block = 'center',
        inline = 'nearest',
      } = options;

      element.scrollIntoView({
        behavior,
        block,
        inline,
      });

      // Wait for scroll to complete
      await this.waitForScrollEnd();

      this.logger.log('Scrolled to element');
    } catch (error) {
      this.logger.error('Failed to scroll to element:', error);
      throw error;
    }
  }

  /**
   * Scroll by a specific amount
   */
  public async scrollBy(x: number, y: number): Promise<void> {
    try {
      window.scrollBy({
        top: y,
        left: x,
        behavior: 'smooth',
      });

      await this.waitForScrollEnd();
    } catch (error) {
      this.logger.error('Failed to scroll:', error);
      throw error;
    }
  }

  /**
   * Scroll to top of page
   */
  public async scrollToTop(): Promise<void> {
    try {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });

      await this.waitForScrollEnd();
    } catch (error) {
      this.logger.error('Failed to scroll to top:', error);
      throw error;
    }
  }

  /**
   * Scroll to bottom of page
   */
  public async scrollToBottom(): Promise<void> {
    try {
      window.scrollTo({
        top: document.body.scrollHeight,
        left: 0,
        behavior: 'smooth',
      });

      await this.waitForScrollEnd();
    } catch (error) {
      this.logger.error('Failed to scroll to bottom:', error);
      throw error;
    }
  }

  /**
   * Hover over an element
   */
  public async hoverElement(element: HTMLElement): Promise<void> {
    try {
      // Scroll into view first
      await this.scrollToElement(element);

      // Dispatch mouse events
      element.dispatchEvent(
        new MouseEvent('mouseenter', {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      );

      element.dispatchEvent(
        new MouseEvent('mouseover', {
          view: window,
          bubbles: true,
          cancelable: true,
        })
      );

      await this.sleep(this.randomDelay(100, 300));

      this.logger.log('Hover completed');
    } catch (error) {
      this.logger.error('Failed to hover element:', error);
      throw error;
    }
  }

  /**
   * Simulate mouse events for more realistic clicks
   */
  private async simulateMouseEvents(
    element: HTMLElement,
    doubleClick: boolean
  ): Promise<void> {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    const mouseEventOptions = {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    };

    // Mouse enter
    element.dispatchEvent(new MouseEvent('mouseenter', mouseEventOptions));
    await this.sleep(10);

    // Mouse over
    element.dispatchEvent(new MouseEvent('mouseover', mouseEventOptions));
    await this.sleep(10);

    // Mouse down
    element.dispatchEvent(new MouseEvent('mousedown', mouseEventOptions));
    await this.sleep(this.randomDelay(50, 150));

    // Mouse up
    element.dispatchEvent(new MouseEvent('mouseup', mouseEventOptions));
    await this.sleep(10);

    // Click
    element.dispatchEvent(new MouseEvent('click', mouseEventOptions));

    if (doubleClick) {
      await this.sleep(this.randomDelay(50, 150));
      element.dispatchEvent(new MouseEvent('dblclick', mouseEventOptions));
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
      style.display !== 'none' &&
      parseFloat(style.opacity) > 0
    );
  }

  /**
   * Wait for scroll animation to end
   */
  private async waitForScrollEnd(): Promise<void> {
    return new Promise<void>((resolve) => {
      let scrollTimeout: ReturnType<typeof setTimeout>;

      const handleScroll = (): void => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          window.removeEventListener('scroll', handleScroll);
          resolve();
        }, 100);
      };

      window.addEventListener('scroll', handleScroll);
      handleScroll();

      // Fallback timeout
      setTimeout(() => {
        window.removeEventListener('scroll', handleScroll);
        resolve();
      }, 2000);
    });
  }

  /**
   * Generate random delay between min and max
   */
  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Wait for a condition to be true
   */
  public async waitFor(
    condition: () => boolean,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<void> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Wait condition timeout');
      }
      await this.sleep(interval);
    }
  }

  /**
   * Wait for an element to appear
   */
  public async waitForElement(
    selector: string,
    options: { timeout?: number; interval?: number } = {}
  ): Promise<HTMLElement> {
    const { timeout = 5000, interval = 100 } = options;
    const startTime = Date.now();

    while (true) {
      const element = document.querySelector(selector) as HTMLElement | null;
      if (element && this.isElementVisible(element)) {
        return element;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Element not found: ${selector}`);
      }

      await this.sleep(interval);
    }
  }

  /**
   * Wait for page to be idle
   */
  public async waitForPageIdle(timeout = 2000): Promise<void> {
    await this.sleep(timeout);
  }
}
