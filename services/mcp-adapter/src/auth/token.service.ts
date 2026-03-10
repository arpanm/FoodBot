/**
 * Token Service for OAuth 2.1.
 *
 * Features:
 * - Stores encrypted tokens (access_token, refresh_token, expiry)
 * - Auto-refresh when token expiry < 5 minutes (background timer)
 * - Redis distributed lock for concurrent refresh prevention
 * - Token revocation (clear all tokens for user+provider)
 * - Get valid token (refresh if needed, decrypt, return)
 * - Token introspection
 */

import type {
  TokenStore,
  DistributedLock,
  OAuthProviderName,
  StoredTokenData,
  ProviderTokenResponse,
  TokenIntrospection,
  TokenServiceConfig,
  OAuthProviderAdapter,
} from './auth.types.js';
import { TokenEncryptor } from './token-encryptor.js';
import {
  TokenNotFoundError,
  TokenExpiredError,
  TokenRefreshError,
  ConcurrentRefreshError,
  LockAcquisitionError,
  TokenDecryptionError,
} from './auth.errors.js';

const DEFAULT_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_LOCK_TTL_SECONDS = 30;
const DEFAULT_MAX_REFRESH_RETRIES = 3;
const TOKEN_KEY_PREFIX = 'oauth:token';

export class TokenService {
  private readonly store: TokenStore;
  private readonly lock: DistributedLock;
  private readonly encryptor: TokenEncryptor;
  private readonly config: TokenServiceConfig;
  private readonly refreshTimers: Map<string, ReturnType<typeof setTimeout>>;
  private readonly adapters: Map<OAuthProviderName, OAuthProviderAdapter>;

  constructor(
    store: TokenStore,
    lock: DistributedLock,
    encryptor: TokenEncryptor,
    config?: Partial<TokenServiceConfig>
  ) {
    this.store = store;
    this.lock = lock;
    this.encryptor = encryptor;
    this.config = {
      refreshThresholdMs: config?.refreshThresholdMs ?? DEFAULT_REFRESH_THRESHOLD_MS,
      lockTtlSeconds: config?.lockTtlSeconds ?? DEFAULT_LOCK_TTL_SECONDS,
      maxRefreshRetries: config?.maxRefreshRetries ?? DEFAULT_MAX_REFRESH_RETRIES,
    };
    this.refreshTimers = new Map();
    this.adapters = new Map();
  }

  /**
   * Register an OAuth provider adapter for token refresh operations.
   */
  registerAdapter(adapter: OAuthProviderAdapter): void {
    this.adapters.set(adapter.providerName, adapter);
  }

  /**
   * Store tokens from a successful OAuth token exchange.
   * Encrypts tokens before storage and schedules auto-refresh.
   */
  async storeTokens(
    userId: string,
    provider: OAuthProviderName,
    tokenResponse: ProviderTokenResponse
  ): Promise<void> {
    const now = Date.now();

    const tokenData: StoredTokenData = {
      accessToken: tokenResponse.accessToken,
      refreshToken: tokenResponse.refreshToken,
      expiresAt: now + tokenResponse.expiresIn * 1000,
      tokenType: tokenResponse.tokenType,
      scope: tokenResponse.scope,
      provider,
      userId,
      issuedAt: now,
      lastRefreshedAt: now,
      keyVersion: this.encryptor.getCurrentKeyVersion(),
    };

    const encrypted = this.encryptor.encrypt(JSON.stringify(tokenData));
    const key = this.buildTokenKey(userId, provider);
    const ttlSeconds = Math.max(1, tokenResponse.expiresIn + 3600); // Add 1h buffer for refresh

    await this.store.set(key, encrypted, ttlSeconds);

    this.scheduleAutoRefresh(userId, provider, tokenData.expiresAt);
  }

