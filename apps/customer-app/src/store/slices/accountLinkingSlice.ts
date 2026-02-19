/**
 * Account Linking Redux Slice
 * Manages state for platform account linking (Swiggy/Zomato).
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import {
  accountLinkingService,
} from '../../services/account-linking.service';
import type {
  LinkedAccount,
  PlatformType,
  InitiateAuthResponse,
  OAuthCallbackResponse,
  OAuthCallbackParams,
  UnlinkAccountResponse,
} from '../../services/account-linking.service';

// ==================== State Interface ====================

export interface AccountLinkingState {
  accounts: LinkedAccount[];
  loading: boolean;
  error: string | null;
  oauthInProgress: PlatformType | null;
  oauthUrl: string | null;
  oauthState: string | null;
  unlinkingPlatform: PlatformType | null;
  lastFetchedAt: string | null;
}

const initialState: AccountLinkingState = {
  accounts: [],
  loading: false,
  error: null,
  oauthInProgress: null,
  oauthUrl: null,
  oauthState: null,
  unlinkingPlatform: null,
  lastFetchedAt: null,
};

// ==================== Async Thunks ====================

export const fetchLinkedAccounts = createAsyncThunk(
  'accountLinking/fetchLinkedAccounts',
  async (_: void, { rejectWithValue }) => {
    try {
      const response = await accountLinkingService.getLinkedAccounts();
      return response.accounts;
    } catch (err) {
      const error = err as Error;
      return rejectWithValue(error.message || 'Failed to fetch linked accounts');
    }
  }
);

export const initiateOAuth = createAsyncThunk(
  'accountLinking/initiateOAuth',
  async (platform: PlatformType, { rejectWithValue }) => {
    try {
      let response: InitiateAuthResponse;
      if (platform === 'swiggy') {
        response = await accountLinkingService.initiateSwiggyAuth();
      } else {
        response = await accountLinkingService.initiateZomatoAuth();
      }
      return { platform, ...response };
    } catch (err) {
      const error = err as Error;
      return rejectWithValue(error.message || `Failed to initiate ${platform} OAuth`);
    }
  }
);

export const handleOAuthCallback = createAsyncThunk(
  'accountLinking/handleOAuthCallback',
  async (params: OAuthCallbackParams, { rejectWithValue }) => {
    try {
      const response: OAuthCallbackResponse =
        await accountLinkingService.handleOAuthCallback(params);
      return response;
    } catch (err) {
      const error = err as Error;
      return rejectWithValue(error.message || 'OAuth callback failed');
    }
  }
);

export const unlinkAccount = createAsyncThunk(
  'accountLinking/unlinkAccount',
  async (platform: PlatformType, { rejectWithValue }) => {
    try {
      const response: UnlinkAccountResponse =
        await accountLinkingService.unlinkAccount(platform);
      return response;
    } catch (err) {
      const error = err as Error;
      return rejectWithValue(error.message || `Failed to unlink ${platform} account`);
    }
  }
);

// ==================== Slice ====================

const accountLinkingSlice = createSlice({
  name: 'accountLinking',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearOAuthState: (state) => {
      state.oauthInProgress = null;
      state.oauthUrl = null;
      state.oauthState = null;
    },
    setOAuthInProgress: (state, action: PayloadAction<PlatformType | null>) => {
      state.oauthInProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch linked accounts
    builder
      .addCase(fetchLinkedAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLinkedAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.accounts = action.payload;
        state.lastFetchedAt = new Date().toISOString();
      })
      .addCase(fetchLinkedAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'Failed to fetch linked accounts';
      });

    // Initiate OAuth
    builder
      .addCase(initiateOAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateOAuth.fulfilled, (state, action) => {
        state.loading = false;
        state.oauthInProgress = action.payload.platform;
        state.oauthUrl = action.payload.authUrl;
        state.oauthState = action.payload.state;
      })
      .addCase(initiateOAuth.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'OAuth initiation failed';
        state.oauthInProgress = null;
      });

    // OAuth callback
    builder
      .addCase(handleOAuthCallback.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(handleOAuthCallback.fulfilled, (state, action) => {
        state.loading = false;
        state.oauthInProgress = null;
        state.oauthUrl = null;
        state.oauthState = null;
        // Update the account status optimistically
        const existingIndex = state.accounts.findIndex(
          (a) => a.platform === action.payload.platform
        );
        const linkedAccount: LinkedAccount = {
          platform: action.payload.platform,
          status: 'linked',
          linkedAt: new Date().toISOString(),
          lastUsed: null,
          displayName: null,
          expiresAt: null,
        };
        if (existingIndex >= 0) {
          state.accounts[existingIndex] = linkedAccount;
        } else {
          state.accounts.push(linkedAccount);
        }
      })
      .addCase(handleOAuthCallback.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || 'OAuth callback failed';
        state.oauthInProgress = null;
        state.oauthUrl = null;
        state.oauthState = null;
      });

    // Unlink account
    builder
      .addCase(unlinkAccount.pending, (state, action) => {
        state.unlinkingPlatform = action.meta.arg;
        state.error = null;
      })
      .addCase(unlinkAccount.fulfilled, (state, action) => {
        state.unlinkingPlatform = null;
        const existingIndex = state.accounts.findIndex(
          (a) => a.platform === action.payload.platform
        );
        if (existingIndex >= 0) {
          state.accounts[existingIndex] = {
            ...state.accounts[existingIndex],
            status: 'not_linked',
            linkedAt: null,
            lastUsed: null,
            displayName: null,
            expiresAt: null,
          };
        }
      })
      .addCase(unlinkAccount.rejected, (state, action) => {
        state.unlinkingPlatform = null;
        state.error = (action.payload as string) || 'Failed to unlink account';
      });
  },
});

export const { clearError, clearOAuthState, setOAuthInProgress } =
  accountLinkingSlice.actions;

export default accountLinkingSlice.reducer;
