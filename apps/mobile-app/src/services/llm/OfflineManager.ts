/**
 * Offline Manager
 * Handles network detection, request queuing, and offline fallback
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NetworkStatus,
  OfflineQueueItem,
  LLMOptions,
  LLMResponse,
} from './types';
import { LLM_CONFIG } from '../../config/llm.config';

const QUEUE_STORAGE_KEY = '@foodbot:llm:offline_queue';
const MAX_QUEUE_SIZE = 50;

export class OfflineManager {
  private networkStatus: NetworkStatus = {
    isConnected: true,
    isInternetReachable: null,
    type: null,
  };
  private listeners: Set<(status: NetworkStatus) => void> = new Set();
  private queue: OfflineQueueItem[] = [];
  private processingQueue: boolean = false;

  constructor() {
    this.initializeNetworkListener();
    this.loadQueueFromStorage();
  }

  /**
   * Initialize network status listener
   */
  private initializeNetworkListener(): void {
    NetInfo.addEventListener((state: NetInfoState) => {
      const prevStatus = this.networkStatus;
      this.networkStatus = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      };

      // Notify listeners
      this.listeners.forEach((listener) => listener(this.networkStatus));

      // Process queue when coming back online
      if (!prevStatus.isConnected && this.networkStatus.isConnected) {
        this.processQueue();
      }
    });
  }

  /**
   * Get current network status
   */
  getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return this.networkStatus.isConnected;
  }

  /**
   * Check if on WiFi (for model downloads)
   */
  isWiFi(): boolean {
    return this.networkStatus.type === 'wifi';
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.listeners.add(listener);
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Add request to offline queue
   */
  async addToQueue(prompt: string, options?: LLMOptions): Promise<string> {
    const item: OfflineQueueItem = {
      id: this.generateId(),
      prompt,
      options,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    // Check queue size limit
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      // Remove oldest item
      this.queue.shift();
    }

    this.queue.push(item);
    await this.saveQueueToStorage();

    return item.id;
  }

  /**
   * Remove item from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    this.queue = this.queue.filter((item) => item.id !== id);
    await this.saveQueueToStorage();
  }

  /**
   * Get queue items
   */
  getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueueToStorage();
  }

  /**
   * Process queued requests (when coming back online)
   */
  async processQueue(): Promise<void> {
    if (this.processingQueue || this.queue.length === 0 || !this.isOnline()) {
      return;
    }

    this.processingQueue = true;

    try {
      const itemsToProcess = [...this.queue];

      for (const item of itemsToProcess) {
        try {
          // Dispatch event to trigger processing
          // The LLMService will handle the actual request
          this.notifyQueueItemReady(item);

          // Remove from queue after successful dispatch
          await this.removeFromQueue(item.id);
        } catch (error) {
          console.error(
            `OfflineManager: Failed to process queue item ${item.id}:`,
            error
          );

          // Increment retry count
          item.retryCount++;

          // Remove if exceeded max retries
          if (item.retryCount >= 3) {
            await this.removeFromQueue(item.id);
          }
        }
      }
    } finally {
      this.processingQueue = false;
      await this.saveQueueToStorage();
    }
  }

  /**
   * Handle offline request based on config
   */
  async handleOfflineRequest(
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse | string> {
    const offlineMode = LLM_CONFIG.routing.offlineMode;

    switch (offlineMode) {
      case 'queue':
        // Queue for later processing
        const queueId = await this.addToQueue(prompt, options);
        return queueId;

      case 'fail':
        // Return error immediately
        throw new Error('Cannot process request: Device is offline');

      case 'ondevice':
        // Try on-device model if available
        if (LLM_CONFIG.onDevice.enabled) {
          // Signal to use on-device model
          throw new Error('USE_ONDEVICE');
        } else {
          // Queue if on-device not available
          const id = await this.addToQueue(prompt, options);
          return id;
        }

      default:
        throw new Error(`Unknown offline mode: ${offlineMode}`);
    }
  }

  /**
   * Load queue from persistent storage
   */
  private async loadQueueFromStorage(): Promise<void> {
    try {
      const queueJson = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (queueJson) {
        this.queue = JSON.parse(queueJson);
      }
    } catch (error) {
      console.error('OfflineManager: Failed to load queue from storage:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveQueueToStorage(): Promise<void> {
    try {
      const queueJson = JSON.stringify(this.queue);
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, queueJson);
    } catch (error) {
      console.error('OfflineManager: Failed to save queue to storage:', error);
    }
  }

  /**
   * Generate unique ID for queue item
   */
  private generateId(): string {
    return `llm_queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Notify that a queue item is ready for processing
   * This is a placeholder for event dispatch
   */
  private notifyQueueItemReady(item: OfflineQueueItem): void {
    // TODO: Integrate with React Native event system or Redux
    // For now, just log
    console.log('OfflineManager: Queue item ready for processing:', item.id);
  }

  /**
   * Get network quality estimate
   */
  getNetworkQuality(): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!this.networkStatus.isConnected) {
      return 'offline';
    }

    // Simplified network quality check
    // In production, could measure actual latency
    if (this.networkStatus.type === 'wifi') {
      return 'excellent';
    } else if (this.networkStatus.type === 'cellular') {
      // Could check cellular generation (4G, 5G, etc.)
      return 'good';
    } else {
      return 'poor';
    }
  }

  /**
   * Should use cloud LLM based on network quality
   */
  shouldUseCloud(): boolean {
    const quality = this.getNetworkQuality();
    return quality !== 'offline' && quality !== 'poor';
  }

  /**
   * Get offline statistics
   */
  getStats(): {
    queueSize: number;
    isOnline: boolean;
    networkType: string | null;
    networkQuality: string;
  } {
    return {
      queueSize: this.queue.length,
      isOnline: this.isOnline(),
      networkType: this.networkStatus.type,
      networkQuality: this.getNetworkQuality(),
    };
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.listeners.clear();
  }
}
