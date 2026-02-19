/**
 * Chatbot Service
 * Processes user messages, detects intents, and creates jobs via Gateway API
 */

import type {
  CreateJobRequest,
  CreateJobResponse,
  GetJobStatusResponse,
} from '../types/api.types';
import type { JobAction, Message, Platform } from '../types/models';

import { apiClient } from './api/axios.config';
import { intentDetectionService } from './intent-detection.service';
import type { Intent } from './intent-detection.service';

export interface ChatResponse {
  type: 'text' | 'job_created' | 'error';
  message: string;
  jobId?: string;
  intent?: Intent;
}

export class ChatbotService {
  /**
   * Process a user message and return appropriate response
   */
  async processMessage(message: string): Promise<ChatResponse> {
    try {
      // Detect intent from message
      const intent = intentDetectionService.detectIntent(message);

      // Handle different intent types
      if (intent.type === 'greeting' || intent.type === 'help') {
        return {
          type: 'text',
          message: intentDetectionService.getResponseTemplate(intent),
          intent,
        };
      }

      if (intent.type === 'unknown') {
        return {
          type: 'text',
          message: intentDetectionService.getResponseTemplate(intent),
          intent,
        };
      }

      // For job-based intents, create a job
      const job = await this.createAgentJob(intent);

      return {
        type: 'job_created',
        message: intentDetectionService.getResponseTemplate(intent),
        jobId: job.id,
        intent,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to process message';

      return {
        type: 'error',
        message: `Sorry, I encountered an error: ${errorMessage}`,
      };
    }
  }

  /**
   * Create a job via Gateway API
   */
  private async createAgentJob(intent: Intent): Promise<CreateJobResponse> {
    const jobRequest: CreateJobRequest = {
      action: intent.type as JobAction,
      platform: intent.platform || 'mock',
      payload: this.buildJobPayload(intent),
    };

    return apiClient.post<CreateJobResponse>('/jobs', jobRequest);
  }

  /**
   * Build job payload based on intent
   */
  private buildJobPayload(intent: Intent): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    switch (intent.type) {
      case 'search_restaurant':
        payload.query = intent.query || '';
        if (intent.location) {
          payload.location = intent.location;
        }
        payload.limit = 20;
        break;

      case 'search_dish':
        payload.query = intent.query || '';
        payload.limit = 20;
        break;

      case 'get_restaurant_details':
        payload.restaurantId = intent.metadata?.restaurantId;
        break;

      case 'get_menu':
        payload.restaurantId = intent.metadata?.restaurantId;
        break;

      case 'track_order':
        payload.orderId = intent.metadata?.orderId;
        break;

      case 'get_order_history':
        payload.page = 1;
        payload.limit = 10;
        break;

      default:
        break;
    }

    return payload;
  }

  /**
   * Get job status
   */
  async getJobStatus<T = unknown>(
    jobId: string
  ): Promise<GetJobStatusResponse<T>> {
    return apiClient.get<GetJobStatusResponse<T>>(`/jobs/${jobId}`);
  }

  /**
   * Create a chat message from text
   */
  createTextMessage(content: string, sender: 'user' | 'bot'): Message {
    return {
      id: this.generateMessageId(),
      sender,
      content,
      timestamp: new Date(),
      type: 'text',
    };
  }

  /**
   * Create a status message for job processing
   */
  createStatusMessage(
    jobId: string,
    status: string,
    progress?: number
  ): Message {
    return {
      id: this.generateMessageId(),
      sender: 'bot',
      content: `Job ${status}`,
      timestamp: new Date(),
      type: 'status',
      metadata: {
        jobId,
        progress,
      },
    };
  }

  /**
   * Create an error message
   */
  createErrorMessage(error: string): Message {
    return {
      id: this.generateMessageId(),
      sender: 'bot',
      content: `Error: ${error}`,
      timestamp: new Date(),
      type: 'error',
      metadata: {
        error: {
          code: 'PROCESSING_ERROR',
          message: error,
        },
      },
    };
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

export const chatbotService = new ChatbotService();
