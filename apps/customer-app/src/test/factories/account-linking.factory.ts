/**
 * Test data factory for account linking
 */

import type {
  LinkedAccount,
  PlatformType,
  LinkingStatus,
  InitiateAuthResponse,
  OAuthCallbackResponse,
  UnlinkAccountResponse,
  LinkedAccountsResponse,
} from '../../services/account-linking.service';

// ==================== LinkedAccount Factory ====================

/**
 * Generates a mock linked account
 */
export function mockLinkedAccount(
  overrides: Partial<LinkedAccount> = {}
): LinkedAccount {
  return {
    platform: 'swiggy',
    status: 'linked',
    linkedAt: '2026-02-10T00:00:00Z',
    lastUsed: '2026-02-19T10:00:00Z',
    displayName: 'testuser@example.com',
    expiresAt: '2026-02-20T00:00:00Z',
    ...overrides,
  };
}

/**
 * Generates a mock unlinked account
 */
export function mockUnlinkedAccount(
  platform: PlatformType = 'swiggy'
): LinkedAccount {
  return {
    platform,
    status: 'not_linked',
    linkedAt: null,
    lastUsed: null,
    displayName: null,
    expiresAt: null,
  };
}

/**
 * Generates a mock expired account
 */
export function mockExpiredAccount(
  platform: PlatformType = 'swiggy'
): LinkedAccount {
  return {
    platform,
    status: 'expired',
    linkedAt: '2026-01-01T00:00:00Z',
    lastUsed: '2026-01-15T00:00:00Z',
    displayName: 'testuser@example.com',
    expiresAt: '2026-01-02T00:00:00Z',
  };
}

/**
 * Generates mock accounts for both platforms
 */
export function mockBothAccounts(
  swiggyStatus: LinkingStatus = 'linked',
  zomatoStatus: LinkingStatus = 'not_linked'
): LinkedAccount[] {
  return [
    mockLinkedAccount({
      platform: 'swiggy',
      status: swiggyStatus,
      ...(swiggyStatus === 'not_linked' ? {
        linkedAt: null,
        lastUsed: null,
        displayName: null,
        expiresAt: null,
      } : {}),
    }),
    mockLinkedAccount({
      platform: 'zomato',
      status: zomatoStatus,
      ...(zomatoStatus === 'not_linked' ? {
        linkedAt: null,
        lastUsed: null,
        displayName: null,
        expiresAt: null,
      } : {}),
    }),
  ];
}

// ==================== API Response Factories ====================

/**
 * Generates a mock LinkedAccountsResponse
 */
export function mockLinkedAccountsResponse(
  accounts?: LinkedAccount[]
): LinkedAccountsResponse {
  return {
    accounts: accounts || mockBothAccounts(),
  };
}

/**
 * Generates a mock InitiateAuthResponse
 */
export function mockInitiateAuthResponse(
  overrides: Partial<InitiateAuthResponse> = {}
): InitiateAuthResponse {
  return {
    authUrl: 'https://platform.example.com/oauth/authorize?client_id=foodbot&state=mock-state',
    state: 'mock-state-csrf-token',
    ...overrides,
  };
}

/**
 * Generates a mock OAuthCallbackResponse
 */
export function mockOAuthCallbackResponse(
  overrides: Partial<OAuthCallbackResponse> = {}
): OAuthCallbackResponse {
  return {
    success: true,
    platform: 'swiggy',
    message: 'Account linked successfully',
    ...overrides,
  };
}

/**
 * Generates a mock UnlinkAccountResponse
 */
export function mockUnlinkAccountResponse(
  overrides: Partial<UnlinkAccountResponse> = {}
): UnlinkAccountResponse {
  return {
    success: true,
    platform: 'swiggy',
    message: 'Account unlinked successfully',
    ...overrides,
  };
}
