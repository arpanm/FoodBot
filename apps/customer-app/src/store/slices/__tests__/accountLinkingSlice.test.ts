/**
 * Account Linking Redux Slice Tests
 * Tests for state management, async thunks, and reducers.
 */

import { configureStore } from '@reduxjs/toolkit';

import { accountLinkingService } from '../../../services/account-linking.service';
import type { LinkedAccount } from '../../../services/account-linking.service';
import accountLinkingReducer, {
  clearError,
  clearOAuthState,
  setOAuthInProgress,
  fetchLinkedAccounts,
  initiateOAuth,
  handleOAuthCallback,
  unlinkAccount,
} from '../accountLinkingSlice';
import type { AccountLinkingState } from '../accountLinkingSlice';

// Mock the service
jest.mock('../../../services/account-linking.service', () => ({
  accountLinkingService: {
    getLinkedAccounts: jest.fn(),
    initiateSwiggyAuth: jest.fn(),
    initiateZomatoAuth: jest.fn(),
    handleOAuthCallback: jest.fn(),
    unlinkAccount: jest.fn(),
  },
}));

const mockService = accountLinkingService as jest.Mocked<typeof accountLinkingService>;

function createTestStore(preloadedState?: Partial<AccountLinkingState>) {
  return configureStore({
    reducer: { accountLinking: accountLinkingReducer },
    preloadedState: preloadedState
      ? { accountLinking: { ...getInitialState(), ...preloadedState } }
      : undefined,
  });
}

function getInitialState(): AccountLinkingState {
  return {
    accounts: [],
    loading: false,
    error: null,
    oauthInProgress: null,
    oauthUrl: null,
    oauthState: null,
    unlinkingPlatform: null,
    lastFetchedAt: null,
  };
}

