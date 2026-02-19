/**
 * Token Manager for platform session tokens.
 * Stores encrypted tokens in Redis with TTL-based expiry.
 */

import type { ProviderName } from '../types/common.types.js';
import { TokenEncryption } from './tokenEncryption.js';

export interface PlatformToken {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  platform: ProviderName;
  userId: string;
  linkedAt: number;
  lastUsed: number;
  location?: {
    lat: number;
    lng: number;
    label: string;
  };
  metadata?: Record<string, string>;
}

export interface TokenStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/**
 * In-memory token store for development/testing.
 * In production, replace with RedisTokenStore.
 */
export class InMemoryTokenStore implements TokenStore {
  private readonly store: Map<string, { value: string; expiresAt: number }> =
    new Map();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class TokenManager {
  private readonly encryption: TokenEncryption;
  private readonly store: TokenStore;

  constructor(store: TokenStore, encryptionKey?: string) {
    this.encryption = new TokenEncryption(encryptionKey);
    this.store = store;
  }

  /**
   * Store a platform token for a user.
   */
  async storeToken(
    userId: string,
    platform: ProviderName,
    tokenData: Omit<PlatformToken, 'userId' | 'platform' | 'linkedAt' | 'lastUsed'>
  ): Promise<void> {
    const token: PlatformToken = {
      ...tokenData,
      userId,
      platform,
      linkedAt: Date.now(),
      lastUsed: Date.now(),
    };

    const encrypted = this.encryption.encrypt(JSON.stringify(token));
    const key = this.buildKey(userId, platform);
    const ttlSeconds = Math.max(
      1,
      Math.floor((token.expiresAt - Date.now()) / 1000)
    );

    await this.store.set(key, encrypted, ttlSeconds);
  }

  /**
   * Retrieve a platform token for a user.
   */
  async getToken(userId: string, platform: ProviderName): Promise<PlatformToken | null> {
    const key = this.buildKey(userId, platform);
    const encrypted = await this.store.get(key);

    if (!encrypted) {
      return null;
    }

    try {
      const decrypted = this.encryption.decrypt(encrypted);
      const token: PlatformToken = JSON.parse(decrypted) as PlatformToken;

      if (Date.now() > token.expiresAt) {
        await this.store.del(key);
        return null;
      }

      return token;
    } catch {
      await this.store.del(key);
      return null;
    }
  }

  /**
   * Get the raw session token string for API calls.
   */
  async resolveSessionToken(userId: string, platform: ProviderName): Promise<string> {
    const tokenData = await this.getToken(userId, platform);

    if (!tokenData) {
      throw new PlatformNotLinkedError(userId, platform);
    }

    if (Date.now() > tokenData.expiresAt) {
      throw new TokenExpiredError(userId, platform);
    }

    // Update lastUsed timestamp
    await this.storeToken(userId, platform, {
      ...tokenData,
    });

    return tokenData.token;
  }

  /**
   * Delete a platform token (unlink account).
   */
  async deleteToken(userId: string, platform: ProviderName): Promise<void> {
    const key = this.buildKey(userId, platform);
    await this.store.del(key);
  }

  /**
   * Check if a user has a valid token for a platform.
   */
  async hasValidToken(userId: string, platform: ProviderName): Promise<boolean> {
    const token = await this.getToken(userId, platform);
    return token !== null && Date.now() < token.expiresAt;
  }

  private buildKey(userId: string, platform: ProviderName): string {
    return `platform:token:${userId}:${platform}`;
  }
}

export class PlatformNotLinkedError extends Error {
  readonly userId: string;
  readonly platform: ProviderName;

  constructor(userId: string, platform: ProviderName) {
    super(`User "${userId}" has not linked their ${platform} account.`);
    this.name = 'PlatformNotLinkedError';
    this.userId = userId;
    this.platform = platform;
  }
}

export class TokenExpiredError extends Error {
  readonly userId: string;
  readonly platform: ProviderName;

  constructor(userId: string, platform: ProviderName) {
    super(`${platform} session token expired for user "${userId}". Please re-link.`);
    this.name = 'TokenExpiredError';
    this.userId = userId;
    this.platform = platform;
  }
}
