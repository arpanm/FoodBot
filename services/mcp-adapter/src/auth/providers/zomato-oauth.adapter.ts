/**
 * Zomato-specific OAuth adapter.
 * Defines Zomato's OAuth endpoints, scopes, and response parsing.
 */

import type {
  OAuthProviderConfig,
  OAuthProviderName,
  ProviderTokenResponse,
} from '../auth.types.js';
import { TokenExchangeError } from '../auth.errors.js';
import { BaseOAuthAdapter } from './base-oauth.adapter.js';

const ENV_PREFIX = 'ZOMATO_OAUTH';

export class ZomatoOAuthAdapter extends BaseOAuthAdapter {
  readonly providerName: OAuthProviderName = 'zomato';

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
        'https://www.zomato.com/oauth/authorize',
      tokenUrl:
        configOverride?.tokenUrl ??
        process.env[`${ENV_PREFIX}_TOKEN_URL`] ??
        'https://www.zomato.com/oauth/token',
      revocationUrl:
        configOverride?.revocationUrl ??
        process.env[`${ENV_PREFIX}_REVOCATION_URL`] ??
        'https://www.zomato.com/oauth/revoke',
      redirectUri:
        configOverride?.redirectUri ??
        process.env[`${ENV_PREFIX}_REDIRECT_URI`] ??
        'http://localhost:3100/auth/zomato/callback',
      scopes: configOverride?.scopes ?? ['read', 'write'],
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
   * Parse Zomato-specific token response.
   * Zomato follows standard OAuth 2.0 token response format
   * but may include additional fields like 'user_id'.
   */
  parseTokenResponse(responseBody: Record<string, unknown>): ProviderTokenResponse {
    const accessToken = responseBody['access_token'];

    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new TokenExchangeError(
        'Invalid token response from Zomato: missing access_token',
        { provider: this.providerName }
      );
    }

    const refreshToken = responseBody['refresh_token'];
    const expiresIn = responseBody['expires_in'];
    const tokenType = responseBody['token_type'];
    const scope = responseBody['scope'];

    if (typeof expiresIn !== 'number' || expiresIn <= 0) {
      throw new TokenExchangeError(
        'Invalid token response from Zomato: missing or invalid expires_in',
        { provider: this.providerName }
      );
    }

    return {
      accessToken,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
      expiresIn,
      tokenType: typeof tokenType === 'string' ? tokenType : 'Bearer',
      scope: typeof scope === 'string' ? scope : this.config.scopes.join(' '),
    };
  }

  /**
   * Parse Zomato-specific error responses.
   * Zomato errors may include 'status' and 'message' fields.
   */
  parseErrorResponse(statusCode: number, responseBody: string): string {
    try {
      const parsed = JSON.parse(responseBody) as Record<string, unknown>;

      const errorDesc =
        parsed['error_description'] ??
        parsed['message'] ??
        parsed['error'];

      if (typeof errorDesc === 'string') {
        return `Zomato OAuth error (${statusCode}): ${errorDesc}`;
      }
    } catch {
      // Not JSON
    }

    return `Zomato OAuth error (${statusCode}): ${responseBody.substring(0, 200)}`;
  }

  /**
   * Zomato supports token revocation.
   */
  buildRevocationRequestBody(token: string): URLSearchParams {
    const config = this.getSecretConfig();

    return new URLSearchParams({
      token,
      token_type_hint: 'access_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
  }
}
