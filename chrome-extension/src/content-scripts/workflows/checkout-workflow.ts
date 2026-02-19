/**
 * Checkout Workflow - Handles checkout process including address and payment
 */

import { ActionSimulator } from '../action-simulator';
import { DomParser, OrderSummary } from '../dom-parser';
import { ElementFinder } from '../element-finder';

export interface CheckoutOptions {
  address?: string;
  paymentMethod?: 'card' | 'upi' | 'cash' | 'wallet';
  saveAddress?: boolean;
}

export interface CheckoutWorkflowResult {
  success: boolean;
  orderSummary?: OrderSummary;
  orderId?: string;
  error?: string;
}

export class CheckoutWorkflow {
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
   * Execute complete checkout workflow
   */
  public async execute(options: CheckoutOptions = {}): Promise<CheckoutWorkflowResult> {
    try {
      this.logger.log('Starting checkout workflow');

      // Step 1: Navigate to checkout
      const checkoutStarted = await this.startCheckout();
      if (!checkoutStarted) {
        throw new Error('Failed to start checkout');
      }

      // Step 2: Get order summary
      const orderSummary = this.domParser.extractOrderSummary();
      this.logger.log('Order summary:', orderSummary);

      // Step 3: Handle address
      if (options.address) {
        const addressSet = await this.setDeliveryAddress(options.address, options.saveAddress);
        if (!addressSet) {
          throw new Error('Failed to set delivery address');
        }
      } else {
        // Use existing address if available
        const addressConfirmed = await this.confirmExistingAddress();
        if (!addressConfirmed) {
          throw new Error('No delivery address available');
        }
      }

      // Step 4: Handle payment method
      if (options.paymentMethod) {
        const paymentSet = await this.selectPaymentMethod(options.paymentMethod);
        if (!paymentSet) {
          throw new Error('Failed to select payment method');
        }
      }

      // Step 5: Review order
      await this.reviewOrder();

      // Note: We stop before placing the actual order to avoid real transactions
      // In production, this would be controlled by a flag

      this.logger.log('Checkout workflow completed (stopped before placing order)');

      return {
        success: true,
        orderSummary,
      };
    } catch (error) {
      this.logger.error('Checkout workflow failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Start checkout process
   */
  private async startCheckout(): Promise<boolean> {
    try {
      this.logger.log('Starting checkout');

      // Find checkout button
      const checkoutButton = await this.elementFinder.findCheckoutButton({
        timeout: 5000,
      });

      if (!checkoutButton) {
        throw new Error('Checkout button not found');
      }

      // Click checkout button
      await this.actionSimulator.clickElement(checkoutButton);

      // Wait for checkout page to load
      await this.actionSimulator.waitForPageIdle(2000);

      // Verify we're on checkout page
      const isCheckoutPage = await this.verifyCheckoutPage();
      if (!isCheckoutPage) {
        throw new Error('Not on checkout page after clicking checkout button');
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to start checkout:', error);
      return false;
    }
  }

  /**
   * Set delivery address
   */
  private async setDeliveryAddress(
    address: string,
    saveAddress = false
  ): Promise<boolean> {
    try {
      this.logger.log('Setting delivery address:', address);

      // Find address input
      const addressInput = await this.elementFinder.findAddressInput({
        timeout: 5000,
      });

      if (!addressInput) {
        throw new Error('Address input not found');
      }

      // Type address
      await this.actionSimulator.typeIntoInput(addressInput, address, {
        clearFirst: true,
      });

      // Wait for address suggestions
      await this.actionSimulator.waitForPageIdle(1000);

      // Select first suggestion if available
      const firstSuggestion = await this.elementFinder.waitForElement(
        '[data-testid="address-suggestion"], .address-suggestion, [role="option"]',
        { timeout: 3000 }
      );

      if (firstSuggestion) {
        await this.actionSimulator.clickElement(firstSuggestion);
      }

      // Save address if requested
      if (saveAddress) {
        await this.toggleSaveAddress(true);
      }

      // Confirm address
      const confirmButton = await this.elementFinder.findByText('Confirm Address');
      if (confirmButton) {
        await this.actionSimulator.clickElement(confirmButton);
      }

      await this.actionSimulator.waitForPageIdle(1000);

      return true;
    } catch (error) {
      this.logger.error('Failed to set delivery address:', error);
      return false;
    }
  }

  /**
   * Confirm existing address
   */
  private async confirmExistingAddress(): Promise<boolean> {
    try {
      // Check if there's a saved address
      const savedAddress = document.querySelector(
        '[data-testid="saved-address"], .saved-address, .selected-address'
      );

      if (!savedAddress) {
        return false;
      }

      // Find and click confirm/continue button
      const confirmButton = await this.elementFinder.findElementContainingText(
        'button',
        'Continue',
        { timeout: 3000 }
      );

      if (confirmButton) {
        await this.actionSimulator.clickElement(confirmButton);
        await this.actionSimulator.waitForPageIdle(1000);
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to confirm existing address:', error);
      return false;
    }
  }

  /**
   * Select payment method
   */
  private async selectPaymentMethod(
    paymentMethod: 'card' | 'upi' | 'cash' | 'wallet'
  ): Promise<boolean> {
    try {
      this.logger.log('Selecting payment method:', paymentMethod);

      // Map payment method to display text
      const paymentMethodText: Record<string, string[]> = {
        card: ['Card', 'Credit Card', 'Debit Card'],
        upi: ['UPI', 'Google Pay', 'PhonePe', 'Paytm'],
        cash: ['Cash', 'Cash on Delivery', 'COD'],
        wallet: ['Wallet', 'Paytm Wallet', 'Amazon Pay'],
      };

      const textOptions = paymentMethodText[paymentMethod] || [paymentMethod];

      // Try to find payment option
      let paymentOption: HTMLElement | null = null;

      for (const text of textOptions) {
        paymentOption = await this.elementFinder.findByText(text);
        if (paymentOption) {
          break;
        }
      }

      if (!paymentOption) {
        throw new Error(`Payment method not found: ${paymentMethod}`);
      }

      // Click payment option
      await this.actionSimulator.clickElement(paymentOption);

      await this.actionSimulator.waitForPageIdle(1000);

      return true;
    } catch (error) {
      this.logger.error('Failed to select payment method:', error);
      return false;
    }
  }

  /**
   * Review order before placement
   */
  private async reviewOrder(): Promise<void> {
    try {
      this.logger.log('Reviewing order');

      // Scroll through order summary
      const orderSummary = document.querySelector(
        '[data-testid="order-summary"], .order-summary, .checkout-summary'
      );

      if (orderSummary) {
        await this.actionSimulator.scrollToElement(orderSummary as HTMLElement);
      }

      // Extract and log order details
      const summary = this.domParser.extractOrderSummary();
      this.logger.log('Order items:', summary.items);
      this.logger.log('Subtotal:', summary.subtotal);
      this.logger.log('Delivery fee:', summary.deliveryFee);
      this.logger.log('Taxes:', summary.taxes);
      this.logger.log('Total:', summary.total);

      await this.actionSimulator.waitForPageIdle(1000);
    } catch (error) {
      this.logger.error('Failed to review order:', error);
    }
  }

  /**
   * Place order (CAUTION: This will create a real order)
   */
  public async placeOrder(): Promise<CheckoutWorkflowResult> {
    try {
      this.logger.warn('⚠️ PLACING REAL ORDER - This will create an actual order!');

      // Find place order button
      const placeOrderButton = await this.elementFinder.findElementContainingText(
        'button',
        'Place Order',
        { timeout: 5000 }
      );

      if (!placeOrderButton) {
        throw new Error('Place order button not found');
      }

      // Click place order
      await this.actionSimulator.clickElement(placeOrderButton);

      // Wait for order confirmation
      await this.waitForOrderConfirmation();

      // Extract order ID
      const orderId = await this.extractOrderId();

      this.logger.log('Order placed successfully. Order ID:', orderId);

      return {
        success: true,
        orderId,
      };
    } catch (error) {
      this.logger.error('Failed to place order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Apply coupon code
   */
  public async applyCoupon(couponCode: string): Promise<boolean> {
    try {
      this.logger.log('Applying coupon:', couponCode);

      // Find coupon input
      const couponInput = document.querySelector(
        'input[placeholder*="coupon"], input[placeholder*="Coupon"], input[name*="coupon"]'
      ) as HTMLInputElement | null;

      if (!couponInput) {
        throw new Error('Coupon input not found');
      }

      // Type coupon code
      await this.actionSimulator.typeIntoInput(couponInput, couponCode);

      // Find and click apply button
      const applyButton = await this.elementFinder.findElementContainingText(
        'button',
        'Apply',
        { timeout: 3000 }
      );

      if (!applyButton) {
        throw new Error('Apply button not found');
      }

      await this.actionSimulator.clickElement(applyButton);

      // Wait for coupon to be applied
      await this.actionSimulator.waitForPageIdle(2000);

      // Check for success message
      const successMessage = await this.elementFinder.findByText('Coupon applied');

      return !!successMessage;
    } catch (error) {
      this.logger.error('Failed to apply coupon:', error);
      return false;
    }
  }

  /**
   * Add delivery instructions
   */
  public async addDeliveryInstructions(instructions: string): Promise<boolean> {
    try {
      this.logger.log('Adding delivery instructions');

      const instructionsInput = document.querySelector(
        'textarea[placeholder*="instruction"], textarea[placeholder*="note"], textarea[name*="instruction"]'
      ) as HTMLTextAreaElement | null;

      if (!instructionsInput) {
        this.logger.warn('Delivery instructions input not found');
        return false;
      }

      await this.actionSimulator.typeIntoInput(instructionsInput, instructions);

      return true;
    } catch (error) {
      this.logger.error('Failed to add delivery instructions:', error);
      return false;
    }
  }

  /**
   * Select delivery time slot
   */
  public async selectDeliveryTimeSlot(timeSlot: string): Promise<boolean> {
    try {
      this.logger.log('Selecting delivery time slot:', timeSlot);

      const timeSlotOption = await this.elementFinder.findByText(timeSlot);

      if (!timeSlotOption) {
        throw new Error('Time slot not found');
      }

      await this.actionSimulator.clickElement(timeSlotOption);

      return true;
    } catch (error) {
      this.logger.error('Failed to select delivery time slot:', error);
      return false;
    }
  }

  /**
   * Verify we're on checkout page
   */
  private async verifyCheckoutPage(): Promise<boolean> {
    const checkoutIndicators = [
      document.querySelector('[data-testid*="checkout"]'),
      document.querySelector('.checkout-page'),
      document.querySelector('.payment-page'),
      document.title.toLowerCase().includes('checkout'),
      window.location.href.toLowerCase().includes('checkout'),
    ];

    return checkoutIndicators.some((indicator) => !!indicator);
  }

  /**
   * Toggle save address checkbox
   */
  private async toggleSaveAddress(save: boolean): Promise<void> {
    try {
      const checkbox = document.querySelector(
        'input[type="checkbox"][name*="save"]'
      ) as HTMLInputElement | null;

      if (!checkbox) {
        return;
      }

      if (checkbox.checked !== save) {
        await this.actionSimulator.clickElement(checkbox);
      }
    } catch (error) {
      this.logger.warn('Failed to toggle save address:', error);
    }
  }

  /**
   * Wait for order confirmation page
   */
  private async waitForOrderConfirmation(): Promise<void> {
    await this.actionSimulator.waitFor(
      () => {
        return !!(
          document.querySelector('[data-testid="order-confirmation"]') ||
          document.querySelector('.order-confirmation') ||
          document.querySelector('.order-success') ||
          window.location.href.includes('order-confirmation')
        );
      },
      { timeout: 30000, interval: 500 }
    );
  }

  /**
   * Extract order ID from confirmation page
   */
  private async extractOrderId(): Promise<string | undefined> {
    try {
      // Look for order ID patterns
      const orderIdElement = document.querySelector(
        '[data-testid="order-id"], .order-id, .order-number'
      );

      if (orderIdElement?.textContent) {
        return orderIdElement.textContent.trim();
      }

      // Try to extract from URL
      const urlMatch = window.location.href.match(/order[/-](\w+)/i);
      if (urlMatch) {
        return urlMatch[1];
      }

      // Try to find in page text
      const pageText = document.body.textContent || '';
      const textMatch = pageText.match(/Order\s+(?:ID|Number)?\s*[:#]?\s*(\w+)/i);
      if (textMatch) {
        return textMatch[1];
      }

      return undefined;
    } catch (error) {
      this.logger.error('Failed to extract order ID:', error);
      return undefined;
    }
  }
}
