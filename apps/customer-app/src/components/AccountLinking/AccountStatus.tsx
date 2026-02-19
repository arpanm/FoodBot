/**
 * AccountStatus Component
 * Displays the linking status of Swiggy and Zomato accounts.
 * Shows linked/expired/not_linked state with appropriate visual indicators.
 */

import React, { useEffect, useMemo } from 'react';

import { useAccountLinking } from '../../hooks/useAccountLinking';
import type { PlatformType, LinkedAccount } from '../../services/account-linking.service';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';
import { LoadingSpinner } from '../common/LoadingSpinner';

// ==================== Types ====================

export interface AccountStatusProps {
  onLinkPlatform?: (platform: PlatformType) => void;
  onUnlinkPlatform?: (platform: PlatformType) => void;
  'data-testid'?: string;
}

interface PlatformStatusCardProps {
  account: LinkedAccount | undefined;
  platform: PlatformType;
  platformLabel: string;
  onLink: () => void;
  onUnlink: () => void;
  isUnlinking: boolean;
  'data-testid'?: string;
}

// ==================== Sub-components ====================

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = useMemo(() => {
    switch (status) {
      case 'linked':
        return { label: 'Connected', className: 'status-badge-linked' };
      case 'expired':
        return { label: 'Expired', className: 'status-badge-expired' };
      default:
        return { label: 'Not Connected', className: 'status-badge-not-linked' };
    }
  }, [status]);

  return (
    <span
      className={`status-badge ${statusConfig.className}`}
      data-testid={`status-badge-${status}`}
    >
      {statusConfig.label}
    </span>
  );
};

const PlatformStatusCard: React.FC<PlatformStatusCardProps> = React.memo(({
  account,
  platform,
  platformLabel,
  onLink,
  onUnlink,
  isUnlinking,
  'data-testid': testId,
}) => {
  const status = account?.status || 'not_linked';
  const isLinked = status === 'linked';
  const isExpired = status === 'expired';

  const formattedLinkedAt = useMemo(() => {
    if (!account?.linkedAt) return null;
    return new Date(account.linkedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [account?.linkedAt]);

  return (
    <div
      className={`platform-status-card platform-status-card-${status}`}
      data-testid={testId || `platform-status-${platform}`}
    >
      <div className="platform-status-header">
        <div className="platform-info">
          <span
            className={`platform-icon platform-icon-${platform}`}
            data-testid={`platform-icon-${platform}`}
            aria-hidden="true"
          />
          <h3 className="platform-name">{platformLabel}</h3>
        </div>
        <StatusBadge status={status} />
      </div>

      {isLinked && (
        <div className="platform-status-details" data-testid={`${platform}-details`}>
          {account?.displayName && (
            <p className="platform-display-name">
              Linked as: {account.displayName}
            </p>
          )}
          {formattedLinkedAt && (
            <p className="platform-linked-date">
              Connected since: {formattedLinkedAt}
            </p>
          )}
        </div>
      )}

      {isExpired && (
        <div className="platform-status-warning" data-testid={`${platform}-expired-warning`}>
          <p className="platform-expired-text">
            Your session has expired. Please reconnect to continue using {platformLabel}.
          </p>
        </div>
      )}

      <div className="platform-status-actions">
        {isLinked ? (
          <Button
            variant="outline"
            size="small"
            onClick={onUnlink}
            loading={isUnlinking}
            data-testid={`unlink-${platform}-button`}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            variant="primary"
            size="small"
            onClick={onLink}
            data-testid={`link-${platform}-button`}
          >
            {isExpired ? 'Reconnect' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
});

// ==================== Main Component ====================

export const AccountStatus: React.FC<AccountStatusProps> = ({
  onLinkPlatform,
  onUnlinkPlatform,
  'data-testid': testId,
}) => {
  const {
    accounts,
    loading,
    error,
    unlinkingPlatform,
    refreshAccounts,
    dismissError,
    getAccountByPlatform,
  } = useAccountLinking();

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  const swiggyAccount = getAccountByPlatform('swiggy');
  const zomatoAccount = getAccountByPlatform('zomato');

  const handleLinkSwiggy = (): void => {
    onLinkPlatform?.('swiggy');
  };

  const handleLinkZomato = (): void => {
    onLinkPlatform?.('zomato');
  };

  const handleUnlinkSwiggy = (): void => {
    onUnlinkPlatform?.('swiggy');
  };

  const handleUnlinkZomato = (): void => {
    onUnlinkPlatform?.('zomato');
  };

  if (loading && accounts.length === 0) {
    return (
      <div
        className="account-status-loading"
        data-testid={testId || 'account-status-loading'}
      >
        <LoadingSpinner size="medium" />
        <p>Loading account status...</p>
      </div>
    );
  }

  return (
    <div
      className="account-status"
      data-testid={testId || 'account-status'}
    >
      <h2 className="account-status-title">Linked Accounts</h2>
      <p className="account-status-description">
        Connect your food delivery accounts to get personalized recommendations
        and place orders directly through FoodBot.
      </p>

      {error && (
        <ErrorMessage
          message={error}
          onRetry={refreshAccounts}
          data-testid="account-status-error"
        />
      )}

      <div className="platform-status-list">
        <PlatformStatusCard
          account={swiggyAccount}
          platform="swiggy"
          platformLabel="Swiggy"
          onLink={handleLinkSwiggy}
          onUnlink={handleUnlinkSwiggy}
          isUnlinking={unlinkingPlatform === 'swiggy'}
        />
        <PlatformStatusCard
          account={zomatoAccount}
          platform="zomato"
          platformLabel="Zomato"
          onLink={handleLinkZomato}
          onUnlink={handleUnlinkZomato}
          isUnlinking={unlinkingPlatform === 'zomato'}
        />
      </div>
    </div>
  );
};
