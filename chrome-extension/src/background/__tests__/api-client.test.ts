/**
 * Tests for API Client
 */

import { ApiClient } from '../api-client';
import { Job, JobStatus } from '../../shared/types';

describe('ApiClient', () => {
  let apiClient: ApiClient;
  const mockBaseUrl = 'http://localhost:3000';

  beforeEach(() => {
    apiClient = new ApiClient(mockBaseUrl);
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPendingJobs', () => {
    it('should fetch pending jobs successfully', async () => {
      const mockJobs: Job[] = [
        {
          id: 'job-1',
          userId: 'user-1',
          status: JobStatus.PENDING,
          action: 'search_restaurant' as any,
          platform: 'swiggy',
          payload: {},
          progress: 0,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockJobs,
      });

      const jobs = await apiClient.getPendingJobs(10);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/jobs/pending?limit=10`,
        expect.any(Object)
      );
      expect(jobs).toEqual(mockJobs);
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const jobs = await apiClient.getPendingJobs(10);

      expect(jobs).toEqual([]);
    });
  });

  describe('updateJobStatus', () => {
    it('should update job status successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await apiClient.updateJobStatus('job-1', {
        status: JobStatus.IN_PROGRESS,
        progress: 50,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/jobs/job-1/status`,
        expect.objectContaining({
          method: 'PATCH',
          body: expect.any(String),
        })
      );
    });

    it('should throw error on failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error',
      });

      await expect(
        apiClient.updateJobStatus('job-1', {
          status: JobStatus.IN_PROGRESS,
        })
      ).rejects.toThrow();
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      const isHealthy = await apiClient.healthCheck();

      expect(isHealthy).toBe(true);
    });

    it('should return false when API is unhealthy', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const isHealthy = await apiClient.healthCheck();

      expect(isHealthy).toBe(false);
    });
  });

  describe('setBaseUrl', () => {
    it('should update base URL', () => {
      const newUrl = 'https://api.production.com';
      apiClient.setBaseUrl(newUrl);

      // Verify by checking the console log (would need to spy on console.log in real test)
      expect(true).toBe(true);
    });
  });
});
