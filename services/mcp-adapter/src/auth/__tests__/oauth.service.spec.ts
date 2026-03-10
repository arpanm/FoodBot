/**
 * Unit tests for OAuthService.
 * Tests the full OAuth 2.1 flow: initiate -> callback -> token usage -> refresh -> revoke
 */

import * as crypto from 'crypto';
import { OAuthService } from '../oauth.service';
import {
  ProviderNotConfiguredError,
  MissingAuthorizationCodeError,
  InvalidStateError,
  TokenNotFoundError,
} from '../auth.errors';
import type {
  TokenStore,
  DistributedLock,
  OAuthProviderAdapter,
  OAuthProviderName,
  ProviderTokenResponse,
  OAuthProviderConfig,
} from '../auth.types';

function createMockStore(): TokenStore & {
  _store: Map<string, { value: string; ttl: number }>;
} {
  const store = new Map<string, { value: string; ttl: number }>();
  return {
    _store: store,
    get: jest.fn(async (key: string): Promise<string | null> => {
      const entry = store.get(key);
      return entry ? entry.value : null;
    }),
    set: jest.fn(async (key: string, value: string, ttl: number): Promise<void> => {
      store.set(key, { value, ttl });
    }),
    del: jest.fn(async (key: string): Promise<void> => {
      store.delete(key);
    }),
  };
}

