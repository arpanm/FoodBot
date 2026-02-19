/**
 * Account Linking Service Tests
 * Tests for OAuth flows, account status, and error handling.
 */

import { apiClient } from '../api/axios.config';
import {
  accountLinkingService,
} from '../account-linking.service';
import type {
  LinkedAccountsResponse,
  InitiateAuthResponse,
  OAuthCallbackResponse,
  UnlinkAccountResponse,
} from '../account-linking.service';

// Mock the API client
jest.mock('../api/axios.config', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AccountLinkingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateSwiggyAuth', () => {
    it('should request a Swiggy OAuth URL from the backend', async () => {
      const mockResponse: InitiateAuthResponse = {
        authUrl: 'https://swiggy.com/oauth/authorize?client_id=foodbot&state=abc123',
        state: 'abc123',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.initiateSwiggyAuth();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/platforms/link',
        { platform: 'swiggy' }
      );
      expect(result.authUrl).toBe(mockResponse.authUrl);
      expect(result.state).toBe('abc123');
    });

    it('should throw when the backend rejects the OAuth initiation', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Platform unavailable'));

      await expect(accountLinkingService.initiateSwiggyAuth()).rejects.toThrow(
        'Platform unavailable'
      );
    });
  });

  describe('initiateZomatoAuth', () => {
    it('should request a Zomato OAuth URL from the backend', async () => {
      const mockResponse: InitiateAuthResponse = {
        authUrl: 'https://zomato.com/oauth/authorize?client_id=foodbot&state=xyz789',
        state: 'xyz789',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.initiateZomatoAuth();

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/platforms/link',
        { platform: 'zomato' }
      );
      expect(result.authUrl).toBe(mockResponse.authUrl);
      expect(result.state).toBe('xyz789');
    });

    it('should throw when the backend rejects the OAuth initiation', async () => {
      mockApiClient.post.mockRejectedValue(new Error('Service unavailable'));

      await expect(accountLinkingService.initiateZomatoAuth()).rejects.toThrow(
        'Service unavailable'
      );
    });
  });

  describe('handleOAuthCallback', () => {
    it('should send authorization code and state to the backend', async () => {
      const mockResponse: OAuthCallbackResponse = {
        success: true,
        platform: 'swiggy',
        message: 'Account linked successfully',
      };

      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.handleOAuthCallback({
        code: 'auth-code-123',
        state: 'state-abc',
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/platforms/callback',
        {
          code: 'auth-code-123',
          state: 'state-abc',
        }
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe('swiggy');
    });

    it('should throw when the state parameter is invalid', async () => {
      mockApiClient.post.mockRejectedValue(
        new Error('Invalid state parameter')
      );

      await expect(
        accountLinkingService.handleOAuthCallback({
          code: 'auth-code',
          state: 'invalid-state',
        })
      ).rejects.toThrow('Invalid state parameter');
    });

    it('should throw when the authorization code is expired', async () => {
      mockApiClient.post.mockRejectedValue(
        new Error('Authorization code expired')
      );

      await expect(
        accountLinkingService.handleOAuthCallback({
          code: 'expired-code',
          state: 'valid-state',
        })
      ).rejects.toThrow('Authorization code expired');
    });
  });

  describe('getLinkedAccounts', () => {
    it('should fetch linked accounts status from the backend', async () => {
      const mockResponse: LinkedAccountsResponse = {
        accounts: [
          {
            platform: 'swiggy',
            status: 'linked',
            linkedAt: '2026-02-10T00:00:00Z',
            lastUsed: '2026-02-19T10:00:00Z',
            displayName: 'user@swiggy.com',
            expiresAt: '2026-02-20T00:00:00Z',
          },
          {
            platform: 'zomato',
            status: 'not_linked',
            linkedAt: null,
            lastUsed: null,
            displayName: null,
            expiresAt: null,
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.getLinkedAccounts();

      expect(mockApiClient.get).toHaveBeenCalledWith('/platforms/status');
      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].platform).toBe('swiggy');
      expect(result.accounts[0].status).toBe('linked');
      expect(result.accounts[1].platform).toBe('zomato');
      expect(result.accounts[1].status).toBe('not_linked');
    });

    it('should return expired status for expired tokens', async () => {
      const mockResponse: LinkedAccountsResponse = {
        accounts: [
          {
            platform: 'swiggy',
            status: 'expired',
            linkedAt: '2026-01-01T00:00:00Z',
            lastUsed: '2026-01-15T00:00:00Z',
            displayName: 'user@swiggy.com',
            expiresAt: '2026-01-02T00:00:00Z',
          },
        ],
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.getLinkedAccounts();

      expect(result.accounts[0].status).toBe('expired');
    });

    it('should throw when the backend is unavailable', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(accountLinkingService.getLinkedAccounts()).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('unlinkAccount', () => {
    it('should send an unlink request for Swiggy', async () => {
      const mockResponse: UnlinkAccountResponse = {
        success: true,
        platform: 'swiggy',
        message: 'Account unlinked successfully',
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.unlinkAccount('swiggy');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/platforms/unlink',
        { data: { platform: 'swiggy' } }
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe('swiggy');
    });

    it('should send an unlink request for Zomato', async () => {
      const mockResponse: UnlinkAccountResponse = {
        success: true,
        platform: 'zomato',
        message: 'Account unlinked successfully',
      };

      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await accountLinkingService.unlinkAccount('zomato');

      expect(mockApiClient.delete).toHaveBeenCalledWith(
        '/platforms/unlink',
        { data: { platform: 'zomato' } }
      );
      expect(result.success).toBe(true);
    });

    it('should throw when trying to unlink a non-linked account', async () => {
      mockApiClient.delete.mockRejectedValue(
        new Error('Account not linked')
      );

      await expect(
        accountLinkingService.unlinkAccount('swiggy')
      ).rejects.toThrow('Account not linked');
    });
  });
});
