/**
 * Typed error classes for the OAuth 2.1 authentication system.
 * Each error includes a code, technical message, and user-friendly message.
 */

export enum OAuthErrorCode {
  INVALID_STATE = 'OAUTH_INVALID_STATE',
  STATE_EXPIRED = 'OAUTH_STATE_EXPIRED',
  STATE_REPLAY = 'OAUTH_STATE_REPLAY',
  PKCE_VERIFICATION_FAILED = 'OAUTH_PKCE_VERIFICATION_FAILED',
  PKCE_VERIFIER_NOT_FOUND = 'OAUTH_PKCE_VERIFIER_NOT_FOUND',
  TOKEN_EXCHANGE_FAILED = 'OAUTH_TOKEN_EXCHANGE_FAILED',
  TOKEN_REFRESH_FAILED = 'OAUTH_TOKEN_REFRESH_FAILED',
  TOKEN_REVOCATION_FAILED = 'OAUTH_TOKEN_REVOCATION_FAILED',
  TOKEN_NOT_FOUND = 'OAUTH_TOKEN_NOT_FOUND',
  TOKEN_EXPIRED = 'OAUTH_TOKEN_EXPIRED',
  TOKEN_DECRYPTION_FAILED = 'OAUTH_TOKEN_DECRYPTION_FAILED',
  ENCRYPTION_FAILED = 'OAUTH_ENCRYPTION_FAILED',
  PROVIDER_NOT_CONFIGURED = 'OAUTH_PROVIDER_NOT_CONFIGURED',
  PROVIDER_ERROR = 'OAUTH_PROVIDER_ERROR',
  CONCURRENT_REFRESH = 'OAUTH_CONCURRENT_REFRESH',
  LOCK_ACQUISITION_FAILED = 'OAUTH_LOCK_ACQUISITION_FAILED',
  CALLBACK_ERROR = 'OAUTH_CALLBACK_ERROR',
  MISSING_AUTHORIZATION_CODE = 'OAUTH_MISSING_AUTHORIZATION_CODE',
  INVALID_PROVIDER = 'OAUTH_INVALID_PROVIDER',
}

export class OAuthError extends Error {
  public readonly code: OAuthErrorCode;
  public readonly userMessage: string;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    code: OAuthErrorCode,
    technicalMessage: string,
    userMessage: string,
    context: Record<string, unknown> = {}
  ) {
    super(technicalMessage);
    this.name = 'OAuthError';
    this.code = code;
    this.userMessage = userMessage;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class InvalidStateError extends OAuthError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.INVALID_STATE,
      'Invalid or missing OAuth state parameter.',
      'Authentication failed. Please try again.',
      context
    );
    this.name = 'InvalidStateError';
  }
}

export class StateExpiredError extends OAuthError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.STATE_EXPIRED,
      'OAuth state parameter has expired.',
      'Your authentication session has expired. Please try again.',
      context
    );
    this.name = 'StateExpiredError';
  }
}

export class StateReplayError extends OAuthError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.STATE_REPLAY,
      'OAuth state parameter has already been used (replay attack detected).',
      'Authentication failed due to a security check. Please try again.',
      context
    );
    this.name = 'StateReplayError';
  }
}

export class PkceVerificationError extends OAuthError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.PKCE_VERIFICATION_FAILED,
      'PKCE code verifier does not match the code challenge.',
      'Authentication verification failed. Please try again.',
      context
    );
    this.name = 'PkceVerificationError';
  }
}

export class PkceVerifierNotFoundError extends OAuthError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.PKCE_VERIFIER_NOT_FOUND,
      'PKCE code verifier not found in store (may have expired).',
      'Your authentication session has expired. Please try again.',
      context
    );
    this.name = 'PkceVerifierNotFoundError';
  }
}

export class TokenExchangeError extends OAuthError {
  constructor(technicalMessage: string, context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.TOKEN_EXCHANGE_FAILED,
      technicalMessage,
      'Failed to complete authentication with the provider. Please try again.',
      context
    );
    this.name = 'TokenExchangeError';
  }
}

