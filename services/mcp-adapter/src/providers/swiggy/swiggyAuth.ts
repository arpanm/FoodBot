/**
 * Swiggy authentication management.
 * Manages user session tokens for Swiggy API access.
 */

import type { TokenManager } from '../../auth/TokenManager.js';
import type { GeoLocation } from '../../types/common.types.js';

export interface SwiggyUserContext {
  sessionToken: string;
  location: GeoLocation;
}

export class SwiggyAuth {
  private readonly tokenManager: TokenManager;

  constructor(tokenManager: TokenManager) {
    this.tokenManager = tokenManager;
  }

  /**
   * Get user context for Swiggy API calls.
   * Retrieves the session token and location for a given user.
   */
  async getUserContext(
    userId: string,
    fallbackLocation?: GeoLocation
  ): Promise<SwiggyUserContext> {
    const token = await this.tokenManager.getToken(userId, 'swiggy');

    if (!token) {
      throw new SwiggyNotLinkedError(userId);
    }

    if (Date.now() > token.expiresAt) {
      throw new SwiggySessionExpiredError(userId);
    }

    const location: GeoLocation = token.location
      ? { lat: token.location.lat, lng: token.location.lng }
      : fallbackLocation ?? { lat: 12.9716, lng: 77.5946 }; // Default: Bangalore

    return {
      sessionToken: token.token,
      location,
    };
  }

  /**
   * Store a Swiggy session token for a user.
   */
  async linkAccount(
    userId: string,
    sessionToken: string,
    location: GeoLocation
  ): Promise<void> {
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    await this.tokenManager.storeToken(userId, 'swiggy', {
      token: sessionToken,
      expiresAt: Date.now() + twentyFourHoursMs,
      location: {
        lat: location.lat,
        lng: location.lng,
        label: 'Default',
      },
    });
  }

  /**
   * Remove Swiggy session token (unlink account).
   */
  async unlinkAccount(userId: string): Promise<void> {
    await this.tokenManager.deleteToken(userId, 'swiggy');
  }

  /**
   * Check if a user has a valid Swiggy session.
   */
  async isLinked(userId: string): Promise<boolean> {
    return this.tokenManager.hasValidToken(userId, 'swiggy');
  }
}

export class SwiggyNotLinkedError extends Error {
  readonly userId: string;

  constructor(userId: string) {
    super(
      `User "${userId}" has not linked their Swiggy account. ` +
        'Please link your Swiggy account to search restaurants.'
    );
    this.name = 'SwiggyNotLinkedError';
    this.userId = userId;
  }
}

export class SwiggySessionExpiredError extends Error {
  readonly userId: string;

  constructor(userId: string) {
    super(
      `Swiggy session expired for user "${userId}". ` +
        'Please re-link your Swiggy account.'
    );
    this.name = 'SwiggySessionExpiredError';
    this.userId = userId;
  }
}
