/**
 * Type definitions for LLM Router
 */

export interface LLMProvider {
  readonly name: string;
  readonly models: string[];

  /**
   * Generate completion for a prompt
   */
  generateCompletion(
    prompt: string,
    options?: GenerationOptions
  ): Promise<CompletionResponse>;

  /**
   * Generate streaming completion
   */
  generateStream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncIterableIterator<StreamChunk>;

  /**
   * Check provider health
   */
  healthCheck(): Promise<ProviderHealth>;
}

export interface GenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  systemPrompt?: string;
  conversationHistory?: ConversationMessage[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionResponse {
  text: string;
  model: string;
  provider: string;
  finishReason: 'complete' | 'length' | 'stop' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export interface StreamChunk {
  text: string;
  isComplete: boolean;
  finishReason?: 'complete' | 'length' | 'stop' | 'error';
}

export interface ProviderHealth {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  lastChecked: string;
  details?: string;
}

export interface RoutingStrategy {
  /**
   * Select the best provider for a given prompt
   */
  selectProvider(
    prompt: string,
    availableProviders: LLMProvider[],
    options?: GenerationOptions
  ): LLMProvider;
}

export type PromptType =
  | 'complex_reasoning'
  | 'quick_classification'
  | 'creative_writing'
  | 'code_generation'
  | 'summarization'
  | 'question_answering'
  | 'general';

export interface RouterConfig {
  providers: ProviderConfig[];
  strategy: 'cost' | 'performance' | 'quality' | 'custom';
  fallbackEnabled: boolean;
  timeout?: number;
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  enabled: boolean;
  priority: number;
  costPerToken?: number;
  maxRequestsPerMinute?: number;
}

export interface RouterMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatencyMs: number;
  providerUsage: Record<string, number>;
  costEstimate: number;
}
