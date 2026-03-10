/**
 * Auth Controller - REST endpoints for OAuth 2.1 authentication.
 *
 * Endpoints:
 *   GET  /auth/:provider/initiate - Generate auth URL, redirect user
 *   GET  /auth/:provider/callback - Handle OAuth callback, store tokens
 *   POST /auth/:provider/revoke   - Revoke tokens
 *   GET  /auth/:provider/status   - Check auth status for user+provider
 */

import type { IncomingMessage, ServerResponse } from 'http';
import type {
  OAuthProviderName,
  InitiateAuthResponse,
  CallbackAuthResponse,
  RevokeAuthResponse,
  AuthStatusResponse,
  AuthErrorResponse,
} from './auth.types.js';
import type { OAuthService } from './oauth.service.js';
import { OAuthError, OAuthErrorCode, InvalidProviderError } from './auth.errors.js';

const VALID_PROVIDERS: ReadonlySet<string> = new Set(['swiggy', 'zomato']);

/**
 * SECURITY: This controller MUST be deployed behind an authentication proxy/middleware.
 * All endpoints that require user identity rely on the `x-authenticated-user-id` header,
 * which MUST be set by an upstream authentication proxy (e.g., API gateway, auth middleware).
 * Direct exposure of this controller to untrusted clients is FORBIDDEN.
 */
export class AuthController {
  private readonly oauthService: OAuthService;

  constructor(oauthService: OAuthService) {
    this.oauthService = oauthService;
  }

  /**
   * Extract and validate the authenticated user ID from the upstream auth proxy header.
   * Throws if the header is missing, indicating the request was not authenticated.
   */
  private getAuthenticatedUserId(req: IncomingMessage): string {
    const userId = req.headers['x-authenticated-user-id'] as string | undefined;
    if (!userId) {
      throw new Error('UNAUTHENTICATED');
    }
    return userId;
  }

