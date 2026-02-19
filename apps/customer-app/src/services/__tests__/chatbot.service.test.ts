/**
 * Chatbot Service Unit Tests
 */

import { chatbotService } from '../chatbot.service';
import { intentDetectionService } from '../intent-detection.service';

// Mock the API client
jest.mock('../api/axios.config', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { apiClient } from '../api/axios.config';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ChatbotService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should handle greeting intent', async () => {
      const response = await chatbotService.processMessage('Hello');

      expect(response.type).toBe('text');
      expect(response.message).toContain('FoodBot assistant');
      expect(response.jobId).toBeUndefined();
    });

    it('should handle help intent', async () => {
      const response = await chatbotService.processMessage('help me');

      expect(response.type).toBe('text');
      expect(response.message).toContain('Search for restaurants');
      expect(response.jobId).toBeUndefined();
    });

    it('should create job for restaurant search', async () => {
      mockApiClient.post.mockResolvedValue({
        id: 'job-123',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });

      const response = await chatbotService.processMessage('Find pizza');

      expect(response.type).toBe('job_created');
      expect(response.jobId).toBe('job-123');
      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_restaurant',
        platform: 'mock',
        payload: expect.objectContaining({
          query: 'pizza',
        }),
      });
    });

    it('should include location in job payload', async () => {
      mockApiClient.post.mockResolvedValue({
        id: 'job-456',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });

      await chatbotService.processMessage('Find restaurants near Bangalore');

      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_restaurant',
        platform: 'mock',
        payload: expect.objectContaining({
          location: 'Bangalore',
        }),
      });
    });

    it('should use specified platform', async () => {
      mockApiClient.post.mockResolvedValue({
        id: 'job-789',
        action: 'search_restaurant',
        platform: 'swiggy',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });

      await chatbotService.processMessage('Order from Swiggy');

      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_restaurant',
        platform: 'swiggy',
        payload: expect.any(Object),
      });
    });

    it('should handle API errors', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const response = await chatbotService.processMessage('Find pizza');

      expect(response.type).toBe('error');
      expect(response.message).toContain('Network error');
    });

    it('should handle unknown intent', async () => {
      const response = await chatbotService.processMessage('xyz123abc');

      expect(response.type).toBe('text');
      expect(response.message).toContain("didn't understand");
    });
  });

  describe('getJobStatus', () => {
    it('should fetch job status', async () => {
      mockApiClient.get.mockResolvedValue({
        id: 'job-123',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'PROCESSING',
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const status = await chatbotService.getJobStatus('job-123');

      expect(status.status).toBe('PROCESSING');
      expect(status.progress).toBe(50);
      expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/job-123');
    });

    it('should handle completed job', async () => {
      mockApiClient.get.mockResolvedValue({
        id: 'job-456',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'COMPLETED',
        progress: 100,
        result: { restaurants: [], total: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });

      const status = await chatbotService.getJobStatus('job-456');

      expect(status.status).toBe('COMPLETED');
      expect(status.result).toBeDefined();
    });

    it('should handle failed job', async () => {
      mockApiClient.get.mockResolvedValue({
        id: 'job-789',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'FAILED',
        error: 'Service unavailable',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const status = await chatbotService.getJobStatus('job-789');

      expect(status.status).toBe('FAILED');
      expect(status.error).toBe('Service unavailable');
    });
  });

  describe('Message Creation', () => {
    it('should create text message', () => {
      const message = chatbotService.createTextMessage('Hello', 'user');

      expect(message.sender).toBe('user');
      expect(message.content).toBe('Hello');
      expect(message.type).toBe('text');
      expect(message.id).toBeDefined();
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should create status message', () => {
      const message = chatbotService.createStatusMessage('job-123', 'PROCESSING', 50);

      expect(message.sender).toBe('bot');
      expect(message.type).toBe('status');
      expect(message.metadata?.jobId).toBe('job-123');
      expect(message.metadata?.progress).toBe(50);
    });

    it('should create error message', () => {
      const message = chatbotService.createErrorMessage('Network error');

      expect(message.sender).toBe('bot');
      expect(message.type).toBe('error');
      expect(message.content).toContain('Network error');
      expect(message.metadata?.error).toBeDefined();
    });

    it('should generate unique message IDs', () => {
      const msg1 = chatbotService.createTextMessage('Hello', 'user');
      const msg2 = chatbotService.createTextMessage('Hi', 'bot');

      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('Job Payload Building', () => {
    it('should build search restaurant payload', async () => {
      mockApiClient.post.mockResolvedValue({
        id: 'job-123',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });

      await chatbotService.processMessage('Find pizza restaurants');

      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_restaurant',
        platform: 'mock',
        payload: {
          query: 'pizza restaurants',
          limit: 20,
        },
      });
    });

    it('should build search dish payload', async () => {
      mockApiClient.post.mockResolvedValue({
        id: 'job-456',
        action: 'search_dish',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      });

      await chatbotService.processMessage('Show me vegetarian dishes');

      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_dish',
        platform: 'mock',
        payload: {
          query: expect.stringContaining('vegetarian'),
          limit: 20,
        },
      });
    });
  });
});
