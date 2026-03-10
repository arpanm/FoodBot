/**
 * Type definitions for the OAuth 2.1 authentication system.
 * Provider-agnostic interfaces for the complete OAuth flow.
 */

import type { ProviderName } from '../types/common.types.js';

/** Supported OAuth provider names for OAuth flow */
export type OAuthProviderName = Extract<ProviderName, 'swiggy' | 'zomato'>;

/** Token store interface for Redis-backed storage */
export interface TokenStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** Distributed lock interface for concurrent refresh prevention */
export interface DistributedLock {
  acquire(key: string, ttlSeconds: number): Promise<boolean>;
  release(key: string): Promise<void>;
}

/** PKCE challenge pair */
export interface PkceChallengePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

/** OAuth authorization parameters */
export interface AuthorizationParams {
  authorizationUrl: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  nonce: string;
  responseType: 'code';
}

/** OAuth authorization result returned to caller */
export interface AuthorizationResult {
  authUrl: string;
  state: string;
  nonce: string;
  expiresAt: number;
}

/** Callback parameters from the authorization server */
export interface CallbackParams {
  code: string;
  state: string;
  provider: OAuthProviderName;
}

/** Raw token response from provider */
export interface ProviderTokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

/** Stored token data (encrypted at rest) */
export interface StoredTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
  scope: string;
  provider: OAuthProviderName;
  userId: string;
  issuedAt: number;
  lastRefreshedAt: number;
  keyVersion: number;
}

/** Token introspection result */
export interface TokenIntrospection {
  active: boolean;
  provider: OAuthProviderName;
  userId: string;
  scope: string;
  expiresAt: number;
  issuedAt: number;
  lastRefreshedAt: number;
  timeUntilExpiry: number;
  needsRefresh: boolean;
}

/** Auth status for a user+provider combination */
export interface AuthStatus {
  authenticated: boolean;
  provider: OAuthProviderName;
  userId: string;
  scope?: string;
  expiresAt?: number;
  lastRefreshedAt?: number;
}

/** OAuth state stored during authorization flow */
export interface OAuthFlowState {
  userId: string;
  provider: OAuthProviderName;
  nonce: string;
  codeVerifier: string;
  createdAt: number;
  expiresAt: number;
}

/** Provider-specific OAuth configuration */
export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  revocationUrl?: string;
  redirectUri: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
}

/** Encryption key with version for rotation support */
export interface VersionedEncryptionKey {
  key: Buffer;
  version: number;
}

/** Encrypted token format: version:iv:authTag:ciphertext */
export interface EncryptedTokenPayload {
  version: number;
  iv: string;
  authTag: string;
  ciphertext: string;
}

/** OAuth provider adapter interface - strategy pattern */
export interface OAuthProviderAdapter {
  readonly providerName: OAuthProviderName;
  /** Returns public config without clientSecret. Use getSecretConfig() for internal operations requiring the secret. */
  getConfig(): Omit<OAuthProviderConfig, 'clientSecret'>;
  /** Returns full config including clientSecret. For internal use only (token exchange, refresh, revocation). */
  getSecretConfig(): OAuthProviderConfig;
  parseTokenResponse(responseBody: Record<string, unknown>): ProviderTokenResponse;
  parseErrorResponse(statusCode: number, responseBody: string): string;
  buildTokenRequestBody(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): URLSearchParams;
  buildRefreshRequestBody(refreshToken: string): URLSearchParams;
  buildRevocationRequestBody?(token: string): URLSearchParams;
  buildAuthorizationUrl(state: string, codeChallenge: string, nonce: string): string;
  executeTokenRequest(url: string, body: URLSearchParams, timeoutMs?: number): Promise<ProviderTokenResponse>;
}

/** Token refresh callback for auto-refresh timer */
export type TokenRefreshCallback = (
  userId: string,
  provider: OAuthProviderName
) => Promise<void>;

/** Configuration for token service */
export interface TokenServiceConfig {
  refreshThresholdMs: number; // Refresh when expiry < this (default: 5 min)
  lockTtlSeconds: number; // Distributed lock TTL (default: 30s)
  maxRefreshRetries: number; // Max retries for refresh (default: 3)
}

/** Configuration for state manager */
export interface StateManagerConfig {
  stateTtlSeconds: number; // State TTL (default: 600 = 10 min)
}

/** Auth controller response types */
export interface InitiateAuthResponse {
  authUrl: string;
  state: string;
  expiresIn: number;
}

export interface CallbackAuthResponse {
  success: boolean;
  provider: OAuthProviderName;
  userId: string;
  message: string;
}

export interface RevokeAuthResponse {
  success: boolean;
  provider: OAuthProviderName;
  userId: string;
  message: string;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  provider: OAuthProviderName;
  userId: string;
  expiresAt?: number;
  scope?: string;
}

/** API error response format */
export interface AuthErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId?: string;
  };
}