export class TokenRefreshError extends OAuthError {
  constructor(technicalMessage: string, context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.TOKEN_REFRESH_FAILED,
      technicalMessage,
      'Your session has expired. Please re-authenticate.',
      context
    );
    this.name = 'TokenRefreshError';
  }
}

export class TokenRevocationError extends OAuthError {
  constructor(technicalMessage: string, context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.TOKEN_REVOCATION_FAILED,
      technicalMessage,
      'Failed to disconnect the provider. Please try again.',
      context
    );
    this.name = 'TokenRevocationError';
  }
}

export class TokenNotFoundError extends OAuthError {
  constructor(userId: string, provider: string) {
    super(
      OAuthErrorCode.TOKEN_NOT_FOUND,
      `No token found for user "${userId}" and provider "${provider}".`,
      'You have not connected this provider. Please authenticate first.',
      { userId, provider }
    );
    this.name = 'TokenNotFoundError';
  }
}

export class TokenExpiredError extends OAuthError {
  constructor(userId: string, provider: string) {
    super(
      OAuthErrorCode.TOKEN_EXPIRED,
      `Token expired for user "${userId}" and provider "${provider}".`,
      'Your session has expired. Please re-authenticate.',
      { userId, provider }
    );
    this.name = 'TokenExpiredError';
  }
}

export class TokenDecryptionError extends OAuthError {
  constructor(context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.TOKEN_DECRYPTION_FAILED,
      'Failed to decrypt stored token.',
      'An internal error occurred. Please re-authenticate.',
      context
    );
    this.name = 'TokenDecryptionError';
  }
}

export class EncryptionError extends OAuthError {
  constructor(technicalMessage: string, context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.ENCRYPTION_FAILED,
      technicalMessage,
      'An internal error occurred. Please try again.',
      context
    );
    this.name = 'EncryptionError';
  }
}

export class ProviderNotConfiguredError extends OAuthError {
  constructor(provider: string) {
    super(
      OAuthErrorCode.PROVIDER_NOT_CONFIGURED,
      `OAuth provider "${provider}" is not configured.`,
      'This authentication provider is not available.',
      { provider }
    );
    this.name = 'ProviderNotConfiguredError';
  }
}

export class ProviderOAuthError extends OAuthError {
  constructor(provider: string, technicalMessage: string, context: Record<string, unknown> = {}) {
    super(
      OAuthErrorCode.PROVIDER_ERROR,
      `Provider "${provider}" error: ${technicalMessage}`,
      'The provider reported an error. Please try again.',
      { provider, ...context }
    );
    this.name = 'ProviderOAuthError';
  }
}

export class ConcurrentRefreshError extends OAuthError {
  constructor(userId: string, provider: string) {
    super(
      OAuthErrorCode.CONCURRENT_REFRESH,
      `Concurrent token refresh detected for user "${userId}" and provider "${provider}".`,
      'Please wait a moment and try again.',
      { userId, provider }
    );
    this.name = 'ConcurrentRefreshError';
  }
}

export class LockAcquisitionError extends OAuthError {
  constructor(lockKey: string) {
    super(
      OAuthErrorCode.LOCK_ACQUISITION_FAILED,
      `Failed to acquire distributed lock: "${lockKey}".`,
      'The system is temporarily busy. Please try again.',
      { lockKey }
    );
    this.name = 'LockAcquisitionError';
  }
}

export class InvalidProviderError extends OAuthError {
  constructor(provider: string) {
    super(
      OAuthErrorCode.INVALID_PROVIDER,
      `Invalid provider: "${provider}".`,
      'The specified provider is not supported.',
      { provider }
    );
    this.name = 'InvalidProviderError';
  }
}

export class MissingAuthorizationCodeError extends OAuthError {
  constructor() {
    super(
      OAuthErrorCode.MISSING_AUTHORIZATION_CODE,
      'Authorization code is missing from callback.',
      'Authentication failed. No authorization code was provided.',
      {}
    );
    this.name = 'MissingAuthorizationCodeError';
  }
}
