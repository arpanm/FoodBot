import {Linking} from 'react-native';
import * as Keychain from 'react-native-keychain';
import axios from 'axios';
import {AuthTokens, OAuthConfig, Result, ApiError} from '../../types';

/**
 * OAuth Service for Mobile App
 * Handles OAuth flow, token storage, and token refresh
 */

const OAUTH_CONFIGS: Record<string, OAuthConfig> = {
  google: {
    provider: 'google',
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    redirectUri: 'foodbot://oauth/callback',
    scopes: ['openid', 'profile', 'email'],
  },
  facebook: {
    provider: 'facebook',
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    redirectUri: 'foodbot://oauth/callback',
    scopes: ['public_profile', 'email'],
  },
  apple: {
    provider: 'apple',
    clientId: process.env.APPLE_CLIENT_ID || '',
    redirectUri: 'foodbot://oauth/callback',
    scopes: ['name', 'email'],
  },
};

// Keychain keys
const TOKEN_KEY = 'foodbot_auth_tokens';

/**
 * Initiate OAuth flow
 * Opens browser with OAuth provider's authorization URL
 */
export async function initiateOAuth(
  provider: 'google' | 'facebook' | 'apple',
): Promise<Result<void, ApiError>> {
  try {
    const config = OAUTH_CONFIGS[provider];
    if (!config) {
      return {
        success: false,
        error: {
          code: 'INVALID_PROVIDER',
          message: `Unknown OAuth provider: ${provider}`,
        },
      };
    }

    // Generate state for CSRF protection
    const state = generateRandomState();
    await storeState(state);

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(config, state);

    // Open browser
    const canOpen = await Linking.canOpenURL(authUrl);
    if (!canOpen) {
      return {
        success: false,
        error: {
          code: 'CANNOT_OPEN_BROWSER',
          message: 'Cannot open browser for OAuth',
        },
      };
    }

    await Linking.openURL(authUrl);
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'OAUTH_INITIATION_FAILED',
        message: 'Failed to initiate OAuth flow',
      },
    };
  }
}

/**
 * Handle OAuth callback
 * Exchanges authorization code for tokens
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
): Promise<Result<AuthTokens, ApiError>> {
  try {
    // Verify state to prevent CSRF
    const storedState = await getStoredState();
    if (state !== storedState) {
      return {
        success: false,
        error: {
          code: 'INVALID_STATE',
          message: 'Invalid OAuth state parameter',
        },
      };
    }

    // Exchange code for tokens via Gateway API
    const response = await axios.post(
      `${process.env.GATEWAY_API_URL || 'http://localhost:3000'}/api/v1/auth/oauth/callback`,
      {
        code,
        provider: 'google', // TODO: Store provider during initiation
      },
    );

    const tokens: AuthTokens = response.data.data;

    // Store tokens securely
    await storeTokens(tokens);

    return {success: true, data: tokens};
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        success: false,
        error: {
          code: error.response?.data?.code || 'TOKEN_EXCHANGE_FAILED',
          message:
            error.response?.data?.message || 'Failed to exchange OAuth code',
        },
      };
    }

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred during OAuth callback',
      },
    };
  }
}

/**
 * Get stored tokens
 */
export async function getTokens(): Promise<AuthTokens | null> {
  try {
    const credentials = await Keychain.getGenericPassword({service: TOKEN_KEY});
    if (!credentials) {
      return null;
    }

    return JSON.parse(credentials.password) as AuthTokens;
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

/**
 * Store tokens securely
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  try {
    await Keychain.setGenericPassword(TOKEN_KEY, JSON.stringify(tokens), {
      service: TOKEN_KEY,
    });
  } catch (error) {
    console.error('Failed to store tokens:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<AuthTokens | null> {
  try {
    const tokens = await getTokens();
    if (!tokens?.refreshToken) {
      return null;
    }

    const response = await axios.post(
      `${process.env.GATEWAY_API_URL || 'http://localhost:3000'}/api/v1/auth/refresh`,
      {
        refreshToken: tokens.refreshToken,
      },
    );

    const newTokens: AuthTokens = response.data.data;
    await storeTokens(newTokens);

    return newTokens;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    return null;
  }
}

/**
 * Clear stored tokens (logout)
 */
export async function clearTokens(): Promise<void> {
  try {
    await Keychain.resetGenericPassword({service: TOKEN_KEY});
  } catch (error) {
    console.error('Failed to clear tokens:', error);
  }
}

/**
 * Check if tokens are expired
 */
export async function areTokensExpired(): Promise<boolean> {
  const tokens = await getTokens();
  if (!tokens) {
    return true;
  }

  return Date.now() >= tokens.expiresAt;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildAuthorizationUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
  });

  // Provider-specific authorization endpoints
  const authEndpoints: Record<string, string> = {
    google: 'https://accounts.google.com/o/oauth2/v2/auth',
    facebook: 'https://www.facebook.com/v12.0/dialog/oauth',
    apple: 'https://appleid.apple.com/auth/authorize',
  };

  return `${authEndpoints[config.provider]}?${params.toString()}`;
}

function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15);
}

async function storeState(state: string): Promise<void> {
  try {
    await Keychain.setGenericPassword('oauth_state', state, {
      service: 'oauth_state',
    });
  } catch (error) {
    console.error('Failed to store OAuth state:', error);
  }
}

async function getStoredState(): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: 'oauth_state',
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    console.error('Failed to retrieve OAuth state:', error);
    return null;
  }
}