  /**
   * Route incoming requests to the appropriate handler.
   * Returns true if the request was handled, false otherwise.
   */
  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    method: string
  ): Promise<boolean> {
    // Match /auth/:provider/initiate
    const initiateMatch = pathname.match(/^\/auth\/([^/]+)\/initiate$/);
    if (initiateMatch && method === 'GET') {
      const provider = initiateMatch[1];
      if (!provider) {
        this.sendError(res, 400, OAuthErrorCode.INVALID_PROVIDER, 'Provider is required.');
        return true;
      }
      await this.handleInitiate(req, res, provider);
      return true;
    }

    // Match /auth/:provider/callback
    const callbackMatch = pathname.match(/^\/auth\/([^/]+)\/callback$/);
    if (callbackMatch && method === 'GET') {
      const provider = callbackMatch[1];
      if (!provider) {
        this.sendError(res, 400, OAuthErrorCode.INVALID_PROVIDER, 'Provider is required.');
        return true;
      }
      await this.handleCallback(req, res, provider);
      return true;
    }

    // Match /auth/:provider/revoke
    const revokeMatch = pathname.match(/^\/auth\/([^/]+)\/revoke$/);
    if (revokeMatch && method === 'POST') {
      const provider = revokeMatch[1];
      if (!provider) {
        this.sendError(res, 400, OAuthErrorCode.INVALID_PROVIDER, 'Provider is required.');
        return true;
      }
      await this.handleRevoke(req, res, provider);
      return true;
    }

    // Match /auth/:provider/status
    const statusMatch = pathname.match(/^\/auth\/([^/]+)\/status$/);
    if (statusMatch && method === 'GET') {
      const provider = statusMatch[1];
      if (!provider) {
        this.sendError(res, 400, OAuthErrorCode.INVALID_PROVIDER, 'Provider is required.');
        return true;
      }
      await this.handleStatus(req, res, provider);
      return true;
    }

    return false;
  }

  /**
   * GET /auth/:provider/initiate
   * Requires: x-authenticated-user-id header (set by upstream auth proxy)
   */
  private async handleInitiate(
    req: IncomingMessage,
    res: ServerResponse,
    providerParam: string
  ): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const provider = this.validateProvider(providerParam);

      const result = await this.oauthService.initiateAuthorization(userId, provider);

      const response: InitiateAuthResponse = {
        authUrl: result.authUrl,
        state: result.state,
        expiresIn: Math.floor((result.expiresAt - Date.now()) / 1000),
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * GET /auth/:provider/callback
   * Query params: code (required), state (required)
   */
  private async handleCallback(
    req: IncomingMessage,
    res: ServerResponse,
    providerParam: string
  ): Promise<void> {
    try {
      const provider = this.validateProvider(providerParam);
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const errorParam = url.searchParams.get('error');

      // Handle provider-side errors
      if (errorParam) {
        const errorDescription = url.searchParams.get('error_description') ?? errorParam;
        this.sendError(res, 400, 'PROVIDER_AUTH_ERROR', errorDescription);
        return;
      }

      if (!code || !state) {
        this.sendError(
          res,
          400,
          'MISSING_PARAMS',
          'Both code and state query parameters are required.'
        );
        return;
      }

      const tokenResponse = await this.oauthService.handleCallback({
        code,
        state,
        provider,
      });

      // In a real app, we would extract userId from the flow state.
      // The OAuthService already stored the tokens internally.
      const response: CallbackAuthResponse = {
        success: true,
        provider,
        userId: '', // Populated by the service internally
        message: `Successfully authenticated with ${provider}.`,
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * POST /auth/:provider/revoke
   * Requires: x-authenticated-user-id header (set by upstream auth proxy)
   */
  private async handleRevoke(
    req: IncomingMessage,
    res: ServerResponse,
    providerParam: string
  ): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const provider = this.validateProvider(providerParam);

      await this.oauthService.revokeTokens(userId, provider);

      const response: RevokeAuthResponse = {
        success: true,
        provider,
        userId,
        message: `Successfully revoked ${provider} tokens for user.`,
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * GET /auth/:provider/status
   * Requires: x-authenticated-user-id header (set by upstream auth proxy)
   */
  private async handleStatus(
    req: IncomingMessage,
    res: ServerResponse,
    providerParam: string
  ): Promise<void> {
    try {
      const userId = this.getAuthenticatedUserId(req);
      const provider = this.validateProvider(providerParam);

      const status = await this.oauthService.getAuthStatus(userId, provider);

      const response: AuthStatusResponse = {
        authenticated: status.authenticated,
        provider: status.provider,
        userId: status.userId,
        expiresAt: status.expiresAt,
        scope: status.scope,
      };

      this.sendJson(res, 200, response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Validate that the provider parameter is a supported OAuth provider.
   */
  private validateProvider(provider: string): OAuthProviderName {
    if (!VALID_PROVIDERS.has(provider)) {
      throw new InvalidProviderError(provider);
    }
    return provider as OAuthProviderName;
  }

  /**
   * Parse JSON body from request.
   */
  private parseJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      const MAX_BODY_SIZE = 1024 * 1024; // 1MB
      let totalSize = 0;
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => {
        totalSize += chunk.length;
        if (totalSize > MAX_BODY_SIZE) {
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString('utf8');
          resolve(body ? (JSON.parse(body) as Record<string, unknown>) : {});
        } catch (error) {
          reject(error);
        }
      });
      req.on('error', reject);
    });
  }

  /**
   * Send JSON response.
   */
  private sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  /**
   * Send error response.
   */
  private sendError(
    res: ServerResponse,
    status: number,
    code: string,
    message: string
  ): void {
    const errorResponse: AuthErrorResponse = {
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
      },
    };
    this.sendJson(res, status, errorResponse);
  }

  /**
   * Map errors to HTTP responses.
   */
  private handleError(res: ServerResponse, error: unknown): void {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      this.sendError(res, 401, 'UNAUTHENTICATED', 'Authentication required');
      return;
    }

    if (error instanceof OAuthError) {
      const statusCode = this.mapErrorToStatusCode(error.code);
      this.sendError(res, statusCode, error.code, error.userMessage);
      return;
    }

    this.sendError(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  }

  /**
   * Map OAuth error codes to HTTP status codes.
   */
  private mapErrorToStatusCode(code: OAuthErrorCode): number {
    switch (code) {
      case OAuthErrorCode.INVALID_STATE:
      case OAuthErrorCode.STATE_REPLAY:
      case OAuthErrorCode.PKCE_VERIFICATION_FAILED:
      case OAuthErrorCode.MISSING_AUTHORIZATION_CODE:
      case OAuthErrorCode.INVALID_PROVIDER:
        return 400;

      case OAuthErrorCode.STATE_EXPIRED:
      case OAuthErrorCode.PKCE_VERIFIER_NOT_FOUND:
      case OAuthErrorCode.TOKEN_EXPIRED:
        return 401;

      case OAuthErrorCode.TOKEN_NOT_FOUND:
        return 404;

      case OAuthErrorCode.CONCURRENT_REFRESH:
      case OAuthErrorCode.LOCK_ACQUISITION_FAILED:
        return 409;

      case OAuthErrorCode.PROVIDER_NOT_CONFIGURED:
        return 501;

      case OAuthErrorCode.TOKEN_EXCHANGE_FAILED:
      case OAuthErrorCode.TOKEN_REFRESH_FAILED:
      case OAuthErrorCode.TOKEN_REVOCATION_FAILED:
      case OAuthErrorCode.PROVIDER_ERROR:
        return 502;

      case OAuthErrorCode.TOKEN_DECRYPTION_FAILED:
      case OAuthErrorCode.ENCRYPTION_FAILED:
      case OAuthErrorCode.CALLBACK_ERROR:
      default:
        return 500;
    }
  }
}
