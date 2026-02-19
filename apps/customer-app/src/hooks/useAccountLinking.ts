/**
 * useAccountLinking Hook
 * Provides account linking state and actions for Swiggy/Zomato OAuth flows.
 * Follows the hybrid architecture: browser handles OAuth redirects,
 * tokens are stored server-side only.
 */

import { useCallback, useEffect, useRef } from 'react';

import type { PlatformType, LinkedAccount } from '../services/account-linking.service';
import {
  fetchLinkedAccounts,
  initiateOAuth,
  handleOAuthCallback,
  unlinkAccount,
  clearError,
  clearOAuthState,
} from '../store/slices/accountLinkingSlice';
import type { AccountLinkingState } from '../store/slices/accountLinkingSlice';

import { useAppDispatch, useAppSelector } from './useRedux';

// ==================== Types ====================

export interface UseAccountLinkingResult {
  /** List of linked accounts with their statuses */
  accounts: LinkedAccount[];
  /** Whether a fetch/link/unlink operation is in progress */
  loading: boolean;
  /** Error message from the last failed operation */
  error: string | null;
  /** Platform currently undergoing OAuth flow, or null */
  oauthInProgress: PlatformType | null;
  /** Platform currently being unlinked, or null */
  unlinkingPlatform: PlatformType | null;
  /** Start the Swiggy OAuth flow */
  linkSwiggy: () => Promise<void>;
  /** Start the Zomato OAuth flow */
  linkZomato: () => Promise<void>;
  /** Process an OAuth callback (code + state from URL params) */
  processOAuthCallback: (code: string, state: string) => Promise<void>;
  /** Unlink a platform account */
  unlinkPlatform: (platform: PlatformType) => Promise<void>;
  /** Refresh the linked accounts list */
  refreshAccounts: () => Promise<void>;
  /** Clear the current error */
  dismissError: () => void;
  /** Get the linked account for a specific platform */
  getAccountByPlatform: (platform: PlatformType) => LinkedAccount | undefined;
  /** Check if a specific platform is linked */
  isPlatformLinked: (platform: PlatformType) => boolean;
  /** Check if a specific platform token has expired */
  isPlatformExpired: (platform: PlatformType) => boolean;
}

// ==================== Constants ====================

const OAUTH_POPUP_WIDTH = 500;
const OAUTH_POPUP_HEIGHT = 700;
const OAUTH_POPUP_NAME = 'foodbot_oauth';

// ==================== Hook ====================

export function useAccountLinking(): UseAccountLinkingResult {
  const dispatch = useAppDispatch();

  const {
    accounts,
    loading,
    error,
    oauthInProgress,
    oauthUrl,
    unlinkingPlatform,
  } = useAppSelector(
    (state) => (state as { accountLinking: AccountLinkingState }).accountLinking
  );

  const popupRef = useRef<Window | null>(null);
  const popupCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up popup monitoring on unmount
  useEffect(() => {
    return () => {
      if (popupCheckInterval.current) {
        clearInterval(popupCheckInterval.current);
      }
    };
  }, []);

  // When oauthUrl changes and we have a URL, open the OAuth popup
  useEffect(() => {
    if (oauthUrl && oauthInProgress) {
      openOAuthPopup(oauthUrl);
    }
  }, [oauthUrl, oauthInProgress]);

  /**
   * Opens an OAuth consent popup window centered on the screen.
   * Monitors the popup for close events and URL changes.
   */
  const openOAuthPopup = useCallback((url: string) => {
    const left = window.screenX + (window.outerWidth - OAUTH_POPUP_WIDTH) / 2;
    const top = window.screenY + (window.outerHeight - OAUTH_POPUP_HEIGHT) / 2;

    const features = [
      `width=${OAUTH_POPUP_WIDTH}`,
      `height=${OAUTH_POPUP_HEIGHT}`,
      `left=${left}`,
      `top=${top}`,
      'scrollbars=yes',
      'resizable=yes',
      'status=yes',
    ].join(',');

    popupRef.current = window.open(url, OAUTH_POPUP_NAME, features);

    // Monitor popup for closure (user cancelled)
    if (popupCheckInterval.current) {
      clearInterval(popupCheckInterval.current);
    }

    popupCheckInterval.current = setInterval(() => {
      if (popupRef.current && popupRef.current.closed) {
        if (popupCheckInterval.current) {
          clearInterval(popupCheckInterval.current);
        }
        dispatch(clearOAuthState());
      }
    }, 500);
  }, [dispatch]);

  /**
   * Initiates the Swiggy OAuth flow.
   * Requests an OAuth URL from the backend, then opens a popup.
   */
  const linkSwiggy = useCallback(async () => {
    await dispatch(initiateOAuth('swiggy'));
  }, [dispatch]);

  /**
   * Initiates the Zomato OAuth flow.
   * Requests an OAuth URL from the backend, then opens a popup.
   */
  const linkZomato = useCallback(async () => {
    await dispatch(initiateOAuth('zomato'));
  }, [dispatch]);

  /**
   * Processes the OAuth callback by sending code+state to the backend.
   * The backend exchanges the code for tokens and stores them securely.
   */
  const processOAuthCallback = useCallback(async (code: string, state: string) => {
    const resultAction = await dispatch(handleOAuthCallback({ code, state }));

    // Close the popup if still open
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.close();
    }

    // Refresh accounts to get the latest status
    if (handleOAuthCallback.fulfilled.match(resultAction)) {
      await dispatch(fetchLinkedAccounts());
    }
  }, [dispatch]);

  /**
   * Unlinks a platform account.
   * Backend deletes the encrypted tokens from Redis.
   */
  const unlinkPlatform = useCallback(async (platform: PlatformType) => {
    await dispatch(unlinkAccount(platform));
  }, [dispatch]);

  /**
   * Refreshes the linked accounts list from the backend.
   */
  const refreshAccounts = useCallback(async () => {
    await dispatch(fetchLinkedAccounts());
  }, [dispatch]);

  /**
   * Clears the current error message.
   */
  const dismissError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Returns the linked account data for a specific platform.
   */
  const getAccountByPlatform = useCallback(
    (platform: PlatformType): LinkedAccount | undefined => {
      return accounts.find((a) => a.platform === platform);
    },
    [accounts]
  );

  /**
   * Checks whether a platform is currently linked.
   */
  const isPlatformLinked = useCallback(
    (platform: PlatformType): boolean => {
      const account = accounts.find((a) => a.platform === platform);
      return account?.status === 'linked';
    },
    [accounts]
  );

  /**
   * Checks whether a platform's token has expired.
   */
  const isPlatformExpired = useCallback(
    (platform: PlatformType): boolean => {
      const account = accounts.find((a) => a.platform === platform);
      return account?.status === 'expired';
    },
    [accounts]
  );

  return {
    accounts,
    loading,
    error,
    oauthInProgress,
    unlinkingPlatform,
    linkSwiggy,
    linkZomato,
    processOAuthCallback,
    unlinkPlatform,
    refreshAccounts,
    dismissError,
    getAccountByPlatform,
    isPlatformLinked,
    isPlatformExpired,
  };
}
