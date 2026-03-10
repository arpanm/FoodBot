/**
 * Base OAuth Provider Adapter with shared logic.
 * Implements the common parts of the OAuthProviderAdapter interface.
 * Provider-specific adapters extend this class.
 */

import type {
  OAuthProviderAdapter,
  OAuthProviderConfig,
  OAuthProviderName,
  ProviderTokenResponse,
} from '../auth.types.js';
import { TokenExchangeError, ProviderOAuthError } from '../auth.errors.js';

export abstract class BaseOAuthAdapter implements OAuthProviderAdapter {
  abstract readonly providerName: OAuthProviderName;

  /** Returns public config without clientSecret. Safe to expose to external callers. */
  abstract getConfig(): Omit<OAuthProviderConfig, 'clientSecret'>;

  /** Returns full config including clientSecret. For internal use only (token exchange, refresh, revocation). */
  abstract getSecretConfig(): OAuthProviderConfig;

  /**
   * Parse a standard OAuth 2.1 token response.
   * Subclasses can override for provider-specific formats.
   */
  parseTokenResponse(responseBody: Record<string, unknown>): ProviderTokenResponse {
    const accessToken = responseBody['access_token'];
    if (typeof accessToken !== 'string' || accessToken.length === 0) {
      throw new TokenExchangeError(
        `Invalid token response from ${this.providerName}: missing or empty access_token`,
        { provider: this.providerName }
      );
    }

    const refreshToken = responseBody['refresh_token'];
    const expiresIn = responseBody['expires_in'];
    const tokenType = responseBody['token_type'];
    const scope = responseBody['scope'];

    if (typeof expiresIn !== 'number' || expiresIn <= 0) {
      throw new TokenExchangeError(
        `Invalid token response from ${this.providerName}: missing or invalid expires_in`,
        { provider: this.providerName }
      );
    }

    return {
      accessToken,
      refreshToken: typeof refreshToken === 'string' ? refreshToken : undefined,
      expiresIn,
      tokenType: typeof tokenType === 'string' ? tokenType : 'Bearer',
      scope: typeof scope === 'string' ? scope : this.getConfig().scopes.join(' '),
    };
  }

  /**
   * Parse an error response from the provider.
   * Subclasses can override for provider-specific error formats.
   */
  parseErrorResponse(statusCode: number, responseBody: string): string {
    try {
      const parsed = JSON.parse(responseBody) as Record<string, unknown>;
      const errorDesc = parsed['error_description'];
      const error = parsed['error'];

      if (typeof errorDesc === 'string') {
        return `${this.providerName} OAuth error (${statusCode}): ${errorDesc}`;
      }
      if (typeof error === 'string') {
        return `${this.providerName} OAuth error (${statusCode}): ${error}`;
      }
    } catch {
      // Not JSON, use raw body
    }

    return `${this.providerName} OAuth error (${statusCode}): ${responseBody.substring(0, 200)}`;
  }

  /**
   * Build the token exchange request body (authorization_code grant).
   * Includes PKCE code_verifier as required by OAuth 2.1.
   */
  buildTokenRequestBody(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): URLSearchParams {
    const config = this.getSecretConfig();

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code_verifier: codeVerifier,
    });

    return params;
  }

  /**
   * Build the refresh token request body.
   */
  buildRefreshRequestBody(refreshToken: string): URLSearchParams {
    const config = this.getSecretConfig();

    return new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
  }

  /**
   * Build the token revocation request body.
   * Optional - not all providers support revocation.
   */
  buildRevocationRequestBody(token: string): URLSearchParams {
    const config = this.getSecretConfig();

    return new URLSearchParams({
      token,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });
  }

  /**
   * Build the full authorization URL with all parameters.
   */
  buildAuthorizationUrl(
    state: string,
    codeChallenge: string,
    nonce: string
  ): string {
    const config = this.getConfig();

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      nonce,
    });

    if (config.additionalParams) {
      for (const [key, value] of Object.entries(config.additionalParams)) {
        params.set(key, value);
      }
    }

    return `${config.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Execute the token exchange HTTP request.
   * Shared implementation with proper error handling and timeout.
   */
  async executeTokenRequest(
    url: string,
    body: URLSearchParams,
    timeoutMs: number = 5000
  ): Promise<ProviderTokenResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = this.parseErrorResponse(response.status, errorText);
        throw new ProviderOAuthError(this.providerName, errorMessage, {
          statusCode: response.status,
          responseBody: errorText.substring(0, 500),
        });
      }

      const data = (await response.json()) as Record<string, unknown>;
      return this.parseTokenResponse(data);
    } catch (error) {
      if (error instanceof ProviderOAuthError || error instanceof TokenExchangeError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new ProviderOAuthError(
        this.providerName,
        `Token request failed: ${message}`,
        { url }
      );
    }
  }
}
