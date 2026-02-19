/**
 * LLM Router - Intelligent routing across multiple LLM providers
 * Supports Claude (Anthropic), GPT (OpenAI), and Gemini (Google)
 */

import type {
  LLMProvider,
  GenerationOptions,
  CompletionResponse,
  StreamChunk,
  RoutingStrategy,
  RouterConfig,
  RouterMetrics,
  PromptType,
} from './types.js';

export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private enabledProviders: Set<string> = new Set();
  private strategy: RoutingStrategy;
  private fallbackEnabled: boolean;
  private timeout: number;
  private metrics: RouterMetrics;

  constructor(config: RouterConfig, strategy?: RoutingStrategy) {
    this.fallbackEnabled = config.fallbackEnabled;
    this.timeout = config.timeout ?? 30000;
    this.strategy = strategy ?? this.getDefaultStrategy(config.strategy);
    this.metrics = this.initializeMetrics();
  }

  /**
   * Register an LLM provider
   */
  registerProvider(provider: LLMProvider, enabled = true): void {
    this.providers.set(provider.name, provider);
    if (enabled) {
      this.enabledProviders.add(provider.name);
    }
  }

  /**
   * Enable a provider
   */
  enableProvider(name: string): void {
    if (this.providers.has(name)) {
      this.enabledProviders.add(name);
    }
  }

  /**
   * Disable a provider
   */
  disableProvider(name: string): void {
    this.enabledProviders.delete(name);
  }

  /**
   * Route a prompt to the best provider
   */
  async route(
    prompt: string,
    options?: GenerationOptions
  ): Promise<CompletionResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;

    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new NoProvidersAvailableError(
        'No LLM providers are available or enabled'
      );
    }

    const selectedProvider = this.strategy.selectProvider(
      prompt,
      availableProviders,
      options
    );

    try {
      const response = await this.executeWithTimeout(
        selectedProvider.generateCompletion(prompt, options),
        this.timeout
      );

      response.latencyMs = Date.now() - startTime;
      this.metrics.successfulRequests++;
      this.updateProviderUsage(selectedProvider.name);
      this.updateAverageLatency(response.latencyMs);

      return response;
    } catch (error) {
      if (this.fallbackEnabled && availableProviders.length > 1) {
        return this.routeWithFallback(
          prompt,
          options,
          selectedProvider.name,
          startTime
        );
      }

      this.metrics.failedRequests++;
      throw new RoutingError(
        `LLM routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: selectedProvider.name, originalError: error }
      );
    }
  }

  /**
   * Route with streaming response
   */
  async *routeStream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncIterableIterator<StreamChunk> {
    this.metrics.totalRequests++;

    const availableProviders = this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw new NoProvidersAvailableError(
        'No LLM providers are available or enabled'
      );
    }

    const selectedProvider = this.strategy.selectProvider(
      prompt,
      availableProviders,
      options
    );

    try {
      const stream = selectedProvider.generateStream(prompt, options);
      this.updateProviderUsage(selectedProvider.name);

      for await (const chunk of stream) {
        yield chunk;
      }

      this.metrics.successfulRequests++;
    } catch (error) {
      this.metrics.failedRequests++;
      throw new RoutingError(
        `LLM streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: selectedProvider.name, originalError: error }
      );
    }
  }

  /**
   * Get router metrics
   */
  getMetrics(): RouterMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }

  /**
   * Health check for all providers
   */
  async healthCheckAll(): Promise<
    Record<string, { healthy: boolean; latencyMs: number; details?: string }>
  > {
    const results: Record<
      string,
      { healthy: boolean; latencyMs: number; details?: string }
    > = {};

    const checks = Array.from(this.providers.entries()).map(
      async ([name, provider]) => {
        try {
          const health = await provider.healthCheck();
          results[name] = {
            healthy: health.status === 'healthy',
            latencyMs: health.latencyMs,
            details: health.details,
          };
        } catch (error) {
          results[name] = {
            healthy: false,
            latencyMs: 0,
            details:
              error instanceof Error ? error.message : 'Health check failed',
          };
        }
      }
    );

    await Promise.all(checks);
    return results;
  }

  /**
   * Classify prompt type for intelligent routing
   */
  classifyPrompt(prompt: string): PromptType {
    const lowerPrompt = prompt.toLowerCase();

    // Complex reasoning indicators
    if (
      /analyze|reasoning|logic|deduce|infer|complex/i.test(prompt) ||
      prompt.length > 1000
    ) {
      return 'complex_reasoning';
    }

    // Classification indicators
    if (
      /classify|categorize|label|sentiment|category/i.test(prompt) &&
      prompt.length < 300
    ) {
      return 'quick_classification';
    }

    // Creative writing indicators
    if (/write|create|story|poem|creative|imagine/i.test(prompt)) {
      return 'creative_writing';
    }

    // Code generation indicators
    if (
      /code|function|implement|debug|fix|programming|algorithm/i.test(prompt)
    ) {
      return 'code_generation';
    }

    // Summarization indicators
    if (/summarize|summary|tldr|key points|brief/i.test(prompt)) {
      return 'summarization';
    }

    // Question answering
    if (/what|when|where|who|why|how|explain/i.test(lowerPrompt)) {
      return 'question_answering';
    }

    return 'general';
  }

  private getAvailableProviders(): LLMProvider[] {
    return Array.from(this.providers.entries())
      .filter(([name]) => this.enabledProviders.has(name))
      .map(([, provider]) => provider);
  }

  private async routeWithFallback(
    prompt: string,
    options: GenerationOptions | undefined,
    excludeProvider: string,
    startTime: number
  ): Promise<CompletionResponse> {
    const fallbackProviders = this.getAvailableProviders().filter(
      (p) => p.name !== excludeProvider
    );

    for (const provider of fallbackProviders) {
      try {
        const response = await this.executeWithTimeout(
          provider.generateCompletion(prompt, options),
          this.timeout
        );

        response.latencyMs = Date.now() - startTime;
        this.metrics.successfulRequests++;
        this.updateProviderUsage(provider.name);
        this.updateAverageLatency(response.latencyMs);

        return response;
      } catch (error) {
        continue;
      }
    }

    this.metrics.failedRequests++;
    throw new RoutingError('All LLM providers failed', {
      excludedProvider: excludeProvider,
    });
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    );

    return Promise.race([promise, timeoutPromise]);
  }

  private getDefaultStrategy(type: string): RoutingStrategy {
    switch (type) {
      case 'cost':
        return new CostOptimizedStrategy();
      case 'performance':
        return new PerformanceStrategy();
      case 'quality':
        return new QualityStrategy();
      default:
        return new BalancedStrategy();
    }
  }

  private initializeMetrics(): RouterMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatencyMs: 0,
      providerUsage: {},
      costEstimate: 0,
    };
  }

  private updateProviderUsage(provider: string): void {
    this.metrics.providerUsage[provider] =
      (this.metrics.providerUsage[provider] ?? 0) + 1;
  }

  private updateAverageLatency(latencyMs: number): void {
    const totalRequests = this.metrics.totalRequests;
    const currentAvg = this.metrics.averageLatencyMs;
    this.metrics.averageLatencyMs =
      (currentAvg * (totalRequests - 1) + latencyMs) / totalRequests;
  }
}

