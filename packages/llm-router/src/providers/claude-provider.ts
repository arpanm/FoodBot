/**
 * Claude (Anthropic) LLM Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  GenerationOptions,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
  ConversationMessage,
} from '../types.js';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  readonly models = [
    'claude-opus-4-6',
    'claude-sonnet-4-5',
    'claude-sonnet-4',
    'claude-haiku-4',
  ];

  private client: Anthropic;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel?: string) {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = defaultModel ?? 'claude-sonnet-4-5';
  }

  async generateCompletion(
    prompt: string,
    options?: GenerationOptions
  ): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      const messages = this.buildMessages(prompt, options);

      const response = await this.client.messages.create({
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 1.0,
        top_p: options?.topP,
        stop_sequences: options?.stopSequences,
        system: options?.systemPrompt,
        messages,
      });

      const latencyMs = Date.now() - startTime;

      return {
        text: this.extractText(response),
        model: response.model,
        provider: this.name,
        finishReason: this.mapStopReason(response.stop_reason),
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens:
            response.usage.input_tokens + response.usage.output_tokens,
        },
        latencyMs,
      };
    } catch (error) {
      throw new ClaudeProviderError(
        `Claude completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      const stream = await this.client.messages.create({
        model: options?.model ?? this.defaultModel,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 1.0,
        top_p: options?.topP,
        stop_sequences: options?.stopSequences,
        system: options?.systemPrompt,
        messages,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            yield {
              text: event.delta.text,
              isComplete: false,
            };
          }
        } else if (event.type === 'message_stop') {
          yield {
            text: '',
            isComplete: true,
            finishReason: 'complete',
          };
        }
      }
    } catch (error) {
      throw new ClaudeProviderError(
        `Claude streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      // Make a minimal request to check health
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

      const latencyMs = Date.now() - startTime;

      return {
        provider: this.name,
        status: latencyMs < 2000 ? 'healthy' : 'degraded',
        latencyMs,
        lastChecked: new Date().toISOString(),
        details: 'Claude API is responding',
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
  ): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    if (options?.conversationHistory) {
      for (const msg of options.conversationHistory) {
        if (msg.role !== 'system') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  private extractText(response: Anthropic.Message): string {
    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.type === 'text' ? textContent.text : '';
  }

  private mapStopReason(
    stopReason: string | null
  ): 'complete' | 'length' | 'stop' | 'error' {
    switch (stopReason) {
      case 'end_turn':
        return 'complete';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'error';
    }
  }
}

export class ClaudeProviderError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ClaudeProviderError';
    this.context = context;
  }
}
