/**
 * OAuth 2.1 Service - Full flow orchestrator.
 *
 * Coordinates the complete OAuth 2.1 Authorization Code Flow with PKCE:
 * 1. Initiate: Generate auth URL with state, nonce, PKCE challenge
 * 2. Callback: Validate state, exchange code for tokens with PKCE verifier
 * 3. Token usage: Get valid tokens (auto-refresh if near expiry)
 * 4. Refresh: Explicit token refresh
 * 5. Revoke: Revoke tokens and clean up
 *
 * Provider-agnostic via strategy pattern (OAuthProviderAdapter).
 */

import type {
  OAuthProviderName,
  OAuthProviderAdapter,
  AuthorizationResult,
  CallbackParams,
  ProviderTokenResponse,
  TokenIntrospection,
  AuthStatus,
  TokenStore,
  DistributedLock,
} from './auth.types.js';
import { PkceManager } from './pkce-manager.js';
import { StateManager } from './state-manager.js';
import { TokenService } from './token.service.js';
import { TokenEncryptor } from './token-encryptor.js';
import {
  ProviderNotConfiguredError,
  MissingAuthorizationCodeError,
  InvalidStateError,
  TokenExchangeError,
  OAuthError,
} from './auth.errors.js';

export interface OAuthServiceConfig {
  /** Encryption key for tokens (hex string) */
  encryptionKeyHex: string;
  /** Encryption key version */
  encryptionKeyVersion: number;
  /** Previous encryption keys for rotation */
  previousKeys?: Array<{ keyHex: string; version: number }>;
  /** State TTL in seconds (default 600 = 10 min) */
  stateTtlSeconds?: number;
  /** PKCE verifier length (default 64) */
  pkceVerifierLength?: number;
  /** Token refresh threshold in ms (default 5 min) */
  refreshThresholdMs?: number;
}

export class OAuthService {
  private readonly adapters: Map<OAuthProviderName, OAuthProviderAdapter>;
  private readonly pkceManager: PkceManager;
  private readonly stateManager: StateManager;
  private readonly tokenService: TokenService;

  constructor(
    store: TokenStore,
    lock: DistributedLock,
    config: OAuthServiceConfig
  ) {
    this.adapters = new Map();

    const encryptor = new TokenEncryptor({
      primaryKeyHex: config.encryptionKeyHex,
      primaryKeyVersion: config.encryptionKeyVersion,
      previousKeys: config.previousKeys,
    });

    this.pkceManager = new PkceManager(store, {
      verifierLength: config.pkceVerifierLength,
      ttlSeconds: config.stateTtlSeconds,
    });

    this.stateManager = new StateManager(store, {
      stateTtlSeconds: config.stateTtlSeconds,
    });

    this.tokenService = new TokenService(store, lock, encryptor, {
      refreshThresholdMs: config.refreshThresholdMs,
    });
  }

  /**
   * Register an OAuth provider adapter.
   */
  registerProvider(adapter: OAuthProviderAdapter): void {
    this.adapters.set(adapter.providerName, adapter);
    this.tokenService.registerAdapter(adapter);
  }

  /**
   * STEP 1: Initiate OAuth flow.
   * Generates authorization URL with state, nonce, and PKCE challenge.
   */
  async initiateAuthorization(
    userId: string,
    provider: OAuthProviderName
  ): Promise<AuthorizationResult> {
    const adapter = this.getAdapter(provider);
    const nonce = StateManager.generateNonce();

    // Generate PKCE challenge pair
    const pkce = this.pkceManager.generateChallengePair();

    // Generate and store state (includes PKCE verifier for callback)
    const state = await this.stateManager.generateState(
      userId,
      provider,
      nonce,
      pkce.codeVerifier
    );

    // Store PKCE verifier separately for additional validation
    await this.pkceManager.storeVerifier(state, pkce.codeVerifier);

    // Build authorization URL
    const authUrl = adapter.buildAuthorizationUrl(state, pkce.codeChallenge, nonce);

    const stateTtlMs = 600 * 1000; // 10 minutes
    return {
      authUrl,
      state,
      nonce,
      expiresAt: Date.now() + stateTtlMs,
    };
  }