// Default routing strategies

class CostOptimizedStrategy implements RoutingStrategy {
  selectProvider(
    prompt: string,
    availableProviders: LLMProvider[]
  ): LLMProvider {
    // Prefer cheaper models for simple tasks
    const promptLength = prompt.length;

    if (promptLength < 500) {
      // Use Gemini for quick, cheap queries
      return (
        availableProviders.find((p) => p.name === 'gemini') ??
        availableProviders[0]!
      );
    }

    // Use GPT for medium complexity
    return (
      availableProviders.find((p) => p.name === 'openai') ??
      availableProviders[0]!
    );
  }
}

class PerformanceStrategy implements RoutingStrategy {
  selectProvider(
    prompt: string,
    availableProviders: LLMProvider[]
  ): LLMProvider {
    // Prefer fastest models
    return (
      availableProviders.find((p) => p.name === 'gemini') ??
      availableProviders[0]!
    );
  }
}

class QualityStrategy implements RoutingStrategy {
  selectProvider(
    prompt: string,
    availableProviders: LLMProvider[]
  ): LLMProvider {
    // Prefer Claude for complex reasoning
    if (/analyze|reasoning|complex/i.test(prompt)) {
      return (
        availableProviders.find((p) => p.name === 'claude') ??
        availableProviders[0]!
      );
    }

    // Use GPT for code
    if (/code|function|implement/i.test(prompt)) {
      return (
        availableProviders.find((p) => p.name === 'openai') ??
        availableProviders[0]!
      );
    }

    return availableProviders[0]!;
  }
}

class BalancedStrategy implements RoutingStrategy {
  selectProvider(
    prompt: string,
    availableProviders: LLMProvider[]
  ): LLMProvider {
    // Distribute load evenly
    const randomIndex = Math.floor(Math.random() * availableProviders.length);
    return availableProviders[randomIndex]!;
  }
}

export class RoutingError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'RoutingError';
    this.context = context;
  }
}

export class NoProvidersAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoProvidersAvailableError';
  }
}
