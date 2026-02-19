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
    code: string
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config registered for platform: ${platform}`);
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: config.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OAuthTokenExchangeError(
          `Token exchange failed for ${platform}: ${response.status} ${response.statusText}`,
          { platform, statusCode: response.status, errorBody: errorText }
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string;
      };

      if (!data.access_token) {
        throw new OAuthTokenExchangeError(
          `Invalid token response from ${platform}: missing access_token`,
          { platform }
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope ?? config.scopes.join(' '),
      };
    } catch (error) {
      if (error instanceof OAuthTokenExchangeError) {
        throw error;
      }
      throw new OAuthTokenExchangeError(
        `OAuth token exchange failed for ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { platform, originalError: error }
      );
    }
  }

  /**
   * Refresh an expired access token using a refresh token.
   */
  async refreshAccessToken(
    platform: ProviderName,
    refreshToken: string
  ): Promise<OAuthTokenResponse> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`No OAuth config registered for platform: ${platform}`);
    }

    try {
      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new OAuthTokenRefreshError(
          `Token refresh failed for ${platform}: ${response.status} ${response.statusText}`,
          { platform, statusCode: response.status, errorBody: errorText }
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string;
      };

      if (!data.access_token) {
        throw new OAuthTokenRefreshError(
          `Invalid token refresh response from ${platform}: missing access_token`,
          { platform }
        );
      }

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? refreshToken,
        expiresIn: data.expires_in,
        tokenType: data.token_type,
        scope: data.scope ?? config.scopes.join(' '),
      };
    } catch (error) {
      if (error instanceof OAuthTokenRefreshError) {
        throw error;
      }
      throw new OAuthTokenRefreshError(
        `OAuth token refresh failed for ${platform}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { platform, originalError: error }
      );
    }
  }
}

export class InvalidOAuthStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidOAuthStateError';
  }
}

export class OAuthTokenExchangeError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'OAuthTokenExchangeError';
    this.context = context;
  }
}

export class OAuthTokenRefreshError extends Error {
  public readonly context: Record<string, unknown>;

  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message);
    this.name = 'OAuthTokenRefreshError';
    this.context = context;
  }
}