  /**
   * Get a valid access token for a user+provider.
   * Automatically refreshes if the token is near expiry.
   */
  async getValidToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<string> {
    const tokenData = await this.getStoredToken(userId, provider);

    if (!tokenData) {
      throw new TokenNotFoundError(userId, provider);
    }

    const now = Date.now();

    // Token is expired
    if (now >= tokenData.expiresAt) {
      if (tokenData.refreshToken) {
        const refreshed = await this.refreshToken(userId, provider);
        return refreshed.accessToken;
      }
      throw new TokenExpiredError(userId, provider);
    }

    // Token needs refresh (within threshold)
    if (tokenData.expiresAt - now < this.config.refreshThresholdMs) {
      if (tokenData.refreshToken) {
        try {
          const refreshed = await this.refreshToken(userId, provider);
          return refreshed.accessToken;
        } catch (error) {
          // Fallback strategy: the token is still technically valid (within the
          // refresh threshold window but not yet expired), so we return the
          // current access token rather than failing the request. The next call
          // will retry the refresh. Log the failure for observability.
          const message = error instanceof Error ? error.message : 'Unknown error';
          // eslint-disable-next-line no-console -- intentional operational log
          console.warn(
            `[TokenService] Pre-emptive token refresh failed for user "${userId}" ` +
            `provider "${provider}": ${message}. Returning current token ` +
            `(expires in ${tokenData.expiresAt - Date.now()}ms).`
          );
          return tokenData.accessToken;
        }
      }
    }

    return tokenData.accessToken;
  }

  /**
   * Refresh the token for a user+provider.
   * Uses a distributed lock to prevent concurrent refreshes.
   */
  async refreshToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<StoredTokenData> {
    const lockKey = this.buildLockKey(userId, provider);
    const acquired = await this.lock.acquire(lockKey, this.config.lockTtlSeconds);

    if (!acquired) {
      throw new ConcurrentRefreshError(userId, provider);
    }

    try {
      // Re-read token after acquiring lock (another thread may have refreshed)
      const currentToken = await this.getStoredToken(userId, provider);

      if (!currentToken) {
        throw new TokenNotFoundError(userId, provider);
      }

      // Check if token was recently refreshed by another thread
      const now = Date.now();
      if (currentToken.expiresAt - now > this.config.refreshThresholdMs) {
        return currentToken;
      }

      if (!currentToken.refreshToken) {
        throw new TokenRefreshError(
          `No refresh token available for user "${userId}" and provider "${provider}".`,
          { userId, provider }
        );
      }

      const adapter = this.adapters.get(provider);
      if (!adapter) {
        throw new TokenRefreshError(
          `No OAuth adapter registered for provider "${provider}".`,
          { userId, provider }
        );
      }

      const config = adapter.getConfig();
      const body = adapter.buildRefreshRequestBody(currentToken.refreshToken);

      const response = await adapter.executeTokenRequest(config.tokenUrl, body);

      await this.storeTokens(userId, provider, {
        ...response,
        refreshToken: response.refreshToken ?? currentToken.refreshToken,
      });

      const refreshed = await this.getStoredToken(userId, provider);
      if (!refreshed) {
        throw new TokenRefreshError(
          'Token disappeared after refresh.',
          { userId, provider }
        );
      }

      return refreshed;
    } finally {
      await this.lock.release(lockKey);
    }
  }

  /**
   * Revoke all tokens for a user+provider combination.
   * Clears stored tokens and cancels auto-refresh timers.
   */
  async revokeTokens(userId: string, provider: OAuthProviderName): Promise<void> {
    this.cancelAutoRefresh(userId, provider);

    const key = this.buildTokenKey(userId, provider);
    await this.store.del(key);
  }

  /**
   * Get the stored token data for a user+provider.
   * Returns null if no token exists or decryption fails.
   */
  async getStoredToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<StoredTokenData | null> {
    const key = this.buildTokenKey(userId, provider);
    const encrypted = await this.store.get(key);

    if (!encrypted) {
      return null;
    }

    try {
      const decrypted = this.encryptor.decrypt(encrypted);
      const tokenData = JSON.parse(decrypted) as StoredTokenData;

      // Re-encrypt if using old key version
      if (this.encryptor.needsReEncryption(encrypted)) {
        const reEncrypted = this.encryptor.reEncrypt(encrypted);
        const ttlSeconds = Math.max(
          1,
          Math.floor((tokenData.expiresAt - Date.now()) / 1000) + 3600
        );
        await this.store.set(key, reEncrypted, ttlSeconds);
      }

      return tokenData;
    } catch (error) {
      if (error instanceof TokenDecryptionError) {
        // Corrupted token data — remove it so the user is prompted to re-authenticate.
        // eslint-disable-next-line no-console -- intentional operational log
        console.warn(
          `[TokenService] Corrupted token data for key "${key}". Deleting stored token.`
        );
        await this.store.del(key);
      } else {
        // Unexpected error during decryption/parsing (e.g., malformed JSON).
        // Return null to signal "no token available" so callers can handle gracefully.
        const message = error instanceof Error ? error.message : 'Unknown error';
        // eslint-disable-next-line no-console -- intentional operational log
        console.error(
          `[TokenService] Failed to read stored token for key "${key}": ${message}`
        );
      }
      return null;
    }
  }

