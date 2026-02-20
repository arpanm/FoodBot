/**
 * LLM Service - Main entry point for hybrid LLM architecture
 * Intelligently routes queries between cloud and on-device LLMs
 */

import { CloudLLMClient } from './CloudLLMClient';
import { OnDeviceLLMClient } from './OnDeviceLLMClient';
import { QueryClassifier } from './QueryClassifier';
import { OfflineManager } from './OfflineManager';
import {
  LLMResponse,
  LLMOptions,
  LLMProvider,
  QueryComplexity,
  ConversationMessage,
  LLMError,
  LLMMetrics,
} from './types';
import { LLM_CONFIG } from '../../config/llm.config';

export class LLMService {
  private cloudClient: CloudLLMClient;
  private onDeviceClient: OnDeviceLLMClient;
  private classifier: QueryClassifier;
  private offlineManager: OfflineManager;
  private metrics: LLMMetrics;
  private responseCache: Map<string, { response: LLMResponse; timestamp: number }>;

  constructor() {
    this.cloudClient = new CloudLLMClient();
    this.onDeviceClient = new OnDeviceLLMClient();
    this.classifier = new QueryClassifier();
    this.offlineManager = new OfflineManager();
    this.responseCache = new Map();
    this.metrics = this.initializeMetrics();
  }

  /**
   * Complete a prompt using hybrid routing
   */
  async complete(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    try {
      // Check cache first
      if (LLM_CONFIG.cache.enabled && !options?.stream) {
        const cached = this.getCachedResponse(prompt);
        if (cached) {
          return { ...cached, cached: true };
        }
      }

      // Check if offline
      if (!this.offlineManager.isOnline()) {
        return await this.handleOffline(prompt, options);
      }

      // Classify query and route to appropriate provider
      const classification = this.classifier.classify(prompt);
      const provider = options?.preferredProvider || classification.recommendedProvider;

      console.log(`LLMService: Routing to ${provider} (${classification.complexity} complexity)`);

      let response: LLMResponse;

      if (provider === 'ondevice' && LLM_CONFIG.onDevice.enabled) {
        response = await this.completeOnDevice(prompt, options);
      } else {
        response = await this.completeCloud(prompt, options);
      }

      // Cache response
      if (LLM_CONFIG.cache.enabled) {
        this.cacheResponse(prompt, response);
      }

      // Update metrics
      response.latencyMs = Date.now() - startTime;
      this.updateMetrics(response.provider, true, response.latencyMs);

      return response;
    } catch (error) {
      this.updateMetrics('cloud', false, Date.now() - startTime);
      throw this.handleError(error);
    }
  }

  /**
   * Stream completion with chunks
   */
  async *streamCompletion(
    prompt: string,
    options?: LLMOptions
  ): AsyncGenerator<string, void, unknown> {
    this.metrics.totalRequests++;

    try {
      // Check if offline
      if (!this.offlineManager.isOnline()) {
        throw this.createError(
          'OFFLINE',
          'Cannot stream while offline',
          true
        );
      }

      // Classify and route
      const classification = this.classifier.classify(prompt);
      const provider = options?.preferredProvider || classification.recommendedProvider;

      if (provider === 'ondevice' && LLM_CONFIG.onDevice.enabled) {
        // On-device streaming
        for await (const chunk of this.onDeviceClient.stream(prompt, options)) {
          yield chunk;
        }
        this.metrics.onDeviceRequests++;
      } else {
        // Cloud streaming
        for await (const chunk of this.cloudClient.stream(prompt, options)) {
          yield chunk;
        }
        this.metrics.cloudRequests++;
      }
    } catch (error) {
      this.updateMetrics('cloud', false, 0);
      throw this.handleError(error);
    }
  }

  /**
   * Chat with conversation history
   */
  async chat(
    messages: ConversationMessage[],
    options?: LLMOptions
  ): Promise<LLMResponse> {
    // Extract last user message for classification
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw this.createError(
        'INVALID_INPUT',
        'Last message must be from user',
        false
      );
    }

