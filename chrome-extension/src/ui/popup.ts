/**
 * Popup UI Script for FoodBot Chrome Extension
 * Handles user interactions in the extension popup
 */

import { MessageType, OrderRequest, ExtensionMessage } from '../shared/types';
import { STORAGE_KEYS, MESSAGES } from '../shared/constants';

class PopupUI {
  private form: HTMLFormElement;
  private startButton: HTMLButtonElement;
  private statusElement: HTMLElement;
  private sessionInfoElement: HTMLElement;
  private messageInput: HTMLTextAreaElement;
  private locationInput: HTMLInputElement;
  private currentSessionId: string | null = null;

  constructor() {
    this.form = document.getElementById('orderForm') as HTMLFormElement;
    this.startButton = document.getElementById('startOrderBtn') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;
    this.sessionInfoElement = document.getElementById('sessionInfo') as HTMLElement;
    this.messageInput = document.getElementById('userMessage') as HTMLTextAreaElement;
    this.locationInput = document.getElementById('location') as HTMLInputElement;

    this.initialize();
  }

  private initialize(): void {
    console.log('FoodBot popup initialized');

    // Set up event listeners
    this.form.addEventListener('submit', this.handleSubmit.bind(this));

    document.getElementById('settingsLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openSettings();
    });

    document.getElementById('helpLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });

    // Load saved data
    this.loadSavedData();

    // Check if we're on a supported platform
    this.checkCurrentTab();
  }

  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const userMessage = this.messageInput.value.trim();
    const location = this.locationInput.value.trim();

    if (!userMessage) {
      this.showStatus('Please enter what you would like to order', 'error');
      return;
    }

    // Generate session ID
    this.currentSessionId = this.generateSessionId();

    // Get user ID from storage or generate new one
    const userId = await this.getUserId();

    // Create order request
    const orderRequest: OrderRequest = {
      userId,
      sessionId: this.currentSessionId,
      userMessage,
      context: location ? { location } : undefined,
    };

    // Disable form
    this.setLoading(true);
    this.showStatus(MESSAGES.ORDER_STARTED, 'info');

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Check if tab is on supported platform
      if (!this.isSupportedPlatform(tab.url || '')) {
        this.showStatus(
          'Please navigate to Swiggy.com first, then click Start Order',
          'error'
        );
        this.setLoading(false);
        return;
      }

      // Send message to background script
      const response = await chrome.runtime.sendMessage({
        type: MessageType.START_ORDER,
        payload: orderRequest,
      } as ExtensionMessage);

      if (response.success) {
        this.showStatus('Order process started! Check the page for progress.', 'success');
        this.showSessionInfo(this.currentSessionId);

        // Save to storage
        await this.saveOrderData(orderRequest);

        // Keep popup open by not closing it
        // User can close it manually or watch the progress
      } else {
        throw new Error(response.error || 'Failed to start order');
      }
    } catch (error) {
      console.error('Error starting order:', error);
      this.showStatus(
        error instanceof Error ? error.message : 'Failed to start order. Please try again.',
        'error'
      );
      this.setLoading(false);
    }
  }

  private async loadSavedData(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.CURRENT_ORDER,
        STORAGE_KEYS.PREFERENCES,
      ]);

      if (result[STORAGE_KEYS.CURRENT_ORDER]) {
        const order = result[STORAGE_KEYS.CURRENT_ORDER] as OrderRequest;
        this.messageInput.value = order.userMessage || '';
        this.locationInput.value = order.context?.location || '';
      }

      if (result[STORAGE_KEYS.PREFERENCES]) {
        const prefs = result[STORAGE_KEYS.PREFERENCES];
        this.locationInput.value = this.locationInput.value || prefs.defaultLocation || '';
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }

  private async saveOrderData(orderRequest: OrderRequest): Promise<void> {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.CURRENT_ORDER]: orderRequest,
      });
    } catch (error) {
      console.error('Error saving order data:', error);
    }
  }

  private async getUserId(): Promise<string> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.USER_ID);

      if (result[STORAGE_KEYS.USER_ID]) {
        return result[STORAGE_KEYS.USER_ID] as string;
      }

      // Generate new user ID
      const newUserId = this.generateUserId();
      await chrome.storage.local.set({ [STORAGE_KEYS.USER_ID]: newUserId });
      return newUserId;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return this.generateUserId();
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private isSupportedPlatform(url: string): boolean {
    return url.includes('swiggy.com') || url.includes('zomato.com');
  }

  private async checkCurrentTab(): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url) {
        return;
      }

      if (!this.isSupportedPlatform(tab.url)) {
        this.showStatus(
          'Navigate to Swiggy.com or Zomato.com to start ordering',
          'info'
        );
      }
    } catch (error) {
      console.error('Error checking current tab:', error);
    }
  }

  private showStatus(message: string, type: 'info' | 'success' | 'error'): void {
    this.statusElement.textContent = message;
    this.statusElement.className = `status ${type}`;
    this.statusElement.classList.remove('hidden');
  }

  private showSessionInfo(sessionId: string): void {
    this.sessionInfoElement.textContent = `Session: ${sessionId}`;
    this.sessionInfoElement.classList.remove('hidden');
  }

  private setLoading(loading: boolean): void {
    this.startButton.disabled = loading;
    this.messageInput.disabled = loading;
    this.locationInput.disabled = loading;

    if (loading) {
      this.startButton.innerHTML = '<span class="loading"></span>Processing...';
    } else {
      this.startButton.textContent = 'Start Order';
    }
  }

  private openSettings(): void {
    // TODO: Open settings page
    console.log('Open settings');
  }

  private openHelp(): void {
    // Open help documentation
    chrome.tabs.create({
      url: 'https://github.com/foodbot/docs',
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupUI();
});

// Export for testing
export { PopupUI };
