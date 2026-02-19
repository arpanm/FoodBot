/**
 * Background Service Worker for FoodBot Chrome Extension
 * Handles communication between content scripts, popup, and backend API
 */

import {
  MessageType,
  ExtensionMessage,
  OrderRequest,
  StoredSession,
  SessionStatus,
  ExtensionError,
} from '../shared/types';
import {
  VERSION,
  MESSAGES,
  ERROR_CODES,
  STORAGE_QUOTA,
} from '../shared/constants';
import { ApiClient } from './api-client';
import { JobPoller } from './job-poller';

// Initialize API client and job poller
const apiClient = new ApiClient('http://localhost:3000');
const jobPoller = new JobPoller(apiClient, {
  pollingInterval: 2000,
  batchSize: 10,
  maxConcurrentJobs: 3,
  retryAttempts: 3,
  retryDelay: 5000,
});

class BackgroundService {
  private activeSessions: Map<string, StoredSession> = new Map();
  private readonly apiClient: ApiClient;
  private readonly jobPoller: JobPoller;

  constructor(apiClient: ApiClient, jobPoller: JobPoller) {
    this.apiClient = apiClient;
    this.jobPoller = jobPoller;
    // Call initialize asynchronously
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    console.log('FoodBot Background Service Worker initialized');

    // Set up message listeners
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Set up connection listeners
    chrome.runtime.onConnect.addListener(this.handleConnection.bind(this));

    // Set up installation listener
    chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));

    // Set up storage change listener
    chrome.storage.onChanged.addListener(this.handleStorageChange.bind(this));

    // Set up tab update listener
    chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));

    // Set up alarm listener
    chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));

    // Set up commands listener
    chrome.commands.onCommand.addListener(this.handleCommand.bind(this));

    // Load configuration
    const config = await this.loadConfiguration();

    // Update API client base URL if configured
    if (config.apiBaseUrl) {
      this.apiClient.setBaseUrl(config.apiBaseUrl);
    }

    // Check API health
    const isHealthy = await this.apiClient.healthCheck();
    console.log('API health check:', isHealthy ? 'OK' : 'FAILED');

    // Start job polling if enabled
    if (config.autoStartPolling !== false) {
      this.jobPoller.start();
    }

    // Update badge
    this.updateBadge(isHealthy ? 'active' : 'error');

    // Setup periodic tasks
    this.setupPeriodicTasks();

    // Load existing sessions from storage
    this.loadSessions();
  }

  private handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean {
    console.log('Received message:', message.type, 'from:', sender.tab?.id);

    switch (message.type) {
      case MessageType.START_ORDER:
        this.handleStartOrder(message.payload as OrderRequest, sender)
          .then(sendResponse)
          .catch((error) => this.handleError(error, sendResponse));
        return true;

      case MessageType.EXTRACT_MENU:
        this.handleExtractMenu(sender)
          .then(sendResponse)
          .catch((error) => this.handleError(error, sendResponse));
        return true;

      case MessageType.ANALYZE_PAGE:
        this.handleAnalyzePage(sender)
          .then(sendResponse)
          .catch((error) => this.handleError(error, sendResponse));
        return true;

      case MessageType.UPDATE_STATUS:
        this.handleUpdateStatus(message.payload)
          .then(sendResponse)
          .catch((error) => this.handleError(error, sendResponse));
        return true;

      default:
        sendResponse({ error: 'Unknown message type' });
        return false;
    }
  }

  private handleConnection(port: chrome.runtime.Port): void {
    console.log('New connection established:', port.name);

    port.onMessage.addListener((message: ExtensionMessage) => {
      console.log('Message from port:', message);
      // Handle long-lived connections for real-time updates
    });

    port.onDisconnect.addListener(() => {
      console.log('Connection closed:', port.name);
    });
  }

  private handleInstall(details: chrome.runtime.InstalledDetails): void {
    if (details.reason === 'install') {
      console.log('FoodBot extension installed for the first time');
      this.showNotification({
        title: 'FoodBot Installed!',
        message: 'Click the extension icon to start ordering food with AI assistance.',
      });
    } else if (details.reason === 'update') {
      console.log('FoodBot extension updated to version:', VERSION);
    }
  }

  private handleStorageChange(
    changes: { [key: string]: chrome.storage.StorageChange },
    areaName: string
  ): void {
    if (areaName === 'local') {
      console.log('Storage changed:', Object.keys(changes));
    }
  }

  private async handleStartOrder(
    orderRequest: OrderRequest,
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    console.log('Starting order process:', orderRequest);

    try {
      // Create new session
      const session: StoredSession = {
        sessionId: orderRequest.sessionId,
        userId: orderRequest.userId,
        startTime: Date.now(),
        lastActivity: Date.now(),
        status: SessionStatus.ACTIVE,
        currentPage: sender.tab?.url,
        orderData: orderRequest,
      };

      // Store session
      this.activeSessions.set(session.sessionId, session);
      await this.saveSession(session);

      // Send to content script to start automation
      if (sender.tab?.id) {
        await chrome.tabs.sendMessage(sender.tab.id, {
          type: MessageType.START_ORDER,
          payload: orderRequest,
        });
      }

      this.showNotification({
        title: 'Order Started',
        message: MESSAGES.ORDER_STARTED,
      });

      return { success: true, sessionId: session.sessionId };
    } catch (error) {
      throw new ExtensionError(
        'Failed to start order',
        ERROR_CODES.UNKNOWN_ERROR,
        { error }
      );
    }
  }

  private async handleExtractMenu(
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    console.log('Extracting menu from tab:', sender.tab?.id);

    if (!sender.tab?.id) {
      throw new ExtensionError(
        'No tab ID available',
        ERROR_CODES.INVALID_RESPONSE
      );
    }

    try {
      // Inject content script if needed
      await chrome.scripting.executeScript({
        target: { tabId: sender.tab.id },
        files: ['content-scripts/swiggy-content.js'],
      });

      // Request menu extraction
      const response = await chrome.tabs.sendMessage(sender.tab.id, {
        type: MessageType.EXTRACT_MENU,
      });

      return response;
    } catch (error) {
      throw new ExtensionError(
        'Failed to extract menu',
        ERROR_CODES.ELEMENT_NOT_FOUND,
        { error }
      );
    }
  }

  private async handleAnalyzePage(
    sender: chrome.runtime.MessageSender
  ): Promise<unknown> {
    console.log('Analyzing page:', sender.tab?.url);

    if (!sender.tab?.id) {
      throw new ExtensionError(
        'No tab ID available',
        ERROR_CODES.INVALID_RESPONSE
      );
    }

    try {
      const response = await chrome.tabs.sendMessage(sender.tab.id, {
        type: MessageType.ANALYZE_PAGE,
      });

      return response;
    } catch (error) {
      throw new ExtensionError(
        'Failed to analyze page',
        ERROR_CODES.PAGE_LOAD_ERROR,
        { error }
      );
    }
  }

  private async handleUpdateStatus(payload: unknown): Promise<unknown> {
    console.log('Updating status:', payload);
    // Update session status and notify popup
    return { success: true };
  }

  private handleError(error: unknown, sendResponse: (response: unknown) => void): void {
    console.error('Error handling message:', error);

    const errorMessage =
      error instanceof ExtensionError
        ? error.message
        : 'An unexpected error occurred';

    const errorCode =
      error instanceof ExtensionError
        ? error.code
        : ERROR_CODES.UNKNOWN_ERROR;

    sendResponse({
      success: false,
      error: errorMessage,
      code: errorCode,
    });

    this.showNotification({
      title: 'Error',
      message: errorMessage,
    });
  }

  private async loadSessions(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(null);
      const sessionKeys = Object.keys(result).filter((key) =>
        key.startsWith('session_')
      );

      for (const key of sessionKeys) {
        const session = result[key] as StoredSession;
        this.activeSessions.set(session.sessionId, session);
      }

      console.log('Loaded sessions:', this.activeSessions.size);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
  }

  private async saveSession(session: StoredSession): Promise<void> {
    const key = `session_${session.sessionId}`;
    await chrome.storage.local.set({ [key]: session });
  }


  private async cleanupOldSessions(): Promise<void> {
    const now = Date.now();
    const expiryTime = STORAGE_QUOTA.SESSION_EXPIRY_HOURS * 60 * 60 * 1000;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now - session.lastActivity > expiryTime) {
        console.log('Cleaning up expired session:', sessionId);
        this.activeSessions.delete(sessionId);
        await chrome.storage.local.remove(`session_${sessionId}`);
      }
    }
  }

  private showNotification(options: {
    title: string;
    message: string;
  }): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('images/icon48.png'),
      title: options.title,
      message: options.message,
      priority: 1,
    });
  }

  private async loadConfiguration(): Promise<any> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          apiBaseUrl: 'http://localhost:3000',
          autoStartPolling: true,
          pollingInterval: 2000,
        },
        (items) => {
          resolve(items);
        }
      );
    });
  }

  private updateBadge(status: 'active' | 'paused' | 'error'): void {
    const badges = {
      active: { text: '●', color: '#00C853' },
      paused: { text: '●', color: '#FFA000' },
      error: { text: '●', color: '#D32F2F' },
    };

    const badge = badges[status];
    chrome.action.setBadgeText({ text: badge.text });
    chrome.action.setBadgeBackgroundColor({ color: badge.color });
  }

  private setupPeriodicTasks(): void {
    // Health check every 5 minutes
    chrome.alarms.create('health-check', {
      periodInMinutes: 5,
    });

    // Cleanup every hour
    chrome.alarms.create('cleanup', {
      periodInMinutes: 60,
    });

    console.log('Periodic tasks configured');
  }

  private handleTabUpdate(
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ): void {
    if (changeInfo.status === 'complete' && tab.url) {
      // Detect food delivery platforms
      const platforms = ['swiggy.com', 'zomato.com'];
      const isPlatform = platforms.some((platform) =>
        tab.url?.includes(platform)
      );

      if (isPlatform) {
        console.log('Food delivery platform detected:', tab.url);
        // Inject content script if not already injected
        void this.injectContentScript(tabId);
      }
    }
  }

  private async injectContentScript(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content-scripts/main.js'],
      });

      console.log('Content script injected into tab', tabId);
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }

  private handleAlarm(alarm: chrome.alarms.Alarm): void {
    console.log('Alarm triggered:', alarm.name);

    switch (alarm.name) {
      case 'health-check':
        void this.performHealthCheck();
        break;

      case 'cleanup':
        void this.performCleanup();
        break;
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const isHealthy = await this.apiClient.healthCheck();
      console.log('Health check result:', isHealthy);

      if (!isHealthy) {
        this.updateBadge('error');
      } else if (!this.jobPoller.getStatus().isPolling) {
        this.updateBadge('paused');
      } else {
        this.updateBadge('active');
      }
    } catch (error) {
      console.error('Health check failed:', error);
      this.updateBadge('error');
    }
  }

  private async performCleanup(): Promise<void> {
    console.log('Performing cleanup');
    await this.cleanupOldSessions();
  }

  private handleCommand(command: string): void {
    console.log('Command received:', command);

    switch (command) {
      case 'toggle-polling':
        this.togglePolling();
        break;

      case 'force-poll':
        void this.jobPoller.pollNow();
        break;
    }
  }

  private togglePolling(): void {
    const status = this.jobPoller.getStatus();

    if (!status.isPolling) {
      this.jobPoller.start();
      this.updateBadge('active');
      console.log('Polling started');
    } else {
      this.jobPoller.stop();
      this.updateBadge('paused');
      console.log('Polling stopped');
    }
  }
}

// Initialize the background service
const backgroundService = new BackgroundService(apiClient, jobPoller);

// Export for testing
export { BackgroundService, backgroundService, apiClient, jobPoller };
