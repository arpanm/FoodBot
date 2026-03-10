/**
 * Swiggy-specific OAuth adapter.
 * Defines Swiggy's OAuth endpoints, scopes, and response parsing.
 */

import type {
  OAuthProviderConfig,
  OAuthProviderName,
  ProviderTokenResponse,
} from '../auth.types.js';
import { TokenExchangeError } from '../auth.errors.js';
import { BaseOAuthAdapter } from './base-oauth.adapter.js';

const ENV_PREFIX = 'SWIGGY_OAUTH';

export class SwiggyOAuthAdapter extends BaseOAuthAdapter {
  readonly providerName: OAuthProviderName = 'swiggy';

  private readonly config: OAuthProviderConfig;

  constructor(configOverride?: Partial<OAuthProviderConfig>) {
    super();

    this.config = {
      clientId:
        configOverride?.clientId ??
        process.env[`${ENV_PREFIX}_CLIENT_ID`] ??
        '',
      clientSecret:
        configOverride?.clientSecret ??
        process.env[`${ENV_PREFIX}_CLIENT_SECRET`] ??
        '',
      authorizationUrl:
        configOverride?.authorizationUrl ??
        process.env[`${ENV_PREFIX}_AUTHORIZATION_URL`] ??
        'https://accounts.swiggy.com/oauth/authorize',
      tokenUrl:
        configOverride?.tokenUrl ??
        process.env[`${ENV_PREFIX}_TOKEN_URL`] ??
        'https://accounts.swiggy.com/oauth/token',
      revocationUrl:
        configOverride?.revocationUrl ??
        process.env[`${ENV_PREFIX}_REVOCATION_URL`] ??
        'https://accounts.swiggy.com/oauth/revoke',
      redirectUri:
        configOverride?.redirectUri ??
        process.env[`${ENV_PREFIX}_REDIRECT_URI`] ??
        'http://localhost:3100/auth/swiggy/callback',
      scopes: configOverride?.scopes ?? ['user.read', 'orders.read', 'orders.write'],
      additionalParams: configOverride?.additionalParams,
    };

    if (process.env.NODE_ENV !== 'test') {
      if (!this.config.clientId) {
        throw new Error(`${ENV_PREFIX}_CLIENT_ID is not configured. Set the environment variable or provide a config override.`);
      }
      if (!this.config.clientSecret) {
        throw new Error(`${ENV_PREFIX}_CLIENT_SECRET is not configured. Set the environment variable or provide a config override.`);
      }
    }
  }

  getConfig(): Omit<OAuthProviderConfig, 'clientSecret'> {
    const { clientSecret, ...publicConfig } = this.config;
    return publicConfig;
  }

  getSecretConfig(): OAuthProviderConfig {
    return { ...this.config };
  }

  /**
   * Parse Swiggy-specific token response.
   * Swiggy returns session_token alongside standard OAuth fields.
   */
  parseTokenResponse(responseBody: Record<string, unknown>): ProviderTokenResponse {
    // Swiggy may return 'session_token' instead of 'access_token'
    const accessToken =
      responseBody['access_token'] ?? responseBody['session_token'];

    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new TokenExchangeError(
        'Invalid token response from Swiggy: missing access_token or session_token',
        { provider: this.providerName }
      );
    }

    const refreshToken = responseBody['refresh_token'];
    const expiresIn = responseBody['expires_in'];
    const tokenType = responseBody['token_type'];
    const scope = responseBody['scope'];

    // Swiggy may return expires_in as string
    let expiresInNum: number;
    if (typeof expiresIn === 'number') {
      expiresInNum = expiresIn;
    } else if (typeof expiresIn === 'string') {
      expiresInNum = parseInt(expiresIn, 10);
    } else {
      // Default to 24 hours for Swiggy sessions
      expiresInNum = 86400;
    }

    if (isNaN(expiresInNum) || expiresInNum <= 0) {
      expiresInNum = 86400;
    }

    return {
      accessToken: String(accessToken),
      refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
      expiresIn: expiresInNum,
      tokenType: typeof tokenType === 'string' ? tokenType : 'Bearer',
      scope: typeof scope === 'string' ? scope : this.config.scopes.join(' '),
    };
  }

  /**
   * Parse Swiggy-specific error responses.
   */
  parseErrorResponse(statusCode: number, responseBody: string): string {
    try {
      const parsed = JSON.parse(responseBody) as Record<string, unknown>;

      // Swiggy may use 'statusMessage' or 'message' for errors
      const message =
        parsed['error_description'] ??
        parsed['statusMessage'] ??
        parsed['message'] ??
        parsed['error'];

      if (typeof message === 'string') {
        return `Swiggy OAuth error (${statusCode}): ${message}`;
      }
    } catch {
      // Not JSON
    }

    return `Swiggy OAuth error (${statusCode}): ${responseBody.substring(0, 200)}`;
  }
}