function createMockLock(): DistributedLock {
  return {
    acquire: jest.fn().mockResolvedValue(true),
    release: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockAdapter(
  provider: OAuthProviderName = 'zomato'
): OAuthProviderAdapter & { _tokenResponse: ProviderTokenResponse } {
  const tokenResponse: ProviderTokenResponse = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: 'read write',
  };

  return {
    _tokenResponse: tokenResponse,
    providerName: provider,
    getConfig: jest.fn((): OAuthProviderConfig => ({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      authorizationUrl: `https://accounts.${provider}.com/oauth/authorize`,
      tokenUrl: `https://accounts.${provider}.com/oauth/token`,
      revocationUrl: `https://accounts.${provider}.com/oauth/revoke`,
      redirectUri: `http://localhost:3100/auth/${provider}/callback`,
      scopes: ['read', 'write'],
    })),
    parseTokenResponse: jest.fn().mockReturnValue(tokenResponse),
    parseErrorResponse: jest.fn().mockReturnValue('Test error'),
    buildTokenRequestBody: jest.fn().mockReturnValue(new URLSearchParams({
      grant_type: 'authorization_code',
      code: 'test-code',
    })),
    buildRefreshRequestBody: jest.fn().mockReturnValue(new URLSearchParams({
      grant_type: 'refresh_token',
    })),
    buildRevocationRequestBody: jest.fn().mockReturnValue(new URLSearchParams({
      token: 'test-token',
    })),
    buildAuthorizationUrl: jest.fn(
      (state: string, codeChallenge: string, nonce: string) =>
        `https://accounts.${provider}.com/oauth/authorize?` +
        `client_id=test-client-id&state=${state}&code_challenge=${codeChallenge}&nonce=${nonce}`
    ),
    executeTokenRequest: jest.fn().mockResolvedValue(tokenResponse),
  };
}

describe('OAuthService', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let mockLock: DistributedLock;
  let oauthService: OAuthService;
  let zomatoAdapter: ReturnType<typeof createMockAdapter>;
  let swiggyAdapter: ReturnType<typeof createMockAdapter>;
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.useFakeTimers();

    // Mock global fetch to prevent real network calls that hang with fake timers
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    mockStore = createMockStore();
    mockLock = createMockLock();

    oauthService = new OAuthService(mockStore, mockLock, {
      encryptionKeyHex: encryptionKey,
      encryptionKeyVersion: 1,
    });

    zomatoAdapter = createMockAdapter('zomato');
    swiggyAdapter = createMockAdapter('swiggy');

    oauthService.registerProvider(zomatoAdapter);
    oauthService.registerProvider(swiggyAdapter);
  });

  afterEach(() => {
    oauthService.shutdown();
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  describe('initiateAuthorization', () => {
    it('should return authorization URL with state and nonce', async () => {
      const result = await oauthService.initiateAuthorization('user-123', 'zomato');

      expect(result.authUrl).toContain('https://accounts.zomato.com/oauth/authorize');
      expect(result.state).toBeDefined();
      expect(result.state.length).toBe(64); // 32 bytes hex
      expect(result.nonce).toBeDefined();
      expect(result.nonce.length).toBe(32); // 16 bytes hex
      expect(result.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should include PKCE code_challenge in authorization URL', async () => {
      const result = await oauthService.initiateAuthorization('user-123', 'zomato');

      expect(zomatoAdapter.buildAuthorizationUrl).toHaveBeenCalledWith(
        result.state,
        expect.any(String), // code_challenge
        expect.any(String)  // nonce
      );
    });

    it('should store state in the backing store', async () => {
      const result = await oauthService.initiateAuthorization('user-123', 'zomato');

      // Check that state was stored (state manager uses oauth:state: prefix)
      const stateKey = `oauth:state:${result.state}`;
      const stored = mockStore._store.get(stateKey);
      expect(stored).toBeDefined();

      const flowState = JSON.parse(stored!.value);
      expect(flowState.userId).toBe('user-123');
      expect(flowState.provider).toBe('zomato');
    });

    it('should store PKCE verifier in the backing store', async () => {
      const result = await oauthService.initiateAuthorization('user-123', 'zomato');

      // Check that PKCE verifier was stored
      const pkceKey = `oauth:pkce:${result.state}`;
      const stored = mockStore._store.get(pkceKey);
      expect(stored).toBeDefined();
      expect(stored!.value.length).toBeGreaterThanOrEqual(43);
    });

    it('should throw ProviderNotConfiguredError for unregistered provider', async () => {
      const service = new OAuthService(mockStore, mockLock, {
        encryptionKeyHex: encryptionKey,
        encryptionKeyVersion: 1,
      });

      await expect(
        service.initiateAuthorization('user-123', 'zomato')
      ).rejects.toThrow(ProviderNotConfiguredError);
    });

    it('should work for swiggy provider', async () => {
      const result = await oauthService.initiateAuthorization('user-123', 'swiggy');

      expect(result.authUrl).toContain('swiggy');
      expect(swiggyAdapter.buildAuthorizationUrl).toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens on valid callback', async () => {
      // First initiate to set up state
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');

      // Handle callback
      const tokenResponse = await oauthService.handleCallback({
        code: 'auth-code-123',
        state: initResult.state,
        provider: 'zomato',
      });

      expect(tokenResponse.accessToken).toBe('test-access-token');
      expect(tokenResponse.refreshToken).toBe('test-refresh-token');
      expect(tokenResponse.expiresIn).toBe(3600);
    });

    it('should store encrypted tokens after callback', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');

      await oauthService.handleCallback({
        code: 'auth-code-123',
        state: initResult.state,
        provider: 'zomato',
      });

      // Token should be stored
      const tokenKey = 'oauth:token:user-123:zomato';
      const stored = mockStore._store.get(tokenKey);
      expect(stored).toBeDefined();
    });

    it('should throw MissingAuthorizationCodeError when code is empty', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');

      await expect(
        oauthService.handleCallback({
          code: '',
          state: initResult.state,
          provider: 'zomato',
        })
      ).rejects.toThrow(MissingAuthorizationCodeError);
    });

    it('should throw InvalidStateError for non-existent state', async () => {
      await expect(
        oauthService.handleCallback({
          code: 'auth-code',
          state: 'nonexistent-state',
          provider: 'zomato',
        })
      ).rejects.toThrow(InvalidStateError);
    });

    it('should throw InvalidStateError for provider mismatch', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');

      await expect(
        oauthService.handleCallback({
          code: 'auth-code',
          state: initResult.state,
          provider: 'swiggy', // Mismatch!
        })
      ).rejects.toThrow(InvalidStateError);
    });

    it('should reject replay of used state', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');

      // First callback succeeds
      await oauthService.handleCallback({
        code: 'auth-code-123',
        state: initResult.state,
        provider: 'zomato',
      });

      // Second callback with same state fails (replay)
      await expect(
        oauthService.handleCallback({
          code: 'auth-code-456',
          state: initResult.state,
          provider: 'zomato',
        })
      ).rejects.toThrow(InvalidStateError);
    });

    it('should call adapter.executeTokenRequest with correct params', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');

      await oauthService.handleCallback({
        code: 'auth-code-123',
        state: initResult.state,
        provider: 'zomato',
      });

      expect(zomatoAdapter.executeTokenRequest).toHaveBeenCalledWith(
        `https://accounts.zomato.com/oauth/token`,
        expect.any(URLSearchParams)
      );
    });
  });

  describe('getValidToken', () => {
    it('should return valid access token after callback', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      const token = await oauthService.getValidToken('user-123', 'zomato');
      expect(token).toBe('test-access-token');
    });

    it('should throw TokenNotFoundError for unauthenticated user', async () => {
      await expect(
        oauthService.getValidToken('nonexistent', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token for authenticated user', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      // Refresh response configured in mock
      await expect(
        oauthService.refreshToken('user-123', 'zomato')
      ).resolves.not.toThrow();
    });
  });

  describe('revokeTokens', () => {
    it('should revoke tokens for authenticated user', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      await oauthService.revokeTokens('user-123', 'zomato');

      // Token should no longer be available
      await expect(
        oauthService.getValidToken('user-123', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });

    it('should not throw for unauthenticated user', async () => {
      await expect(
        oauthService.revokeTokens('nonexistent', 'zomato')
      ).resolves.not.toThrow();
    });

    it('should attempt provider-level revocation', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      await oauthService.revokeTokens('user-123', 'zomato');

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should still clean up locally if provider revocation fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      // Should not throw even though provider revocation fails
      await expect(
        oauthService.revokeTokens('user-123', 'zomato')
      ).resolves.not.toThrow();

      // Token should still be cleaned up locally
      await expect(
        oauthService.getValidToken('user-123', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });
  });

  describe('introspectToken', () => {
    it('should return active introspection for valid token', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      const introspection = await oauthService.introspectToken('user-123', 'zomato');

      expect(introspection.active).toBe(true);
      expect(introspection.provider).toBe('zomato');
      expect(introspection.userId).toBe('user-123');
      expect(introspection.scope).toBe('read write');
    });

    it('should return inactive introspection for non-existent token', async () => {
      const introspection = await oauthService.introspectToken('user-123', 'zomato');

      expect(introspection.active).toBe(false);
    });
  });

  describe('getAuthStatus', () => {
    it('should return authenticated status for valid token', async () => {
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      await oauthService.handleCallback({
        code: 'auth-code',
        state: initResult.state,
        provider: 'zomato',
      });

      const status = await oauthService.getAuthStatus('user-123', 'zomato');

      expect(status.authenticated).toBe(true);
      expect(status.provider).toBe('zomato');
      expect(status.userId).toBe('user-123');
      expect(status.scope).toBe('read write');
      expect(status.expiresAt).toBeDefined();
    });

    it('should return unauthenticated status when not linked', async () => {
      const status = await oauthService.getAuthStatus('user-123', 'zomato');

      expect(status.authenticated).toBe(false);
      expect(status.scope).toBeUndefined();
      expect(status.expiresAt).toBeUndefined();
    });
  });

  describe('full OAuth 2.1 flow', () => {
    it('should complete: initiate -> callback -> use token -> refresh -> revoke', async () => {
      // 1. Initiate
      const initResult = await oauthService.initiateAuthorization('user-123', 'zomato');
      expect(initResult.authUrl).toBeDefined();
      expect(initResult.state).toBeDefined();

      // 2. Callback
      const tokenResponse = await oauthService.handleCallback({
        code: 'authorization-code-xyz',
        state: initResult.state,
        provider: 'zomato',
      });
      expect(tokenResponse.accessToken).toBe('test-access-token');

      // 3. Use token
      const token = await oauthService.getValidToken('user-123', 'zomato');
      expect(token).toBe('test-access-token');

      // 4. Check status
      const status = await oauthService.getAuthStatus('user-123', 'zomato');
      expect(status.authenticated).toBe(true);

      // 5. Refresh
      await oauthService.refreshToken('user-123', 'zomato');

      // 6. Revoke
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;

      await oauthService.revokeTokens('user-123', 'zomato');

      global.fetch = originalFetch;

      // 7. Verify revoked
      const revokedStatus = await oauthService.getAuthStatus('user-123', 'zomato');
      expect(revokedStatus.authenticated).toBe(false);

      await expect(
        oauthService.getValidToken('user-123', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });

    it('should handle multiple users independently', async () => {
      // User 1 authenticates with Zomato
      const init1 = await oauthService.initiateAuthorization('user-1', 'zomato');
      await oauthService.handleCallback({
        code: 'code-1',
        state: init1.state,
        provider: 'zomato',
      });

      // User 2 authenticates with Swiggy
      const init2 = await oauthService.initiateAuthorization('user-2', 'swiggy');
      await oauthService.handleCallback({
        code: 'code-2',
        state: init2.state,
        provider: 'swiggy',
      });

      // Both should have valid tokens
      const token1 = await oauthService.getValidToken('user-1', 'zomato');
      const token2 = await oauthService.getValidToken('user-2', 'swiggy');
      expect(token1).toBe('test-access-token');
      expect(token2).toBe('test-access-token');

      // Revoking one should not affect the other
      await oauthService.revokeTokens('user-1', 'zomato');

      await expect(
        oauthService.getValidToken('user-1', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);

      const token2Still = await oauthService.getValidToken('user-2', 'swiggy');
      expect(token2Still).toBe('test-access-token');
    });

    it('should handle same user with multiple providers', async () => {
      // Same user authenticates with both providers
      const initZomato = await oauthService.initiateAuthorization('user-1', 'zomato');
      await oauthService.handleCallback({
        code: 'code-zomato',
        state: initZomato.state,
        provider: 'zomato',
      });

      const initSwiggy = await oauthService.initiateAuthorization('user-1', 'swiggy');
      await oauthService.handleCallback({
        code: 'code-swiggy',
        state: initSwiggy.state,
        provider: 'swiggy',
      });

      // Both should work
      expect(await oauthService.getValidToken('user-1', 'zomato')).toBeDefined();
      expect(await oauthService.getValidToken('user-1', 'swiggy')).toBeDefined();

      // Revoking Zomato should not affect Swiggy
      await oauthService.revokeTokens('user-1', 'zomato');
      expect(await oauthService.getValidToken('user-1', 'swiggy')).toBeDefined();
    });
  });

  describe('shutdown', () => {
    it('should clean up resources without error', () => {
      expect(() => oauthService.shutdown()).not.toThrow();
    });
  });
});
