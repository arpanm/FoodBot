/**
 * Account Linking Service
 * Handles OAuth flows for Swiggy/Zomato account linking.
 * Tokens are NEVER stored in the browser -- they are sent to the backend
 * which encrypts and stores them in Redis.
 */

import { apiClient } from './api/axios.config';

// ==================== Types ====================

export type PlatformType = 'swiggy' | 'zomato';

export type LinkingStatus = 'linked' | 'expired' | 'not_linked';

export interface LinkedAccount {
  platform: PlatformType;
  status: LinkingStatus;
  linkedAt: string | null;
  lastUsed: string | null;
  displayName: string | null;
  expiresAt: string | null;
}

export interface LinkedAccountsResponse {
  accounts: LinkedAccount[];
}

export interface InitiateAuthResponse {
  authUrl: string;
  state: string;
}

export interface OAuthCallbackParams {
  code: string;
  state: string;
}

export interface OAuthCallbackResponse {
  success: boolean;
  platform: PlatformType;
  message: string;
}

export interface UnlinkAccountResponse {
  success: boolean;
  platform: PlatformType;
  message: string;
}

export interface AccountLinkingError {
  code: string;
  message: string;
  platform?: PlatformType;
}

// ==================== Error Codes ====================

export const ACCOUNT_LINKING_ERROR_CODES = {
  OAUTH_STATE_INVALID: 'OAUTH_STATE_INVALID',
  OAUTH_CODE_EXPIRED: 'OAUTH_CODE_EXPIRED',
  PLATFORM_UNAVAILABLE: 'PLATFORM_UNAVAILABLE',
  ACCOUNT_ALREADY_LINKED: 'ACCOUNT_ALREADY_LINKED',
  ACCOUNT_NOT_LINKED: 'ACCOUNT_NOT_LINKED',
  TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// ==================== Service ====================

class AccountLinkingService {
  private readonly basePath = '/platforms';

  /**
   * Initiates OAuth flow for Swiggy account linking.
   * Returns the Swiggy OAuth URL to redirect the user to.
   */
  async initiateSwiggyAuth(): Promise<InitiateAuthResponse> {
    return this.initiateAuth('swiggy');
  }

  /**
   * Initiates OAuth flow for Zomato account linking.
   * Returns the Zomato OAuth URL to redirect the user to.
   */
  async initiateZomatoAuth(): Promise<InitiateAuthResponse> {
    return this.initiateAuth('zomato');
  }

  /**
   * Generic OAuth initiation for a given platform.
   * The backend generates a CSRF-safe state parameter and returns
   * the platform's OAuth consent URL.
   */
  private async initiateAuth(platform: PlatformType): Promise<InitiateAuthResponse> {
    return apiClient.post<InitiateAuthResponse>(
      `${this.basePath}/link`,
      { platform }
    );
  }

  /**
   * Processes the OAuth callback after the user completes platform login.
   * Sends the authorization code and state to the backend for token exchange.
   * The backend exchanges the code for tokens and stores them encrypted in Redis.
   * Tokens NEVER touch the browser.
   */
  async handleOAuthCallback(params: OAuthCallbackParams): Promise<OAuthCallbackResponse> {
    return apiClient.post<OAuthCallbackResponse>(
      `${this.basePath}/callback`,
      {
        code: params.code,
        state: params.state,
      }
    );
  }

  /**
   * Fetches the current linked accounts status for the logged-in user.
   * Returns status for both Swiggy and Zomato.
   */
  async getLinkedAccounts(): Promise<LinkedAccountsResponse> {
    return apiClient.get<LinkedAccountsResponse>(
      `${this.basePath}/status`
    );
  }

  /**
   * Removes the account link for a given platform.
   * The backend deletes the encrypted tokens from Redis.
   */
  async unlinkAccount(platform: PlatformType): Promise<UnlinkAccountResponse> {
    return apiClient.delete<UnlinkAccountResponse>(
      `${this.basePath}/unlink`,
      { data: { platform } }
    );
  }
}

export const accountLinkingService = new AccountLinkingService();
