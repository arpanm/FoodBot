import type { SendMessageResponse, JobStatusResponse, ChatHistoryResponse } from '../types/api.types';

import { apiClient } from './api/axios.config';

class ChatService {
  async sendMessage(message: string): Promise<SendMessageResponse> {
    return apiClient.post('/chat', { message });
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    return apiClient.get(`/jobs/${jobId}/status`);
  }

  async getMessageHistory(sessionId: string): Promise<ChatHistoryResponse> {
    return apiClient.get(`/chat/history/${sessionId}`);
  }
}

export const chatService = new ChatService();
