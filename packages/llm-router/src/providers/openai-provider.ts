/**
 * OpenAI (GPT) LLM Provider
 */

import OpenAI from 'openai';
import type {
  LLMProvider,
  GenerationOptions,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
} from '../types.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly models = [
    'gpt-4-turbo-2024-04-09',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-4o',
    'gpt-4o-mini',
  ];

  private client: OpenAI;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel?: string) {
    this.client = new OpenAI({ apiKey });
    this.defaultModel = defaultModel ?? 'gpt-4-turbo';
  }

  async generateCompletion(
    prompt: string,
    options?: GenerationOptions
  ): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      const messages = this.buildMessages(prompt, options);

      const response = await this.client.chat.completions.create({
        model: options?.model ?? this.defaultModel,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 1.0,
        top_p: options?.topP,
        stop: options?.stopSequences,
      });

      const latencyMs = Date.now() - startTime;
      const choice = response.choices[0];

      if (!choice) {
        throw new OpenAIProviderError('No completion choice returned');
      }

      return {
        text: choice.message.content ?? '',
        model: response.model,
        provider: this.name,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        latencyMs,
      };
    } catch (error) {
      throw new OpenAIProviderError(
        `OpenAI completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  async *generateStream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncIterableIterator<StreamChunk> {
    try {
      const messages = this.buildMessages(prompt, options);

      const stream = await this.client.chat.completions.create({
        model: options?.model ?? this.defaultModel,
        messages,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 1.0,
        top_p: options?.topP,
        stop: options?.stopSequences,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta?.content) {
          yield {
            text: delta.content,
            isComplete: false,
          };
        }

        if (finishReason) {
          yield {
            text: '',
            isComplete: true,
            finishReason: this.mapFinishReason(finishReason),
          };
        }
      }
    } catch (error) {
      throw new OpenAIProviderError(
        `OpenAI streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      await this.client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      });

      const latencyMs = Date.now() - startTime;

      return {
        provider: this.name,
        status: latencyMs < 2000 ? 'healthy' : 'degraded',
        latencyMs,
        lastChecked: new Date().toISOString(),
        details: 'OpenAI API is responding',
      };
    } catch (error) {
      return {
        provider: this.name,
        status: 'unhealthy',
        latencyMs: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details:
          error instanceof Error ? error.message : 'Health check failed',
      };
    }
  }

  private buildMessages(
    prompt: string,
    options?: GenerationOptions
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      });
    }

    if (options?.conversationHistory) {
      for (const msg of options.conversationHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  private mapFinishReason(
    reason: string | null
  ): 'complete' | 'length' | 'stop' | 'error' {
    switch (reason) {
      case 'stop':
        return 'complete';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'stop';
      default:
        return 'error';
    }
  }
}

export class OpenAIProviderError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'OpenAIProviderError';
    this.context = context;
  }
}