  /**
   * STEP 2: Handle OAuth callback.
   * Validates state, exchanges code for tokens, stores encrypted tokens.
   */
  async handleCallback(params: CallbackParams): Promise<ProviderTokenResponse> {
    const { code, state, provider } = params;

    if (!code) {
      throw new MissingAuthorizationCodeError();
    }

    const adapter = this.getAdapter(provider);

    // Validate state (also retrieves flow state and deletes to prevent replay)
    const flowState = await this.stateManager.validateState(state);

    if (flowState.provider !== provider) {
      throw new InvalidStateError({
        reason: 'provider_mismatch',
        expected: flowState.provider,
        actual: provider,
      });
    }

    // Retrieve PKCE verifier
    const codeVerifier = flowState.codeVerifier;

    // Exchange authorization code for tokens
    const config = adapter.getConfig();
    const tokenRequestBody = adapter.buildTokenRequestBody(
      code,
      codeVerifier,
      config.redirectUri
    );

    let tokenResponse: ProviderTokenResponse;

    try {
      tokenResponse = await adapter.executeTokenRequest(
        config.tokenUrl,
        tokenRequestBody
      );
    } catch (error) {
      if (error instanceof OAuthError) {
        throw error;
      }
      throw new TokenExchangeError(
        `Token exchange failed for ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { provider }
      );
    }

    // Store encrypted tokens
    await this.tokenService.storeTokens(
      flowState.userId,
      provider,
      tokenResponse
    );

    return tokenResponse;
  }

  /**
   * STEP 3: Get a valid access token for API calls.
   * Automatically refreshes if the token is near expiry.
   */
  async getValidToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<string> {
    return this.tokenService.getValidToken(userId, provider);
  }

  /**
   * STEP 4: Explicitly refresh a token.
   */
  async refreshToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<void> {
    await this.tokenService.refreshToken(userId, provider);
  }

  /**
   * STEP 5: Revoke tokens for a user+provider.
   * Optionally calls the provider's revocation endpoint.
   */
  async revokeTokens(
    userId: string,
    provider: OAuthProviderName
  ): Promise<void> {
    const adapter = this.adapters.get(provider);

    // Try to revoke at provider level first
    if (adapter) {
      const config = adapter.getConfig();
      if (config.revocationUrl && adapter.buildRevocationRequestBody) {
        try {
          const tokenData = await this.tokenService.getStoredToken(userId, provider);
          if (tokenData) {
            const body = adapter.buildRevocationRequestBody(tokenData.accessToken);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            await fetch(config.revocationUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);
          }
        } catch {
          // Provider revocation failure should not prevent local cleanup
        }
      }
    }

    // Always clean up locally
    await this.tokenService.revokeTokens(userId, provider);
  }

  /**
   * Introspect a token to get its current status.
   */
  async introspectToken(
    userId: string,
    provider: OAuthProviderName
  ): Promise<TokenIntrospection> {
    return this.tokenService.introspectToken(userId, provider);
  }

  /**
   * Check authentication status for a user+provider.
   */
  async getAuthStatus(
    userId: string,
    provider: OAuthProviderName
  ): Promise<AuthStatus> {
    const introspection = await this.tokenService.introspectToken(userId, provider);

    return {
      authenticated: introspection.active,
      provider,
      userId,
      scope: introspection.active ? introspection.scope : undefined,
      expiresAt: introspection.active ? introspection.expiresAt : undefined,
      lastRefreshedAt: introspection.active ? introspection.lastRefreshedAt : undefined,
    };
  }

  /**
   * Clean up resources (timers, etc.) on shutdown.
   */
  shutdown(): void {
    this.tokenService.clearAllTimers();
  }

  /**
   * Get a registered adapter or throw ProviderNotConfiguredError.
   */
  private getAdapter(provider: OAuthProviderName): OAuthProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new ProviderNotConfiguredError(provider);
    }
    return adapter;
  }
}
