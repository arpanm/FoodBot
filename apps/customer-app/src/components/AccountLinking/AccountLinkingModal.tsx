/**
 * AccountLinkingModal Component
 * Unified modal for both Swiggy and Zomato account linking.
 * Provides a tabbed interface for selecting a platform to connect.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { useAccountLinking } from '../../hooks/useAccountLinking';
import type { PlatformType } from '../../services/account-linking.service';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';

import { SwiggyAccountLink } from './SwiggyAccountLink';
import { ZomatoAccountLink } from './ZomatoAccountLink';

// ==================== Types ====================

export interface AccountLinkingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlatform?: PlatformType;
  'data-testid'?: string;
}

type ModalTab = 'swiggy' | 'zomato';

// ==================== Component ====================

export const AccountLinkingModal: React.FC<AccountLinkingModalProps> = ({
  isOpen,
  onClose,
  initialPlatform,
  'data-testid': testId,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialPlatform || 'swiggy');
  const { error, oauthInProgress, dismissError } = useAccountLinking();

  const handleTabChange = useCallback((tab: ModalTab) => {
    setActiveTab(tab);
    dismissError();
  }, [dismissError]);

  const handleOverlayClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget && !oauthInProgress) {
        onClose();
      }
    },
    [onClose, oauthInProgress]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape' && !oauthInProgress) {
        onClose();
      }
    },
    [onClose, oauthInProgress]
  );

  const handleLinkSuccess = useCallback(() => {
    // Keep modal open to show success state
  }, []);

  const handleLinkError = useCallback((_error: string) => {
    // Error is handled by the child component via Redux state
  }, []);

  const tabClasses = useMemo(() => ({
    swiggy: [
      'modal-tab',
      activeTab === 'swiggy' ? 'modal-tab-active' : '',
    ].filter(Boolean).join(' '),
    zomato: [
      'modal-tab',
      activeTab === 'zomato' ? 'modal-tab-active' : '',
    ].filter(Boolean).join(' '),
  }), [activeTab]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="modal-overlay"
      data-testid={testId || 'account-linking-modal'}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-linking-modal-title"
      tabIndex={-1}
    >
      <div className="modal-content modal-content-lg">
        <div className="modal-header">
          <h2 id="account-linking-modal-title" className="modal-title">
            Connect Food Delivery Account
          </h2>
          <Button
            variant="text"
            size="small"
            onClick={onClose}
            disabled={oauthInProgress !== null}
            data-testid="modal-close-button"
            aria-label="Close modal"
          >
            Close
          </Button>
        </div>

        <div className="modal-description">
          <p>
            Link your food delivery accounts to get the best prices and
            widest selection. Your login credentials are securely handled
            through the official platform login page.
          </p>
        </div>

        {error && !oauthInProgress && (
          <ErrorMessage
            message={error}
            onRetry={dismissError}
            data-testid="modal-error"
          />
        )}

        <div className="modal-tabs" role="tablist" aria-label="Platform selection">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'swiggy'}
            aria-controls="swiggy-tab-panel"
            className={tabClasses.swiggy}
            onClick={() => handleTabChange('swiggy')}
            data-testid="swiggy-tab"
          >
            Swiggy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'zomato'}
            aria-controls="zomato-tab-panel"
            className={tabClasses.zomato}
            onClick={() => handleTabChange('zomato')}
            data-testid="zomato-tab"
          >
            Zomato
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'swiggy' && (
            <div
              id="swiggy-tab-panel"
              role="tabpanel"
              aria-labelledby="swiggy-tab"
            >
              <SwiggyAccountLink
                onLinkSuccess={handleLinkSuccess}
                onLinkError={handleLinkError}
              />
            </div>
          )}
          {activeTab === 'zomato' && (
            <div
              id="zomato-tab-panel"
              role="tabpanel"
              aria-labelledby="zomato-tab"
            >
              <ZomatoAccountLink
                onLinkSuccess={handleLinkSuccess}
                onLinkError={handleLinkError}
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <p className="modal-security-note">
            Your platform tokens are encrypted and stored securely on FoodBot servers.
            They are never stored in your browser. You can disconnect at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
