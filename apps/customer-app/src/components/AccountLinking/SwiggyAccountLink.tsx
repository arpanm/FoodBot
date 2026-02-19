/**
 * SwiggyAccountLink Component
 * Handles the Swiggy-specific OAuth account linking flow.
 * Displays Swiggy branding and manages the OAuth consent redirect.
 * Tokens are NEVER stored in the browser.
 */

import React, { useCallback, useMemo } from 'react';

import { useAccountLinking } from '../../hooks/useAccountLinking';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';

// ==================== Types ====================

export interface SwiggyAccountLinkProps {
  onLinkSuccess?: () => void;
  onLinkError?: (error: string) => void;
  'data-testid'?: string;
}

// ==================== Component ====================

export const SwiggyAccountLink: React.FC<SwiggyAccountLinkProps> = React.memo(({
  onLinkSuccess,
  onLinkError,
  'data-testid': testId,
}) => {
  const {
    loading,
    error,
    oauthInProgress,
    linkSwiggy,
    unlinkPlatform,
    dismissError,
    isPlatformLinked,
    isPlatformExpired,
    getAccountByPlatform,
  } = useAccountLinking();

  const isLinked = isPlatformLinked('swiggy');
  const isExpired = isPlatformExpired('swiggy');
  const isOAuthActive = oauthInProgress === 'swiggy';
  const account = getAccountByPlatform('swiggy');

  const statusMessage = useMemo(() => {
    if (isLinked) return 'Your Swiggy account is connected.';
    if (isExpired) return 'Your Swiggy session has expired. Please reconnect.';
    return 'Connect your Swiggy account to order food through FoodBot.';
  }, [isLinked, isExpired]);

  const handleLink = useCallback(async () => {
    try {
      await linkSwiggy();
      onLinkSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to link Swiggy';
      onLinkError?.(errorMessage);
    }
  }, [linkSwiggy, onLinkSuccess, onLinkError]);

  const handleUnlink = useCallback(async () => {
    await unlinkPlatform('swiggy');
  }, [unlinkPlatform]);

  return (
    <div
      className="account-link-card account-link-swiggy"
      data-testid={testId || 'swiggy-account-link'}
    >
      <div className="account-link-header">
        <div className="account-link-brand">
          <span
            className="platform-icon platform-icon-swiggy"
            data-testid="swiggy-icon"
            aria-hidden="true"
          />
          <div className="account-link-brand-info">
            <h3 className="account-link-title">Swiggy</h3>
            <p className="account-link-subtitle">Food Delivery Platform</p>
          </div>
        </div>
      </div>

      <p
        className="account-link-status-message"
        data-testid="swiggy-status-message"
      >
        {statusMessage}
      </p>

      {error && oauthInProgress === 'swiggy' && (
        <ErrorMessage
          message={error}
          onRetry={dismissError}
          data-testid="swiggy-link-error"
        />
      )}

      {isOAuthActive && (
        <div
          className="account-link-oauth-progress"
          data-testid="swiggy-oauth-progress"
        >
          <LoadingSpinner size="small" />
          <p className="oauth-progress-text">
            Waiting for Swiggy authorization...
          </p>
          <p className="oauth-progress-hint">
            Complete the login in the popup window.
          </p>
        </div>
      )}

      {isLinked && account?.linkedAt && (
        <div
          className="account-link-details"
          data-testid="swiggy-link-details"
        >
          {account.displayName && (
            <p className="account-link-display-name">
              Account: {account.displayName}
            </p>
          )}
          <p className="account-link-date">
            Connected since:{' '}
            {new Date(account.linkedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>
      )}

      <div className="account-link-actions">
        {isLinked ? (
          <Button
            variant="outline"
            onClick={handleUnlink}
            loading={loading}
            data-testid="swiggy-unlink-button"
          >
            Disconnect Swiggy
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleLink}
            loading={loading || isOAuthActive}
            disabled={isOAuthActive}
            data-testid="swiggy-link-button"
          >
            {isExpired ? 'Reconnect Swiggy' : 'Connect Swiggy'}
          </Button>
        )}
      </div>

      <p className="account-link-privacy-note">
        FoodBot will securely store your authorization tokens on our servers.
        Your credentials are never stored in the browser.
      </p>
    </div>
  );
});