    // Use cloud for chat (better context handling)
    return await this.completeCloud(lastMessage.content, options);
  }

  /**
   * Complete using cloud LLM
   */
  private async completeCloud(
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    if (!LLM_CONFIG.cloud.enabled) {
      throw this.createError(
        'CLOUD_DISABLED',
        'Cloud LLM is disabled in configuration',
        false
      );
    }

    try {
      const response = await this.cloudClient.complete(prompt, options);
      this.metrics.cloudRequests++;
      return response;
    } catch (error) {
      // Fallback to on-device if available
      if (LLM_CONFIG.onDevice.enabled && this.onDeviceClient.isAvailable()) {
        console.log('LLMService: Cloud failed, falling back to on-device');
        return await this.completeOnDevice(prompt, options);
      }
      throw error;
    }
  }

  /**
   * Complete using on-device LLM
   */
  private async completeOnDevice(
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    if (!LLM_CONFIG.onDevice.enabled) {
      throw this.createError(
        'ONDEVICE_DISABLED',
        'On-device LLM is disabled in configuration',
        false
      );
    }

    if (!this.onDeviceClient.isAvailable()) {
      throw this.createError(
        'ONDEVICE_NOT_AVAILABLE',
        'On-device model is not loaded or not downloaded',
        false
      );
    }

    try {
      const response = await this.onDeviceClient.complete(prompt, options);
      this.metrics.onDeviceRequests++;
      return response;
    } catch (error) {
      // Fallback to cloud if available
      if (LLM_CONFIG.cloud.enabled && this.offlineManager.isOnline()) {
        console.log('LLMService: On-device failed, falling back to cloud');
        return await this.completeCloud(prompt, options);
      }
      throw error;
    }
  }

  /**
   * Handle offline scenario
   */
  private async handleOffline(
    prompt: string,
    options?: LLMOptions
  ): Promise<LLMResponse> {
    const offlineMode = LLM_CONFIG.routing.offlineMode;

    if (offlineMode === 'ondevice' && LLM_CONFIG.onDevice.enabled) {
      // Try on-device model
      return await this.completeOnDevice(prompt, options);
    } else if (offlineMode === 'queue') {
      // Queue for later
      const queueId = await this.offlineManager.addToQueue(prompt, options);
      throw this.createError(
        'QUEUED',
        `Request queued for processing when online (ID: ${queueId})`,
        false
      );
    } else {
      // Fail immediately
      throw this.createError(
        'OFFLINE',
        'Cannot process request: Device is offline',
        false
      );
    }
  }

  /**
   * Classify query complexity
   */
  classifyQuery(prompt: string): QueryComplexity {
    const classification = this.classifier.classify(prompt);
    return classification.complexity;
  }

  /**
   * Get recommended provider for query
   */
  getRecommendedProvider(prompt: string): LLMProvider {
    const classification = this.classifier.classify(prompt);
    return classification.recommendedProvider;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<{
    cloud: boolean;
    onDevice: boolean;
    offline: boolean;
  }> {
    const isOnline = this.offlineManager.isOnline();
    const cloudAvailable = LLM_CONFIG.cloud.enabled && isOnline;
    const onDeviceAvailable =
      LLM_CONFIG.onDevice.enabled && this.onDeviceClient.isAvailable();

    return {
      cloud: cloudAvailable,
      onDevice: onDeviceAvailable,
      offline: !isOnline,
    };
  }

  /**
   * Get service metrics
   */
  getMetrics(): LLMMetrics {
    return {
      ...this.metrics,
      offlineQueueSize: this.offlineManager.getQueueSize(),
    };
  }

  /**
   * Get offline manager instance
   */
  getOfflineManager(): OfflineManager {
    return this.offlineManager;
  }

  /**
   * Initialize on-device model
   */
  async initializeOnDeviceModel(): Promise<void> {
    await this.onDeviceClient.initialize();
  }

  /**
   * Set authentication token for cloud API
   */
  setAuthToken(token: string): void {
    this.cloudClient.setAuthToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.cloudClient.clearAuthToken();
  }

  /**
   * Get cached response
   */
  private getCachedResponse(prompt: string): LLMResponse | null {
    const cacheKey = this.getCacheKey(prompt);
    const cached = this.responseCache.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.timestamp;
    if (age > LLM_CONFIG.cache.ttlMs) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  /**
   * Cache response
   */
  private cacheResponse(prompt: string, response: LLMResponse): void {
    const cacheKey = this.getCacheKey(prompt);

    // Enforce max cache size
    if (this.responseCache.size >= LLM_CONFIG.cache.maxSize) {
      // Remove oldest entry
      const firstKey = this.responseCache.keys().next().value;
      if (firstKey) {
        this.responseCache.delete(firstKey);
      }
    }

    this.responseCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Get cache key for prompt
   */
  private getCacheKey(prompt: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `cache_${hash}`;
  }

  /**
   * Clear response cache
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): LLMMetrics {
    return {
      totalRequests: 0,
      cloudRequests: 0,
      onDeviceRequests: 0,
      averageLatency: {
        cloud: 0,
        onDevice: 0,
      },
      errorRate: {
        cloud: 0,
        onDevice: 0,
      },
      offlineQueueSize: 0,
    };
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    provider: LLMProvider,
    success: boolean,
    latencyMs: number
  ): void {
    if (provider === 'cloud') {
      const prevAvg = this.metrics.averageLatency.cloud;
      const count = this.metrics.cloudRequests;
      this.metrics.averageLatency.cloud =
        (prevAvg * count + latencyMs) / (count + 1);
      if (!success) {
        this.metrics.errorRate.cloud++;
      }
    } else {
      const prevAvg = this.metrics.averageLatency.onDevice;
      const count = this.metrics.onDeviceRequests;
      this.metrics.averageLatency.onDevice =
        (prevAvg * count + latencyMs) / (count + 1);
      if (!success) {
        this.metrics.errorRate.onDevice++;
      }
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: unknown): LLMError {
    if (this.isLLMError(error)) {
      return error;
    }

    if (error instanceof Error) {
      return this.createError('UNKNOWN_ERROR', error.message, false);
    }

    return this.createError('UNKNOWN_ERROR', String(error), false);
  }

  /**
   * Create LLM error
   */
  private createError(
    code: string,
    message: string,
    retryable: boolean
  ): LLMError {
    return {
      code,
      message,
      retryable,
    };
  }

  /**
   * Type guard for LLMError
   */
  private isLLMError(error: unknown): error is LLMError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'retryable' in error
    );
  }

  /**
   * Cleanup and dispose
   */
  dispose(): void {
    this.offlineManager.dispose();
    this.clearCache();
  }
}

// Singleton instance for app-wide usage
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}

export function resetLLMService(): void {
  if (llmServiceInstance) {
    llmServiceInstance.dispose();
    llmServiceInstance = null;
  }
}
