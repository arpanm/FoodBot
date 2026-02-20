/**
 * LLM Services - Public API
 * Export all LLM-related services for easy importing
 */

// Main service
export { LLMService, getLLMService, resetLLMService } from './LLMService';

// Clients
export { CloudLLMClient } from './CloudLLMClient';
export { OnDeviceLLMClient } from './OnDeviceLLMClient';

// Utilities
export { QueryClassifier } from './QueryClassifier';
export { OfflineManager } from './OfflineManager';

// Types
export type {
  LLMProvider,
  QueryComplexity,
  LLMOptions,
  LLMResponse,
  StreamChunk,
  ConversationMessage,
  LLMError,
  QueryClassification,
  OfflineQueueItem,
  NetworkStatus,
  ModelInfo,
  LLMMetrics,
  LLMConfig,
} from './types';
