/**
 * Chatbot Integration Tests
 * Tests the complete workflow from user message to job creation and result display
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ChatInterface } from '../components/Chat/ChatInterface';
import { chatbotService } from '../services/chatbot.service';
import { intentDetectionService } from '../services/intent-detection.service';
import { renderWithProviders } from '../test/utils/renderWithProviders';
import type { CreateJobResponse, GetJobStatusResponse } from '../types/api.types';

// Mock the API client
jest.mock('../services/api/axios.config', () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

import { apiClient } from '../services/api/axios.config';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('Chatbot Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Intent Detection', () => {
    it('should detect greeting intent', () => {
      const intent = intentDetectionService.detectIntent('Hello');

      expect(intent.type).toBe('greeting');
      expect(intent.confidence).toBeGreaterThan(0.9);
    });

    it('should detect search restaurant intent', () => {
      const intent = intentDetectionService.detectIntent('Find pizza restaurants');

      expect(intent.type).toBe('search_restaurant');
      expect(intent.query).toBe('pizza restaurants');
      expect(intent.confidence).toBeGreaterThan(0.8);
    });

    it('should detect platform from message', () => {
      const intent = intentDetectionService.detectIntent(
        'Order biryani from Swiggy'
      );

      expect(intent.type).toBe('search_restaurant');
      expect(intent.platform).toBe('swiggy');
      expect(intent.query).toContain('biryani');
    });

    it('should extract location from message', () => {
      const intent = intentDetectionService.detectIntent(
        'Find restaurants near Koramangala'
      );

      expect(intent.type).toBe('search_restaurant');
      expect(intent.location).toBe('Koramangala');
    });

    it('should detect dish search intent', () => {
      const intent = intentDetectionService.detectIntent(
        'Show me vegetarian dishes'
      );

      expect(intent.type).toBe('search_dish');
      expect(intent.query).toContain('vegetarian');
    });

    it('should detect order tracking intent', () => {
      const intent = intentDetectionService.detectIntent('Track my order');

      expect(intent.type).toBe('track_order');
      expect(intent.confidence).toBeGreaterThan(0.85);
    });

    it('should detect unknown intent for gibberish', () => {
      const intent = intentDetectionService.detectIntent('xyz123abc');

      expect(intent.type).toBe('unknown');
      expect(intent.confidence).toBe(0.0);
    });
  });

  describe('Chatbot Service', () => {
    it('should process greeting without creating job', async () => {
      const response = await chatbotService.processMessage('Hello!');

      expect(response.type).toBe('text');
      expect(response.message).toContain('FoodBot assistant');
      expect(response.jobId).toBeUndefined();
    });

    it('should create job for restaurant search', async () => {
      const mockJobResponse: CreateJobResponse = {
        id: 'job-123',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      const response = await chatbotService.processMessage('Find pizza restaurants');

      expect(response.type).toBe('job_created');
      expect(response.jobId).toBe('job-123');
      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_restaurant',
        platform: 'mock',
        payload: expect.objectContaining({
          query: 'pizza restaurants',
          limit: 20,
        }),
      });
    });

    it('should create job with location payload', async () => {
      const mockJobResponse: CreateJobResponse = {
        id: 'job-456',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      await chatbotService.processMessage('Find restaurants near HSR Layout');

      expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
        action: 'search_restaurant',
        platform: 'mock',
        payload: expect.objectContaining({
          query: expect.any(String),
          location: 'HSR Layout',
          limit: 20,
        }),
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Network error'));

      const response = await chatbotService.processMessage('Find pizza');

      expect(response.type).toBe('error');
      expect(response.message).toContain('Network error');
    });

    it('should get job status', async () => {
      const mockStatusResponse: GetJobStatusResponse = {
        id: 'job-123',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'PROCESSING',
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue(mockStatusResponse);

      const status = await chatbotService.getJobStatus('job-123');

      expect(status.status).toBe('PROCESSING');
      expect(status.progress).toBe(50);
      expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/job-123');
    });
  });

  describe('ChatInterface Component Integration', () => {
    it('should display greeting response without job creation', async () => {
      const user = userEvent.setup();

      renderWithProviders(<ChatInterface />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Hello{enter}');

      await waitFor(() => {
        expect(screen.getByText(/FoodBot assistant/i)).toBeInTheDocument();
      });

      // Should not show progress tracker
      expect(screen.queryByTestId('progress-tracker')).not.toBeInTheDocument();
    });

    it('should create job and show progress tracker for restaurant search', async () => {
      const user = userEvent.setup();

      const mockJobResponse: CreateJobResponse = {
        id: 'job-789',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      const mockStatusResponse: GetJobStatusResponse = {
        id: 'job-789',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'PROCESSING',
        progress: 25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue(mockStatusResponse);

      renderWithProviders(<ChatInterface />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Find pizza restaurants{enter}');

      // Should show bot response
      await waitFor(() => {
        expect(screen.getByText(/Searching for/i)).toBeInTheDocument();
      });

      // Should create job
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith(
          '/jobs',
          expect.objectContaining({
            action: 'search_restaurant',
          })
        );
      });

      // Should start polling
      await waitFor(
        () => {
          expect(mockApiClient.get).toHaveBeenCalledWith('/jobs/job-789');
        },
        { timeout: 3000 }
      );
    });

    it('should display job results when completed', async () => {
      const user = userEvent.setup();

      const mockJobResponse: CreateJobResponse = {
        id: 'job-completed',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      const mockCompletedResponse: GetJobStatusResponse = {
        id: 'job-completed',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'COMPLETED',
        progress: 100,
        result: {
          restaurants: [
            {
              id: 'rest-1',
              name: 'Pizza Palace',
              cuisine: ['Italian'],
              rating: 4.5,
              deliveryTime: '30 mins',
            },
          ],
          total: 1,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue(mockCompletedResponse);

      renderWithProviders(<ChatInterface />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Find pizza{enter}');

      // Wait for job completion
      await waitFor(
        () => {
          expect(screen.getByText(/Here are your results/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should display results
      await waitFor(() => {
        expect(screen.getByTestId('restaurant-search-result')).toBeInTheDocument();
      });
    });

    it('should handle job failure gracefully', async () => {
      const user = userEvent.setup();

      const mockJobResponse: CreateJobResponse = {
        id: 'job-failed',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      const mockFailedResponse: GetJobStatusResponse = {
        id: 'job-failed',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'FAILED',
        error: 'Service unavailable',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue(mockFailedResponse);

      renderWithProviders(<ChatInterface />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Find pizza{enter}');

      // Wait for error message
      await waitFor(
        () => {
          expect(screen.getByText(/Service unavailable/i)).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('should disable input while processing', async () => {
      const user = userEvent.setup();

      const mockJobResponse: CreateJobResponse = {
        id: 'job-processing',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      const mockProcessingResponse: GetJobStatusResponse = {
        id: 'job-processing',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'PROCESSING',
        progress: 50,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockApiClient.get.mockResolvedValue(mockProcessingResponse);

      renderWithProviders(<ChatInterface />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'Find pizza{enter}');

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full workflow: message -> job -> results', async () => {
      const user = userEvent.setup();

      // Mock job creation
      const mockJobResponse: CreateJobResponse = {
        id: 'job-e2e',
        action: 'search_restaurant',
        platform: 'mock',
        status: 'QUEUED',
        createdAt: new Date().toISOString(),
      };

      mockApiClient.post.mockResolvedValue(mockJobResponse);

      // Mock progressive job status updates
      let callCount = 0;
      mockApiClient.get.mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          return Promise.resolve({
            id: 'job-e2e',
            action: 'search_restaurant',
            platform: 'mock',
            status: 'PROCESSING',
            progress: 30,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as GetJobStatusResponse);
        } else if (callCount === 2) {
          return Promise.resolve({
            id: 'job-e2e',
            action: 'search_restaurant',
            platform: 'mock',
            status: 'PROCESSING',
            progress: 70,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as GetJobStatusResponse);
        } else {
          return Promise.resolve({
            id: 'job-e2e',
            action: 'search_restaurant',
            platform: 'mock',
            status: 'COMPLETED',
            progress: 100,
            result: {
              restaurants: [
                {
                  id: 'rest-1',
                  name: 'Pizza Paradise',
                  cuisine: ['Italian', 'Fast Food'],
                  rating: 4.7,
                  deliveryTime: '25-30 mins',
                  priceRange: 2,
                },
                {
                  id: 'rest-2',
                  name: 'Burger Hub',
                  cuisine: ['American'],
                  rating: 4.3,
                  deliveryTime: '20-25 mins',
                  priceRange: 1,
                },
              ],
              total: 2,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          } as GetJobStatusResponse);
        }
      });

      renderWithProviders(<ChatInterface />);

      // Step 1: User sends message
      const input = screen.getByRole('textbox');
      await user.type(input, 'Find pizza restaurants on Swiggy{enter}');

      // Step 2: Verify user message displayed
      await waitFor(() => {
        expect(screen.getByText('Find pizza restaurants on Swiggy')).toBeInTheDocument();
      });

      // Step 3: Verify bot response
      await waitFor(() => {
        expect(screen.getByText(/Searching for/i)).toBeInTheDocument();
      });

      // Step 4: Verify job created
      await waitFor(() => {
        expect(mockApiClient.post).toHaveBeenCalledWith('/jobs', {
          action: 'search_restaurant',
          platform: 'swiggy',
          payload: expect.any(Object),
        });
      });

      // Step 5: Verify progress updates
      await waitFor(
        () => {
          expect(mockApiClient.get).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Step 6: Verify completion message
      await waitFor(
        () => {
          expect(screen.getByText(/Here are your results/i)).toBeInTheDocument();
        },
        { timeout: 8000 }
      );

      // Step 7: Verify results displayed
      await waitFor(() => {
        expect(screen.getByText('Pizza Paradise')).toBeInTheDocument();
        expect(screen.getByText('Burger Hub')).toBeInTheDocument();
      });

      // Step 8: Verify input re-enabled
      expect(input).not.toBeDisabled();
    });
  });
});
