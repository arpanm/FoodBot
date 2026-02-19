/**
 * ZomatoAccountLink Component
 * Handles the Zomato-specific OAuth account linking flow.
 * Displays Zomato branding and manages the OAuth consent redirect.
 * Tokens are NEVER stored in the browser.
 */

import React, { useCallback, useMemo } from 'react';

import { useAccountLinking } from '../../hooks/useAccountLinking';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';

// ==================== Types ====================

export interface ZomatoAccountLinkProps {
  onLinkSuccess?: () => void;
  onLinkError?: (error: string) => void;
  'data-testid'?: string;
}

// ==================== Component ====================

export const ZomatoAccountLink: React.FC<ZomatoAccountLinkProps> = React.memo(({
  onLinkSuccess,
  onLinkError,
  'data-testid': testId,
}) => {
  const {
    loading,
    error,
    oauthInProgress,
    linkZomato,
    unlinkPlatform,
    dismissError,
    isPlatformLinked,
    isPlatformExpired,
    getAccountByPlatform,
  } = useAccountLinking();

  const isLinked = isPlatformLinked('zomato');
  const isExpired = isPlatformExpired('zomato');
  const isOAuthActive = oauthInProgress === 'zomato';
  const account = getAccountByPlatform('zomato');

  const statusMessage = useMemo(() => {
    if (isLinked) return 'Your Zomato account is connected.';
    if (isExpired) return 'Your Zomato session has expired. Please reconnect.';
    return 'Connect your Zomato account to browse restaurants and order food through FoodBot.';
  }, [isLinked, isExpired]);

  const handleLink = useCallback(async () => {
    try {
      await linkZomato();
      onLinkSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to link Zomato';
      onLinkError?.(errorMessage);
    }
  }, [linkZomato, onLinkSuccess, onLinkError]);

  const handleUnlink = useCallback(async () => {
    await unlinkPlatform('zomato');
  }, [unlinkPlatform]);

  return (
    <div
      className="account-link-card account-link-zomato"
      data-testid={testId || 'zomato-account-link'}
    >
      <div className="account-link-header">
        <div className="account-link-brand">
          <span
            className="platform-icon platform-icon-zomato"
            data-testid="zomato-icon"
            aria-hidden="true"
          />
          <div className="account-link-brand-info">
            <h3 className="account-link-title">Zomato</h3>
            <p className="account-link-subtitle">Food Delivery & Reviews</p>
          </div>
        </div>
      </div>

      <p
        className="account-link-status-message"
        data-testid="zomato-status-message"
      >
        {statusMessage}
      </p>

      {error && oauthInProgress === 'zomato' && (
        <ErrorMessage
          message={error}
          onRetry={dismissError}
          data-testid="zomato-link-error"
        />
      )}

      {isOAuthActive && (
        <div
          className="account-link-oauth-progress"
          data-testid="zomato-oauth-progress"
        >
          <LoadingSpinner size="small" />
          <p className="oauth-progress-text">
            Waiting for Zomato authorization...
          </p>
          <p className="oauth-progress-hint">
            Complete the login in the popup window.
          </p>
        </div>
      )}

      {isLinked && account?.linkedAt && (
        <div
          className="account-link-details"
          data-testid="zomato-link-details"
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
            data-testid="zomato-unlink-button"
          >
            Disconnect Zomato
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleLink}
            loading={loading || isOAuthActive}
            disabled={isOAuthActive}
            data-testid="zomato-link-button"
          >
            {isExpired ? 'Reconnect Zomato' : 'Connect Zomato'}
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
