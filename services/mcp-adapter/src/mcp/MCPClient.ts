/**
 * MCP Protocol Client - Base implementation for Model Context Protocol
 * Supports JSON-RPC 2.0 message format for tool calling
 */

import type { ProviderName } from '../types/common.types.js';
import type {
  Restaurant,
  Menu,
  OrderRequest,
  OrderResponse,
} from '../types/provider.types.js';

export interface MCPMessage {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id?: string | number;
}

export interface MCPResponse<T = unknown> {
  jsonrpc: '2.0';
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
  id: string | number;
}

export interface MCPClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  provider: ProviderName;
}

export class MCPClient {
  protected readonly baseUrl: string;
  protected readonly apiKey?: string;
  protected readonly timeout: number;
  protected readonly maxRetries: number;
  protected readonly provider: ProviderName;
  private requestIdCounter = 0;

  constructor(config: MCPClientConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 5000;
    this.maxRetries = config.maxRetries ?? 3;
    this.provider = config.provider;
  }

  /**
   * Make a JSON-RPC 2.0 call to the MCP server
   */
  protected async call<T>(
    method: string,
    params: Record<string, unknown>
  ): Promise<T> {
    const requestId = this.generateRequestId();
    const message: MCPMessage = {
      jsonrpc: '2.0',
      method,
      params,
      id: requestId,
    };

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.sendRequest<T>(message);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries - 1) {
          const backoffMs = this.calculateBackoff(attempt);
          await this.sleep(backoffMs);
        }
      }
    }

    throw new MCPRequestError(
      `MCP request failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      { method, provider: this.provider, originalError: lastError }
    );
  }

  /**
   * Send HTTP request to MCP server
   */
  private async sendRequest<T>(message: MCPMessage): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      };

      if (this.apiKey) {
        headers.Authorization = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new MCPRequestError(
          `MCP server returned error: ${response.status} ${response.statusText}`,
          {
            statusCode: response.status,
            errorBody: errorText,
            provider: this.provider,
          }
        );
      }

      const mcpResponse = (await response.json()) as MCPResponse<T>;

      if (mcpResponse.error) {
        throw new MCPProtocolError(
          `MCP protocol error: ${mcpResponse.error.message}`,
          {
            code: mcpResponse.error.code,
            data: mcpResponse.error.data,
            provider: this.provider,
          }
        );
      }

      if (mcpResponse.result === undefined) {
        throw new MCPProtocolError('MCP response missing result field', {
          provider: this.provider,
        });
      }

      return mcpResponse.result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof MCPRequestError || error instanceof MCPProtocolError) {
        throw error;
      }

      if ((error as Error).name === 'AbortError') {
        throw new MCPTimeoutError(
          `MCP request timeout after ${this.timeout}ms`,
          { provider: this.provider, method: message.method }
        );
      }

      throw new MCPRequestError(
        `MCP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: this.provider, originalError: error }
      );
    }
  }

  /**
   * Search restaurants using MCP tool
   */
  async searchRestaurants(params: {
    query: string;
    location?: { lat: number; lng: number };
    limit?: number;
  }): Promise<Restaurant[]> {
    return this.call<Restaurant[]>('tools/searchRestaurants', params);
  }

  /**
   * Get restaurant menu using MCP tool
   */
  async getMenu(restaurantId: string): Promise<Menu> {
    return this.call<Menu>('tools/getMenu', { restaurantId });
  }

  /**
   * Place order using MCP tool
   */
  async placeOrder(order: OrderRequest): Promise<OrderResponse> {
    return this.call<OrderResponse>('tools/placeOrder', order as unknown as Record<string, unknown>);
  }

  /**
   * Get restaurant details using MCP tool
   */
  async getRestaurantDetails(restaurantId: string): Promise<Restaurant> {
    return this.call<Restaurant>('tools/getRestaurantDetails', {
      restaurantId,
    });
  }

  /**
   * Check availability using MCP tool
   */
  async checkAvailability(restaurantId: string): Promise<{
    available: boolean;
    estimatedDeliveryMinutes: number;
  }> {
    return this.call('tools/checkAvailability', { restaurantId });
  }

  /**
   * Health check for MCP server
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    try {
      return await this.call<{ status: string; version: string }>(
        'tools/healthCheck',
        {}
      );
    } catch (error) {
      throw new MCPHealthCheckError(
        `MCP health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider: this.provider, originalError: error }
      );
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${this.provider}-${Date.now()}-${++this.requestIdCounter}`;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const baseDelay = 100;
    const maxDelay = 5000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    return delay + Math.random() * 100;
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export class MCPRequestError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MCPRequestError';
    this.context = context;
  }
}

export class MCPProtocolError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MCPProtocolError';
    this.context = context;
  }
}

export class MCPTimeoutError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MCPTimeoutError';
    this.context = context;
  }
}

export class MCPHealthCheckError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'MCPHealthCheckError';
    this.context = context;
  }
}
