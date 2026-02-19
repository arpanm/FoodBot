/**
 * Gemini (Google) LLM Provider
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  LLMProvider,
  GenerationOptions,
  CompletionResponse,
  StreamChunk,
  ProviderHealth,
} from '../types.js';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly models = [
    'gemini-2.0-flash-exp',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
  ];

  private client: GoogleGenerativeAI;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.defaultModel = defaultModel ?? 'gemini-1.5-flash';
  }

  async generateCompletion(
    prompt: string,
    options?: GenerationOptions
  ): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: options?.model ?? this.defaultModel,
      });

      const generationConfig = {
        temperature: options?.temperature ?? 1.0,
        topP: options?.topP,
        maxOutputTokens: options?.maxTokens ?? 4096,
        stopSequences: options?.stopSequences,
      };

      const chatHistory = this.buildChatHistory(options);
      const chat = model.startChat({
        history: chatHistory,
        generationConfig,
      });

      const result = await chat.sendMessage(prompt);
      const response = result.response;

      const latencyMs = Date.now() - startTime;

      return {
        text: response.text(),
        model: this.defaultModel,
        provider: this.name,
        finishReason: this.mapFinishReason(
          response.candidates?.[0]?.finishReason
        ),
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount ?? 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          totalTokens: response.usageMetadata?.totalTokenCount ?? 0,
        },
        latencyMs,
      };
    } catch (error) {
      throw new GeminiProviderError(
        `Gemini completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  async *generateStream(
    prompt: string,
    options?: GenerationOptions
  ): AsyncIterableIterator<StreamChunk> {
    try {
      const model = this.client.getGenerativeModel({
        model: options?.model ?? this.defaultModel,
      });

      const generationConfig = {
        temperature: options?.temperature ?? 1.0,
        topP: options?.topP,
        maxOutputTokens: options?.maxTokens ?? 4096,
        stopSequences: options?.stopSequences,
      };

      const chatHistory = this.buildChatHistory(options);
      const chat = model.startChat({
        history: chatHistory,
        generationConfig,
      });

      const result = await chat.sendMessageStream(prompt);

      for await (const chunk of result.stream) {
        const text = chunk.text();

        if (text) {
          yield {
            text,
            isComplete: false,
          };
        }
      }

      const finalResponse = await result.response;
      yield {
        text: '',
        isComplete: true,
        finishReason: this.mapFinishReason(
          finalResponse.candidates?.[0]?.finishReason
        ),
      };
    } catch (error) {
      throw new GeminiProviderError(
        `Gemini streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error }
      );
    }
  }

  async healthCheck(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      const model = this.client.getGenerativeModel({
        model: this.defaultModel,
      });

      const result = await model.generateContent('Hi');
      result.response.text();

      const latencyMs = Date.now() - startTime;

      return {
        provider: this.name,
        status: latencyMs < 2000 ? 'healthy' : 'degraded',
        latencyMs,
        lastChecked: new Date().toISOString(),
        details: 'Gemini API is responding',
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

  private buildChatHistory(options?: GenerationOptions): Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }> {
    const history: Array<{
      role: 'user' | 'model';
      parts: Array<{ text: string }>;
    }> = [];

    if (options?.conversationHistory) {
      for (const msg of options.conversationHistory) {
        if (msg.role === 'system') {
          continue;
        }

        history.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    return history;
  }

  private mapFinishReason(
    reason: string | undefined
  ): 'complete' | 'length' | 'stop' | 'error' {
    switch (reason) {
      case 'STOP':
        return 'complete';
      case 'MAX_TOKENS':
        return 'length';
      case 'SAFETY':
      case 'RECITATION':
        return 'stop';
      default:
        return 'error';
    }
  }
}

export class GeminiProviderError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'GeminiProviderError';
    this.context = context;
  }
}
