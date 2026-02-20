import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {AuthState, AuthTokens, User} from '../../types';
import {
  initiateOAuth,
  handleOAuthCallback,
  getTokens,
  clearTokens,
} from '../../services/auth/OAuthService';
import {gatewayClient} from '../../services/api/GatewayClient';

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  tokens: null,
  loading: false,
  error: null,
};

// ============================================================================
// Async Thunks
// ============================================================================

export const loginWithOAuth = createAsyncThunk(
  'auth/loginWithOAuth',
  async (provider: 'google' | 'facebook' | 'apple', {rejectWithValue}) => {
    const result = await initiateOAuth(provider);
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return undefined;
  },
);

export const completeOAuthCallback = createAsyncThunk(
  'auth/completeOAuthCallback',
  async (
    {code, state}: {code: string; state: string},
    {rejectWithValue, dispatch},
  ) => {
    const result = await handleOAuthCallback(code, state);
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }

    // Fetch user profile after successful authentication
    await dispatch(fetchUserProfile());

    return result.data;
  },
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, {rejectWithValue}) => {
    const result = await gatewayClient.getCurrentUser();
    if (!result.success) {
      return rejectWithValue(result.error.message);
    }
    return result.data as User;
  },
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await clearTokens();
});

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, {rejectWithValue, dispatch}) => {
    const tokens = await getTokens();
    if (!tokens) {
      return rejectWithValue('No stored tokens found');
    }

    // Check if tokens are expired
    if (Date.now() >= tokens.expiresAt) {
      await clearTokens();
      return rejectWithValue('Tokens expired');
    }

    // Fetch user profile to validate tokens
    await dispatch(fetchUserProfile());

    return tokens;
  },
);

// ============================================================================
// Slice
// ============================================================================

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setTokens: (state, action: PayloadAction<AuthTokens>) => {
      state.tokens = action.payload;
      state.isAuthenticated = true;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Login with OAuth
    builder.addCase(loginWithOAuth.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginWithOAuth.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(loginWithOAuth.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Complete OAuth callback
    builder.addCase(completeOAuthCallback.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(completeOAuthCallback.fulfilled, (state, action) => {
      state.loading = false;
      state.tokens = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(completeOAuthCallback.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
      state.isAuthenticated = false;
    });

    // Fetch user profile
    builder.addCase(fetchUserProfile.fulfilled, (state, action) => {
      state.user = action.payload;
    });
    builder.addCase(fetchUserProfile.rejected, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.tokens = null;
      state.error = null;
    });

    // Restore session
    builder.addCase(restoreSession.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(restoreSession.fulfilled, (state, action) => {
      state.loading = false;
      state.tokens = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(restoreSession.rejected, (state) => {
      state.loading = false;
      state.isAuthenticated = false;
    });
  },
});

export const {setTokens, clearError} = authSlice.actions;
export default authSlice.reducer;