describe('accountLinkingSlice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = createTestStore();
      const state = store.getState().accountLinking;

      expect(state.accounts).toEqual([]);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.oauthInProgress).toBeNull();
      expect(state.oauthUrl).toBeNull();
      expect(state.oauthState).toBeNull();
      expect(state.unlinkingPlatform).toBeNull();
      expect(state.lastFetchedAt).toBeNull();
    });
  });

  describe('Synchronous Reducers', () => {
    it('should clear error', () => {
      const store = createTestStore({ error: 'Something went wrong' });

      store.dispatch(clearError());

      expect(store.getState().accountLinking.error).toBeNull();
    });

    it('should clear OAuth state', () => {
      const store = createTestStore({
        oauthInProgress: 'swiggy',
        oauthUrl: 'https://swiggy.com/oauth',
        oauthState: 'state-123',
      });

      store.dispatch(clearOAuthState());

      const state = store.getState().accountLinking;
      expect(state.oauthInProgress).toBeNull();
      expect(state.oauthUrl).toBeNull();
      expect(state.oauthState).toBeNull();
    });

    it('should set OAuth in progress', () => {
      const store = createTestStore();

      store.dispatch(setOAuthInProgress('zomato'));

      expect(store.getState().accountLinking.oauthInProgress).toBe('zomato');
    });

    it('should set OAuth in progress to null', () => {
      const store = createTestStore({ oauthInProgress: 'swiggy' });

      store.dispatch(setOAuthInProgress(null));

      expect(store.getState().accountLinking.oauthInProgress).toBeNull();
    });
  });

  describe('fetchLinkedAccounts', () => {
    it('should set loading to true when pending', () => {
      const store = createTestStore();

      // Dispatch pending action directly
      store.dispatch({ type: fetchLinkedAccounts.pending.type });

      expect(store.getState().accountLinking.loading).toBe(true);
      expect(store.getState().accountLinking.error).toBeNull();
    });

    it('should set accounts when fulfilled', async () => {
      const mockAccounts: LinkedAccount[] = [
        {
          platform: 'swiggy',
          status: 'linked',
          linkedAt: '2026-02-10T00:00:00Z',
          lastUsed: '2026-02-19T00:00:00Z',
          displayName: 'test@swiggy.com',
          expiresAt: '2026-02-20T00:00:00Z',
        },
        {
          platform: 'zomato',
          status: 'not_linked',
          linkedAt: null,
          lastUsed: null,
          displayName: null,
          expiresAt: null,
        },
      ];

      mockService.getLinkedAccounts.mockResolvedValue({ accounts: mockAccounts });

      const store = createTestStore();
      await store.dispatch(fetchLinkedAccounts());

      const state = store.getState().accountLinking;
      expect(state.loading).toBe(false);
      expect(state.accounts).toEqual(mockAccounts);
      expect(state.lastFetchedAt).not.toBeNull();
    });

    it('should set error when rejected', async () => {
      mockService.getLinkedAccounts.mockRejectedValue(new Error('Network error'));

      const store = createTestStore();
      await store.dispatch(fetchLinkedAccounts());

      const state = store.getState().accountLinking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });

  describe('initiateOAuth', () => {
    it('should set OAuth URL for Swiggy when fulfilled', async () => {
      mockService.initiateSwiggyAuth.mockResolvedValue({
        authUrl: 'https://swiggy.com/oauth/authorize',
        state: 'csrf-state-123',
      });

      const store = createTestStore();
      await store.dispatch(initiateOAuth('swiggy'));

      const state = store.getState().accountLinking;
      expect(state.loading).toBe(false);
      expect(state.oauthInProgress).toBe('swiggy');
      expect(state.oauthUrl).toBe('https://swiggy.com/oauth/authorize');
      expect(state.oauthState).toBe('csrf-state-123');
    });

    it('should set OAuth URL for Zomato when fulfilled', async () => {
      mockService.initiateZomatoAuth.mockResolvedValue({
        authUrl: 'https://zomato.com/oauth/authorize',
        state: 'csrf-state-456',
      });

      const store = createTestStore();
      await store.dispatch(initiateOAuth('zomato'));

      const state = store.getState().accountLinking;
      expect(state.oauthInProgress).toBe('zomato');
      expect(state.oauthUrl).toBe('https://zomato.com/oauth/authorize');
    });

    it('should set error and clear OAuth state when rejected', async () => {
      mockService.initiateSwiggyAuth.mockRejectedValue(
        new Error('Platform unavailable')
      );

      const store = createTestStore();
      await store.dispatch(initiateOAuth('swiggy'));

      const state = store.getState().accountLinking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Platform unavailable');
      expect(state.oauthInProgress).toBeNull();
    });
  });

  describe('handleOAuthCallback', () => {
    it('should update account status to linked when fulfilled', async () => {
      mockService.handleOAuthCallback.mockResolvedValue({
        success: true,
        platform: 'swiggy',
        message: 'Linked successfully',
      });

      const store = createTestStore({
        oauthInProgress: 'swiggy',
        oauthUrl: 'https://swiggy.com/oauth',
        oauthState: 'state-123',
      });

      await store.dispatch(
        handleOAuthCallback({ code: 'auth-code', state: 'state-123' })
      );

      const state = store.getState().accountLinking;
      expect(state.loading).toBe(false);
      expect(state.oauthInProgress).toBeNull();
      expect(state.oauthUrl).toBeNull();
      expect(state.oauthState).toBeNull();

      const swiggyAccount = state.accounts.find((a) => a.platform === 'swiggy');
      expect(swiggyAccount).toBeDefined();
      expect(swiggyAccount?.status).toBe('linked');
      expect(swiggyAccount?.linkedAt).not.toBeNull();
    });

    it('should update existing account when relinking', async () => {
      mockService.handleOAuthCallback.mockResolvedValue({
        success: true,
        platform: 'swiggy',
        message: 'Relinked successfully',
      });

      const store = createTestStore({
        accounts: [
          {
            platform: 'swiggy',
            status: 'expired',
            linkedAt: '2026-01-01T00:00:00Z',
            lastUsed: null,
            displayName: null,
            expiresAt: null,
          },
        ],
        oauthInProgress: 'swiggy',
      });

      await store.dispatch(
        handleOAuthCallback({ code: 'new-code', state: 'new-state' })
      );

      const state = store.getState().accountLinking;
      expect(state.accounts).toHaveLength(1);
      expect(state.accounts[0].status).toBe('linked');
    });

    it('should clear OAuth state and set error when rejected', async () => {
      mockService.handleOAuthCallback.mockRejectedValue(
        new Error('Invalid state')
      );

      const store = createTestStore({
        oauthInProgress: 'swiggy',
        oauthUrl: 'https://swiggy.com/oauth',
        oauthState: 'state-123',
      });

      await store.dispatch(
        handleOAuthCallback({ code: 'auth-code', state: 'bad-state' })
      );

      const state = store.getState().accountLinking;
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Invalid state');
      expect(state.oauthInProgress).toBeNull();
      expect(state.oauthUrl).toBeNull();
      expect(state.oauthState).toBeNull();
    });
  });

  describe('unlinkAccount', () => {
    it('should set unlinkingPlatform when pending', () => {
      const store = createTestStore();

      store.dispatch({
        type: unlinkAccount.pending.type,
        meta: { arg: 'swiggy' },
      });

      expect(store.getState().accountLinking.unlinkingPlatform).toBe('swiggy');
    });

    it('should update account to not_linked when fulfilled', async () => {
      mockService.unlinkAccount.mockResolvedValue({
        success: true,
        platform: 'swiggy',
        message: 'Unlinked successfully',
      });

      const store = createTestStore({
        accounts: [
          {
            platform: 'swiggy',
            status: 'linked',
            linkedAt: '2026-02-10T00:00:00Z',
            lastUsed: '2026-02-19T00:00:00Z',
            displayName: 'test@swiggy.com',
            expiresAt: '2026-02-20T00:00:00Z',
          },
        ],
      });

      await store.dispatch(unlinkAccount('swiggy'));

      const state = store.getState().accountLinking;
      expect(state.unlinkingPlatform).toBeNull();
      expect(state.accounts[0].status).toBe('not_linked');
      expect(state.accounts[0].linkedAt).toBeNull();
      expect(state.accounts[0].displayName).toBeNull();
    });

    it('should set error and clear unlinkingPlatform when rejected', async () => {
      mockService.unlinkAccount.mockRejectedValue(
        new Error('Unlink failed')
      );

      const store = createTestStore({
        accounts: [
          {
            platform: 'zomato',
            status: 'linked',
            linkedAt: '2026-02-10T00:00:00Z',
            lastUsed: null,
            displayName: null,
            expiresAt: null,
          },
        ],
      });

      await store.dispatch(unlinkAccount('zomato'));

      const state = store.getState().accountLinking;
      expect(state.unlinkingPlatform).toBeNull();
      expect(state.error).toBe('Unlink failed');
      // Account should still be linked since unlink failed
      expect(state.accounts[0].status).toBe('linked');
    });
  });
});
