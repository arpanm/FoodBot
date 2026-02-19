/**
 * Integration tests for OAuth 2.1 implementation
 */

import { OAuthManager } from '../src/auth/OAuthManager.js';
import type { TokenStore } from '../src/auth/TokenManager.js';

describe('OAuthManager Integration Tests', () => {
  let oauthManager: OAuthManager;
  let mockTokenStore: TokenStore;

  beforeEach(() => {
    mockTokenStore = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(undefined),
    };

    oauthManager = new OAuthManager(mockTokenStore);

    oauthManager.registerConfig('zomato', {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/callback',
      authorizationUrl: 'https://accounts.zomato.com/oauth/authorize',
      tokenUrl: 'https://accounts.zomato.com/oauth/token',
      scopes: ['read', 'write'],
    });
  });

  describe('Authorization URL Generation', () => {
    it('should generate valid authorization URL', async () => {
      const result = await oauthManager.generateAuthorizationUrl(
        'user-123',
        'zomato'
      );

      expect(result.authUrl).toContain(
        'https://accounts.zomato.com/oauth/authorize'
      );
      expect(result.authUrl).toContain('client_id=test-client-id');
      expect(result.authUrl).toContain('response_type=code');
      expect(result.authUrl).toContain('scope=read%20write');
      expect(result.state).toBeTruthy();
    });

    it('should store OAuth state in token store', async () => {
      const result = await oauthManager.generateAuthorizationUrl(
        'user-123',
        'zomato'
      );

      expect(mockTokenStore.set).toHaveBeenCalledWith(
        expect.stringContaining('oauth:state:'),
        expect.any(String),
        300
      );
    });

    it('should throw error for unregistered platform', async () => {
      await expect(
        oauthManager.generateAuthorizationUrl('user-123', 'invalid' as any)
      ).rejects.toThrow('No OAuth config registered');
    });
  });

  describe('State Validation', () => {
    it('should validate valid OAuth state', async () => {
      const stateData = JSON.stringify({
        userId: 'user-123',
        platform: 'zomato',
        createdAt: Date.now(),
        nonce: 'test-nonce',
      });

      (mockTokenStore.get as jest.Mock).mockResolvedValue(stateData);

      const result = await oauthManager.validateState('test-state');

      expect(result.userId).toBe('user-123');
      expect(result.platform).toBe('zomato');
      expect(mockTokenStore.del).toHaveBeenCalledWith(
        'oauth:state:test-state'
      );
    });

    it('should reject invalid state', async () => {
      (mockTokenStore.get as jest.Mock).mockResolvedValue(null);

      await expect(oauthManager.validateState('invalid-state')).rejects.toThrow(
        'Invalid or expired OAuth state'
      );
    });

    it('should reject expired state', async () => {
      const expiredStateData = JSON.stringify({
        userId: 'user-123',
        platform: 'zomato',
        createdAt: Date.now() - 10 * 60 * 1000, // 10 minutes ago
        nonce: 'test-nonce',
      });

      (mockTokenStore.get as jest.Mock).mockResolvedValue(expiredStateData);

      await expect(oauthManager.validateState('expired-state')).rejects.toThrow(
        'OAuth state has expired'
      );
    });
  });

  describe('Token Exchange', () => {
    it('should exchange code for tokens successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'access-token-123',
          refresh_token: 'refresh-token-456',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read write',
        }),
      });

      const result = await oauthManager.exchangeCodeForTokens(
        'zomato',
        'auth-code-123'
      );

      expect(result.accessToken).toBe('access-token-123');
      expect(result.refreshToken).toBe('refresh-token-456');
      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
      expect(result.scope).toBe('read write');
    });

    it('should handle token exchange errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid authorization code',
      });

      await expect(
        oauthManager.exchangeCodeForTokens('zomato', 'invalid-code')
      ).rejects.toThrow('Token exchange failed');
    });

    it('should validate token response format', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });

      await expect(
        oauthManager.exchangeCodeForTokens('zomato', 'code-123')
      ).rejects.toThrow('missing access_token');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-access-token-789',
          refresh_token: 'new-refresh-token-012',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'read write',
        }),
      });

      const result = await oauthManager.refreshAccessToken(
        'zomato',
        'refresh-token-456'
      );

      expect(result.accessToken).toBe('new-access-token-789');
      expect(result.refreshToken).toBe('new-refresh-token-012');
      expect(result.expiresIn).toBe(3600);
    });

    it('should handle refresh token errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid refresh token',
      });

      await expect(
        oauthManager.refreshAccessToken('zomato', 'invalid-token')
      ).rejects.toThrow('Token refresh failed');
    });

    it('should preserve refresh token if not returned', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          access_token: 'new-access-token',
          expires_in: 3600,
          token_type: 'Bearer',
        }),
      });

      const result = await oauthManager.refreshAccessToken(
        'zomato',
        'original-refresh-token'
      );

      expect(result.refreshToken).toBe('original-refresh-token');
    });
  });
});
