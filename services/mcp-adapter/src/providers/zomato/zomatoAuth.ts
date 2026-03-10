/**
 * Zomato authentication management.
 * Supports dual auth: API key (read-only) and session token (full access).
 */

import type { TokenManager } from '../../auth/token-manager.js';
import type { GeoLocation } from '../../types/common.types.js';

export interface ZomatoUserContext {
  sessionToken: string;
  location: GeoLocation;
}

export class ZomatoAuth {
  private readonly tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Get user session context for Zomato session-based API calls.
   */
  async getUserContext(
    userId: string,
    fallbackLocation?: GeoLocation
  ): Promise<ZomatoUserContext> {
    const token = await this.tokenManager.getToken(userId, 'zomato');

    if (!token) {
      throw new ZomatoNotLinkedError(userId);
    }

    if (Date.now() > token.expiresAt) {
      throw new ZomatoSessionExpiredError(userId);
    }

    const location: GeoLocation = token.location
      ? { lat: token.location.lat, lng: token.location.lng }
      : fallbackLocation ?? { lat: 12.9716, lng: 77.5946 };

    return {
      sessionToken: token.token,
      location,
    };
  }

  /**
   * Store a Zomato session/OAuth token for a user.
   */
  async linkAccount(
    userId: string,
    accessToken: string,
    location: GeoLocation,
    refreshToken?: string
  ): Promise<void> {
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    await this.tokenManager.storeToken(userId, 'zomato', {
      token: accessToken,
      refreshToken,
      expiresAt: Date.now() + twentyFourHoursMs,
      location: {
        lat: location.lat,
        lng: location.lng,
        label: 'Default',
      },
    });
  }

  /**
   * Remove Zomato token (unlink account).
   */
  async unlinkAccount(userId: string): Promise<void> {
    await this.tokenManager.deleteToken(userId, 'zomato');
  }

  /**
   * Check if a user has a valid Zomato session.
   */
  async isLinked(userId: string): Promise<boolean> {
    return this.tokenManager.hasValidToken(userId, 'zomato');
  }
}

export class ZomatoNotLinkedError extends Error {
  readonly userId: string;

  constructor(userId: string) {
    super(
      `User "${userId}" has not linked their Zomato account. ` +
        'Using API key for read-only access.'
    );
    this.name = 'ZomatoNotLinkedError';
    this.userId = userId;
  }
}

export class ZomatoSessionExpiredError extends Error {
  readonly userId: string;

  constructor(userId: string) {
    super(
      `Zomato session expired for user "${userId}". ` +
        'Please re-link your Zomato account.'
    );
    this.name = 'ZomatoSessionExpiredError';
    this.userId = userId;
  }
}
