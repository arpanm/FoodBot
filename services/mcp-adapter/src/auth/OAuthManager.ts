/**
 * OAuth 2.0 flow manager for platform account linking.
 * Handles authorization code flow for Zomato and session capture for Swiggy.
 */

import * as crypto from 'crypto';
import type { ProviderName } from '../types/common.types.js';
import type { TokenStore } from './TokenManager.js';

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

export interface OAuthState {
  userId: string;
  platform: ProviderName;
  createdAt: number;
  nonce: string;
}

export interface OAuthTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export class OAuthManager {
  private readonly configs: Map<ProviderName, OAuthConfig> = new Map();
  private readonly stateStore: TokenStore;

  constructor(stateStore: TokenStore) {
    this.stateStore = stateStore;
  }

  /**
   * Register an OAuth configuration for a platform.
   */
  registerConfig(platform: ProviderName, config: OAuthConfig): void {
    this.configs.set(platform, config);
  }

  /**
   * Generate an authorization URL for account linking.
   * Returns the URL and the state parameter for CSRF validation.
   */
  async generateAuthorizationUrl(
    userId: string,
    platform: ProviderName
  ): Promise<{ authUrl: string; state: string }> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config registered for platform: ${platform}`);
    }

    const state = crypto.randomUUID();
    const nonce = crypto.randomBytes(16).toString('hex');

    const oauthState: OAuthState = {
      userId,
      platform,
      createdAt: Date.now(),
      nonce,
    };

    await this.stateStore.set(
      `oauth:state:${state}`,
      JSON.stringify(oauthState),
      300 // 5 minute TTL
    );

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });

    const authUrl = `${config.authorizationUrl}?${params.toString()}`;
    return { authUrl, state };
  }

  /**
   * Validate an OAuth state parameter from callback.
   */
  async validateState(state: string): Promise<OAuthState> {
    const stateData = await this.stateStore.get(`oauth:state:${state}`);
    if (!stateData) {
      throw new InvalidOAuthStateError(
        'Invalid or expired OAuth state parameter.'
      );
    }

    await this.stateStore.del(`oauth:state:${state}`);
    const parsed: OAuthState = JSON.parse(stateData) as OAuthState;

    const fiveMinutesMs = 5 * 60 * 1000;
    if (Date.now() - parsed.createdAt > fiveMinutesMs) {
      throw new InvalidOAuthStateError('OAuth state has expired.');
    }

    return parsed;
  }

  /**
   * Exchange authorization code for tokens.
   * In production, this calls the platform's token endpoint.
   */
  async exchangeCodeForTokens(
    platform: ProviderName,
    _code: string
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config registered for platform: ${platform}`);
    }

    // In production, this would make an HTTP POST to config.tokenUrl
    // For now, return a placeholder that indicates the exchange would happen
    //
    // const response = await fetch(config.tokenUrl, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    //   body: new URLSearchParams({
    //     grant_type: 'authorization_code',
    //     code,
    //     redirect_uri: config.redirectUri,
    //     client_id: config.clientId,
    //     client_secret: config.clientSecret,
    //   }),
    // });

    throw new Error(
      `OAuth token exchange not yet implemented for ${platform}. ` +
        'Requires platform developer credentials.'
    );
  }

  /**
   * Refresh an expired access token using a refresh token.
   */
  async refreshAccessToken(
    platform: ProviderName,
    _refreshToken: string
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config registered for platform: ${platform}`);
    }

    // Similar to exchangeCodeForTokens, would POST to tokenUrl with
    // grant_type: 'refresh_token'
    throw new Error(
      `OAuth token refresh not yet implemented for ${platform}. ` +
        'Requires platform developer credentials.'
    );
  }
}

export class InvalidOAuthStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOAuthStateError';
  }
}
