/**
 * Unit tests for TokenService.
 * Tests store, refresh, revoke, concurrent refresh lock, expiry handling.
 */

import * as crypto from 'crypto';
import { TokenService } from '../token.service';
import { TokenEncryptor } from '../token-encryptor';
import {
  TokenNotFoundError,
  TokenExpiredError,
  TokenRefreshError,
  ConcurrentRefreshError,
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

function createMockLock(acquireResult: boolean = true): DistributedLock {
  return {
    acquire: jest.fn().mockResolvedValue(acquireResult),
    release: jest.fn().mockResolvedValue(undefined),
  };
}

function createTestEncryptor(): TokenEncryptor {
  const key = crypto.randomBytes(32).toString('hex');
  return new TokenEncryptor({
    primaryKeyHex: key,
    primaryKeyVersion: 1,
  });
}

function createMockAdapter(
  provider: OAuthProviderName = 'zomato',
  refreshResponse?: ProviderTokenResponse
): OAuthProviderAdapter {
  const defaultRefreshResponse: ProviderTokenResponse = {
    accessToken: 'refreshed-access-token',
    refreshToken: 'refreshed-refresh-token',
    expiresIn: 3600,
    tokenType: 'Bearer',
    scope: 'read write',
  };

  return {
    providerName: provider,
    getConfig: jest.fn((): OAuthProviderConfig => ({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      authorizationUrl: 'https://example.com/auth',
      tokenUrl: 'https://example.com/token',
      redirectUri: 'http://localhost/callback',
      scopes: ['read', 'write'],
    })),
    parseTokenResponse: jest.fn(),
    parseErrorResponse: jest.fn(),
    buildTokenRequestBody: jest.fn(),
    buildRefreshRequestBody: jest.fn().mockReturnValue(new URLSearchParams()),
    buildAuthorizationUrl: jest.fn().mockReturnValue('https://example.com/auth?test=1'),
    executeTokenRequest: jest.fn().mockResolvedValue(
      refreshResponse ?? defaultRefreshResponse
    ),
  };
}

describe('TokenService', () => {
  let mockStore: ReturnType<typeof createMockStore>;
  let mockLock: DistributedLock;
  let encryptor: TokenEncryptor;
  let tokenService: TokenService;
  let mockAdapter: OAuthProviderAdapter;

  beforeEach(() => {
    jest.useFakeTimers();

    mockStore = createMockStore();
    mockLock = createMockLock(true);
    encryptor = createTestEncryptor();
    tokenService = new TokenService(mockStore, mockLock, encryptor);

    mockAdapter = createMockAdapter();
    tokenService.registerAdapter(mockAdapter);
  });

  afterEach(() => {
    tokenService.clearAllTimers();
    jest.useRealTimers();
  });

  describe('storeTokens', () => {
    it('should store encrypted tokens in the store', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read write',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      expect(mockStore.set).toHaveBeenCalledWith(
        'oauth:token:user-1:zomato',
        expect.any(String),
        expect.any(Number)
      );

      // Verify the stored data is encrypted (not plaintext)
      const storedEntry = mockStore._store.get('oauth:token:user-1:zomato');
      expect(storedEntry).toBeDefined();
      expect(storedEntry!.value).not.toContain('access-123');
    });

    it('should store token with TTL based on expiry plus buffer', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'access-123',
        expiresIn: 7200,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      // TTL = expiresIn + 3600 (1 hour buffer)
      expect(mockStore.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        7200 + 3600
      );
    });
  });

  describe('getValidToken', () => {
    it('should return access token for valid non-expired token', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'valid-token-abc',
        refreshToken: 'refresh-xyz',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      const token = await tokenService.getValidToken('user-1', 'zomato');

      expect(token).toBe('valid-token-abc');
    });

    it('should throw TokenNotFoundError when no token exists', async () => {
      await expect(
        tokenService.getValidToken('nonexistent', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });

    it('should auto-refresh when token is near expiry', async () => {
      // Store token that expires in 2 minutes (below 5-minute threshold)
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresIn: 120, // 2 minutes
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      const token = await tokenService.getValidToken('user-1', 'zomato');

      // Should have called executeTokenRequest for refresh
      expect(mockAdapter.executeTokenRequest).toHaveBeenCalled();
      expect(token).toBe('refreshed-access-token');
    });

    it('should throw TokenExpiredError for expired token without refresh token', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'expired-token',
        expiresIn: 1, // 1 second
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      // Advance time past expiry
      jest.advanceTimersByTime(2000);

      await expect(
        tokenService.getValidToken('user-1', 'zomato')
      ).rejects.toThrow(TokenExpiredError);
    });

    it('should refresh expired token if refresh token is available', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'expired-token',
        refreshToken: 'refresh-token',
        expiresIn: 1,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      jest.advanceTimersByTime(2000);

      const token = await tokenService.getValidToken('user-1', 'zomato');
      expect(token).toBe('refreshed-access-token');
    });
  });

  describe('refreshToken', () => {
    it('should acquire lock before refreshing', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresIn: 60,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      await tokenService.refreshToken('user-1', 'zomato');

      expect(mockLock.acquire).toHaveBeenCalledWith(
        'oauth:lock:refresh:user-1:zomato',
        30
      );
    });

    it('should release lock after refresh', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresIn: 60,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      await tokenService.refreshToken('user-1', 'zomato');

      expect(mockLock.release).toHaveBeenCalledWith(
        'oauth:lock:refresh:user-1:zomato'
      );
    });

    it('should throw ConcurrentRefreshError when lock cannot be acquired', async () => {
      const failLock = createMockLock(false);
      const service = new TokenService(mockStore, failLock, encryptor);
      service.registerAdapter(mockAdapter);

      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresIn: 60,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await service.storeTokens('user-1', 'zomato', tokenResponse);

      await expect(service.refreshToken('user-1', 'zomato')).rejects.toThrow(
        ConcurrentRefreshError
      );

      service.clearAllTimers();
    });

    it('should release lock even if refresh fails', async () => {
      (mockAdapter.executeTokenRequest as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      );

      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresIn: 60,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      await expect(
        tokenService.refreshToken('user-1', 'zomato')
      ).rejects.toThrow();

      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should throw TokenNotFoundError if token disappears during refresh', async () => {
      // Store but then clear before refresh
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        refreshToken: 'refresh-token',
        expiresIn: 60,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      // Clear the store to simulate token disappearing
      mockStore._store.clear();

      await expect(
        tokenService.refreshToken('user-1', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });

    it('should throw TokenRefreshError when no refresh token available', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'old-token',
        expiresIn: 60,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      await expect(
        tokenService.refreshToken('user-1', 'zomato')
      ).rejects.toThrow(TokenRefreshError);
    });

    it('should skip refresh if token was recently refreshed by another thread', async () => {
      // Store a token with long expiry (won't need refresh)
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'recently-refreshed',
        refreshToken: 'refresh-token',
        expiresIn: 7200, // 2 hours - well above threshold
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      const result = await tokenService.refreshToken('user-1', 'zomato');

      // Should NOT have called the adapter since token is still valid
      expect(mockAdapter.executeTokenRequest).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('recently-refreshed');
    });
  });

  describe('revokeTokens', () => {
    it('should delete tokens from store', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'to-revoke',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      await tokenService.revokeTokens('user-1', 'zomato');

      expect(mockStore.del).toHaveBeenCalledWith('oauth:token:user-1:zomato');
    });

    it('should not throw when revoking non-existent tokens', async () => {
      await expect(
        tokenService.revokeTokens('nonexistent', 'zomato')
      ).resolves.not.toThrow();
    });

    it('should make getValidToken fail after revocation', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'to-revoke',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      await tokenService.revokeTokens('user-1', 'zomato');

      await expect(
        tokenService.getValidToken('user-1', 'zomato')
      ).rejects.toThrow(TokenNotFoundError);
    });
  });

  describe('introspectToken', () => {
    it('should return active introspection for valid token', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'introspect-me',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read write',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      const introspection = await tokenService.introspectToken('user-1', 'zomato');

      expect(introspection.active).toBe(true);
      expect(introspection.provider).toBe('zomato');
      expect(introspection.userId).toBe('user-1');
      expect(introspection.scope).toBe('read write');
      expect(introspection.timeUntilExpiry).toBeGreaterThan(0);
      expect(introspection.needsRefresh).toBe(false);
    });

    it('should return inactive introspection for non-existent token', async () => {
      const introspection = await tokenService.introspectToken('user-1', 'zomato');

      expect(introspection.active).toBe(false);
      expect(introspection.provider).toBe('zomato');
      expect(introspection.userId).toBe('user-1');
    });

    it('should flag needsRefresh when token is near expiry', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'near-expiry',
        refreshToken: 'refresh-token',
        expiresIn: 180, // 3 minutes - below 5-minute threshold
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      const introspection = await tokenService.introspectToken('user-1', 'zomato');

      expect(introspection.active).toBe(true);
      expect(introspection.needsRefresh).toBe(true);
    });
  });

  describe('hasValidToken', () => {
    it('should return true for valid token', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'valid',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      const hasToken = await tokenService.hasValidToken('user-1', 'zomato');
      expect(hasToken).toBe(true);
    });

    it('should return false for non-existent token', async () => {
      const hasToken = await tokenService.hasValidToken('user-1', 'zomato');
      expect(hasToken).toBe(false);
    });

    it('should return false for expired token', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'will-expire',
        expiresIn: 1,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      jest.advanceTimersByTime(2000);

      const hasToken = await tokenService.hasValidToken('user-1', 'zomato');
      expect(hasToken).toBe(false);
    });
  });

  describe('getStoredToken', () => {
    it('should return null for non-existent token', async () => {
      const token = await tokenService.getStoredToken('user-1', 'zomato');
      expect(token).toBeNull();
    });

    it('should return stored token data', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'stored-token',
        refreshToken: 'stored-refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read write',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);

      const stored = await tokenService.getStoredToken('user-1', 'zomato');

      expect(stored).not.toBeNull();
      expect(stored!.accessToken).toBe('stored-token');
      expect(stored!.refreshToken).toBe('stored-refresh');
      expect(stored!.provider).toBe('zomato');
      expect(stored!.userId).toBe('user-1');
      expect(stored!.scope).toBe('read write');
    });

    it('should return null and clean up corrupted data', async () => {
      // Manually store invalid encrypted data
      mockStore._store.set('oauth:token:user-1:zomato', {
        value: 'not-valid-encrypted-data',
        ttl: 3600,
      });

      const token = await tokenService.getStoredToken('user-1', 'zomato');
      expect(token).toBeNull();
    });
  });

  describe('clearAllTimers', () => {
    it('should clear all auto-refresh timers', async () => {
      const tokenResponse: ProviderTokenResponse = {
        accessToken: 'timer-test',
        refreshToken: 'refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
        scope: 'read',
      };

      await tokenService.storeTokens('user-1', 'zomato', tokenResponse);
      await tokenService.storeTokens('user-2', 'zomato', tokenResponse);

      // Should not throw
      tokenService.clearAllTimers();
    });
  });
});
