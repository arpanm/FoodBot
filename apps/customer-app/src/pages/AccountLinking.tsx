/**
 * AccountLinking Page
 * Main page for managing platform account connections (Swiggy/Zomato).
 * Handles OAuth callback URL parameters when redirected back from platforms.
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  AccountLinkingModal,
  AccountStatus,
} from '../components/AccountLinking';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAccountLinking } from '../hooks/useAccountLinking';
import type { PlatformType } from '../services/account-linking.service';

// ==================== Types ====================

export interface AccountLinkingPageProps {
  'data-testid'?: string;
}

// ==================== Helpers ====================

/**
 * Extracts OAuth callback parameters from the current URL.
 * Returns null if the URL does not contain valid callback params.
 */
function extractOAuthParams(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');

  if (code && state) {
    return { code, state };
  }
  return null;
}

/**
 * Cleans OAuth parameters from the URL without triggering a page reload.
 */
function cleanOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  window.history.replaceState({}, document.title, url.toString());
}

// ==================== Component ====================

export const AccountLinkingPage: React.FC<AccountLinkingPageProps> = ({
  'data-testid': testId,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalPlatform, setModalPlatform] = useState<PlatformType | undefined>();
  const [callbackProcessing, setCallbackProcessing] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  const {
    processOAuthCallback,
    refreshAccounts,
    unlinkPlatform,
  } = useAccountLinking();

  // Process OAuth callback on page load if URL contains callback params
  useEffect(() => {
    const oauthParams = extractOAuthParams();

    if (oauthParams) {
      setCallbackProcessing(true);
      processOAuthCallback(oauthParams.code, oauthParams.state)
        .then(() => {
          cleanOAuthParamsFromUrl();
          setCallbackProcessing(false);
        })
        .catch((err: unknown) => {
          const error = err instanceof Error ? err.message : 'OAuth callback failed';
          setCallbackError(error);
          cleanOAuthParamsFromUrl();
          setCallbackProcessing(false);
        });
    }

    // Check for OAuth error in URL (platform returned an error)
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const errorDescription = params.get('error_description');
    if (oauthError) {
      setCallbackError(
        errorDescription || `Authorization failed: ${oauthError}`
      );
      cleanOAuthParamsFromUrl();
    }
  }, [processOAuthCallback]);

  const handleLinkPlatform = useCallback((platform: PlatformType) => {
    setModalPlatform(platform);
    setIsModalOpen(true);
  }, []);

  const handleUnlinkPlatform = useCallback(async (platform: PlatformType) => {
    await unlinkPlatform(platform);
    await refreshAccounts();
  }, [unlinkPlatform, refreshAccounts]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setModalPlatform(undefined);
    // Refresh accounts after modal close to get latest status
    refreshAccounts();
  }, [refreshAccounts]);

  const handleDismissCallbackError = useCallback(() => {
    setCallbackError(null);
  }, []);

  if (callbackProcessing) {
    return (
      <div
        className="page-container account-linking-page"
        data-testid={testId || 'account-linking-page-loading'}
      >
        <div className="callback-processing">
          <LoadingSpinner size="large" />
          <h2>Completing account connection...</h2>
          <p>Please wait while we securely link your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-container account-linking-page"
      data-testid={testId || 'account-linking-page'}
    >
      <div className="page-header">
        <h1 className="page-title">Account Linking</h1>
        <p className="page-subtitle">
          Manage your connected food delivery platforms.
          FoodBot aggregates results from your linked accounts to find the best
          deals and fastest delivery.
        </p>
      </div>

      {callbackError && (
        <ErrorMessage
          message={callbackError}
          onRetry={handleDismissCallbackError}
          data-testid="callback-error"
        />
      )}

      <AccountStatus
        onLinkPlatform={handleLinkPlatform}
        onUnlinkPlatform={handleUnlinkPlatform}
      />

      <div className="account-linking-info-section">
        <h3 className="info-section-title">How it works</h3>
        <ol className="info-steps-list">
          <li className="info-step">
            <strong>Connect your account</strong> -- You will be redirected to
            the platform&apos;s official login page to authorize FoodBot.
          </li>
          <li className="info-step">
            <strong>Tokens stored securely</strong> -- Your authorization tokens
            are encrypted and stored on FoodBot&apos;s servers, never in your
            browser.
          </li>
          <li className="info-step">
            <strong>Search across platforms</strong> -- FoodBot queries your
            linked platforms to find the best restaurants and deals.
          </li>
          <li className="info-step">
            <strong>Disconnect anytime</strong> -- You can unlink your account
            at any time from this page.
          </li>
        </ol>
      </div>

      <div className="account-linking-security-section">
        <h3 className="security-section-title">Security</h3>
        <ul className="security-features-list">
          <li>Authorization tokens are encrypted with AES-256-GCM at rest</li>
          <li>Tokens are never stored in your browser or local storage</li>
          <li>OAuth state parameter prevents CSRF attacks</li>
          <li>Tokens automatically expire and require re-authorization</li>
          <li>You can revoke access at any time</li>
        </ul>
      </div>

      <AccountLinkingModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialPlatform={modalPlatform}
      />
    </div>
  );
};

export default AccountLinkingPage;
