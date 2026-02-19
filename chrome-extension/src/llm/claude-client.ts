/**
 * Claude AI Client for FoodBot Chrome Extension
 * Handles communication with Claude API for intelligent decision-making
 */

import {
  LLMResponse,
  BrowserAction,
  PageAnalysis,
  ExtensionError,
} from '../shared/types';
import { LLM_CONFIG, TIMEOUTS, ERROR_CODES } from '../shared/constants';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeRequest {
  model: string;
  max_tokens: number;
  temperature: number;
  system: string;
  messages: ClaudeMessage[];
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
}

export class ClaudeClient {
  private apiKey: string | null = null;
  private baseUrl: string = 'https://api.anthropic.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      // Try to load API key from storage
      const result = await chrome.storage.local.get('claude_api_key');
      if (result.claude_api_key) {
        this.apiKey = result.claude_api_key as string;
      } else {
        throw new ExtensionError(
          'Claude API key not configured',
          ERROR_CODES.AUTHENTICATION_ERROR
        );
      }
    }
  }

  async analyzePageAndDecide(
    pageAnalysis: PageAnalysis,
    userIntent: string,
    conversationHistory: ClaudeMessage[] = []
  ): Promise<LLMResponse> {
    await this.initialize();

    const prompt = this.buildPrompt(pageAnalysis, userIntent);

    const messages: ClaudeMessage[] = [
      ...conversationHistory,
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.callClaude(messages);
      return this.parseResponse(response);
    } catch (error) {
      throw new ExtensionError(
        'Failed to get AI response',
        ERROR_CODES.LLM_ERROR,
        { error }
      );
    }
  }

  private buildPrompt(pageAnalysis: PageAnalysis, userIntent: string): string {
    const pageInfo = {
      url: pageAnalysis.url,
      platform: pageAnalysis.platform,
      pageType: pageAnalysis.pageType,
      restaurantsCount: pageAnalysis.restaurants?.length || 0,
      menuItemsCount: pageAnalysis.menuItems?.length || 0,
      cartItemsCount: pageAnalysis.cartItems?.length || 0,
    };

    let prompt = `User Intent: ${userIntent}\n\n`;
    prompt += `Current Page Information:\n${JSON.stringify(pageInfo, null, 2)}\n\n`;

    if (pageAnalysis.restaurants && pageAnalysis.restaurants.length > 0) {
      prompt += `Available Restaurants:\n`;
      pageAnalysis.restaurants.slice(0, 10).forEach((restaurant) => {
        prompt += `- ${restaurant.name} (${restaurant.cuisine.join(', ')}) - Rating: ${restaurant.rating}, Delivery: ${restaurant.deliveryTime}\n`;
      });
      prompt += '\n';
    }

    if (pageAnalysis.menuItems && pageAnalysis.menuItems.length > 0) {
      prompt += `Available Menu Items:\n`;
      pageAnalysis.menuItems.slice(0, 20).forEach((item) => {
        prompt += `- ${item.name} - ₹${item.price} ${item.isVeg ? '🌱' : '🍖'}\n`;
      });
      prompt += '\n';
    }

    if (pageAnalysis.cartItems && pageAnalysis.cartItems.length > 0) {
      prompt += `Current Cart:\n`;
      pageAnalysis.cartItems.forEach((item) => {
        prompt += `- ${item.name} x${item.quantity} - ₹${item.price}\n`;
      });
      prompt += '\n';
    }

    prompt += `Based on the user's intent and the current page state, what should be the next action?\n\n`;
    prompt += `Respond in JSON format with the following structure:\n`;
    prompt += `{\n`;
    prompt += `  "action": "SEARCH_RESTAURANT" | "SELECT_RESTAURANT" | "BROWSE_MENU" | "ADD_TO_CART" | "CHECKOUT" | "COMPLETE" | "ERROR",\n`;
    prompt += `  "target": "specific element to interact with (e.g., restaurant name, menu item name)",\n`;
    prompt += `  "reasoning": "brief explanation of why this action",\n`;
    prompt += `  "confidence": 0.0 to 1.0\n`;
    prompt += `}\n`;

    return prompt;
  }

  private async callClaude(messages: ClaudeMessage[]): Promise<ClaudeResponse> {
    if (!this.apiKey) {
      throw new ExtensionError(
        'API key not initialized',
        ERROR_CODES.AUTHENTICATION_ERROR
      );
    }

    const request: ClaudeRequest = {
      model: LLM_CONFIG.MODEL,
      max_tokens: LLM_CONFIG.MAX_TOKENS,
      temperature: LLM_CONFIG.TEMPERATURE,
      system: LLM_CONFIG.SYSTEM_PROMPT,
      messages,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.LLM_REQUEST);

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new ExtensionError(
          'Claude API request timeout',
          ERROR_CODES.TIMEOUT_ERROR
        );
      }

      throw error;
    }
  }

  private parseResponse(response: ClaudeResponse): LLMResponse {
    try {
      const content = response.content[0]?.text || '';

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        action: parsed.action as BrowserAction,
        reasoning: parsed.reasoning,
        confidence: parsed.confidence,
      };
    } catch (error) {
      throw new ExtensionError(
        'Failed to parse Claude response',
        ERROR_CODES.INVALID_RESPONSE,
        { error, response }
      );
    }
  }

  async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    await chrome.storage.local.set({ claude_api_key: apiKey });
  }
}

// Export singleton instance
export const claudeClient = new ClaudeClient();