  /**
   * Introspect a token to get its current status.
   */
  async introspectToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<TokenIntrospection> {
    const tokenData = await this.getStoredToken(userId, provider);

    if (!tokenData) {
      return {
        active: false,
        provider,
        userId,
        scope: '',
        expiresAt: 0,
        issuedAt: 0,
        lastRefreshedAt: 0,
        timeUntilExpiry: 0,
        needsRefresh: false,
      };
    }

    const now = Date.now();
    const timeUntilExpiry = Math.max(0, tokenData.expiresAt - now);
    const active = now < tokenData.expiresAt;
    const needsRefresh = timeUntilExpiry < this.config.refreshThresholdMs;

    return {
      active,
      provider: tokenData.provider,
      userId: tokenData.userId,
      scope: tokenData.scope,
      expiresAt: tokenData.expiresAt,
      issuedAt: tokenData.issuedAt,
      lastRefreshedAt: tokenData.lastRefreshedAt,
      timeUntilExpiry,
      needsRefresh,
    };
  }

  /**
   * Check if a user has a valid (non-expired) token for a provider.
   */
  async hasValidToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<boolean> {
    const tokenData = await this.getStoredToken(userId, provider);
    return tokenData !== null && Date.now() < tokenData.expiresAt;
  }

  /**
   * Schedule auto-refresh of a token before it expires.
   */
  private scheduleAutoRefresh(
    userId: string,
    provider: OAuthProviderName,
    expiresAt: number
  ): void {
    const timerKey = this.buildTimerKey(userId, provider);
    this.cancelAutoRefresh(userId, provider);

    const now = Date.now();
    const refreshAt = expiresAt - this.config.refreshThresholdMs;
    const delayMs = Math.max(0, refreshAt - now);

    // Only schedule if the token will expire in the future
    if (delayMs > 0 && expiresAt > now) {
      const timer = setTimeout(() => {
        void this.refreshToken(userId, provider).catch((error) => {
          // Auto-refresh is best-effort. If it fails, the user will be prompted
          // to re-authenticate on their next getValidToken() call, which will
          // attempt a synchronous refresh or return the stale token.
          const message = error instanceof Error ? error.message : 'Unknown error';
          // eslint-disable-next-line no-console -- intentional operational log
          console.warn(
            `[TokenService] Background auto-refresh failed for user "${userId}" ` +
            `provider "${provider}": ${message}`
          );
        });
      }, delayMs);

      // Prevent timer from keeping the process alive
      if (timer.unref) {
        timer.unref();
      }

      this.refreshTimers.set(timerKey, timer);
    }
  }

  /**
   * Cancel a scheduled auto-refresh timer.
   */
  private cancelAutoRefresh(userId: string, provider: OAuthProviderName): void {
    const timerKey = this.buildTimerKey(userId, provider);
    const existing = this.refreshTimers.get(timerKey);
    if (existing) {
      clearTimeout(existing);
      this.refreshTimers.delete(timerKey);
    }
  }

  /**
   * Clear all auto-refresh timers (for shutdown).
   */
  clearAllTimers(): void {
    for (const timer of this.refreshTimers.values()) {
      clearTimeout(timer);
    }
    this.refreshTimers.clear();
  }

  private buildTokenKey(userId: string, provider: OAuthProviderName): string {
    return `${TOKEN_KEY_PREFIX}:${userId}:${provider}`;
  }

  private buildLockKey(userId: string, provider: OAuthProviderName): string {
    return `oauth:lock:refresh:${userId}:${provider}`;
  }

  private buildTimerKey(userId: string, provider: OAuthProviderName): string {
    return `${userId}:${provider}`;
  }
}
