/**
 * Type definitions for Mobile App LLM Service
 * Hybrid architecture with on-device and cloud LLM capabilities
 */

export type LLMProvider = 'cloud' | 'ondevice';

export type QueryComplexity = 'simple' | 'medium' | 'complex';

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  stream?: boolean;
  preferredProvider?: LLMProvider;
}

export interface LLMResponse {
  text: string;
  provider: LLMProvider;
  model: string;
  finishReason: 'complete' | 'length' | 'stop' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cached?: boolean;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  finishReason?: 'complete' | 'length' | 'stop' | 'error';
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface LLMError {
  code: string;
  message: string;
  provider?: LLMProvider;
  originalError?: Error;
  retryable: boolean;
}

export interface QueryClassification {
  complexity: QueryComplexity;
  recommendedProvider: LLMProvider;
  confidence: number;
  reasoning: string;
}

export interface OfflineQueueItem {
  id: string;
  prompt: string;
  options?: LLMOptions;
  timestamp: string;
  retryCount: number;
}

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

export interface ModelInfo {
  name: string;
  version: string;
  size: number;
  isDownloaded: boolean;
  lastUpdated?: string;
}

export interface LLMMetrics {
  totalRequests: number;
  cloudRequests: number;
  onDeviceRequests: number;
  averageLatency: {
    cloud: number;
    onDevice: number;
  };
  errorRate: {
    cloud: number;
    onDevice: number;
  };
  offlineQueueSize: number;
}

export interface LLMConfig {
  onDevice: {
    enabled: boolean;
    modelName: string | null;
    modelPath: string | null;
    maxTokens: number;
    autoDownload: boolean;
    requiresWifi: boolean;
  };
  cloud: {
    enabled: boolean;
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };
  routing: {
    strategy: 'auto' | 'cloud-only' | 'ondevice-only' | 'cloud-first';
    simpleQueryMaxLength: number;
    complexQueryKeywords: string[];
    offlineMode: 'queue' | 'fail' | 'ondevice';
  };
  cache: {
    enabled: boolean;
    maxSize: number;
    ttlMs: number;
  };
}
