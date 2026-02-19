/**
 * OAuthCallback Page
 * Handles the OAuth redirect callback in the popup window.
 * Sends the authorization code and state back to the parent window
 * (AccountLinking page) and closes itself.
 */

import React, { useEffect, useState } from 'react';

import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useAccountLinking } from '../hooks/useAccountLinking';

// ==================== Types ====================

export interface OAuthCallbackPageProps {
  'data-testid'?: string;
}

// ==================== Component ====================

export const OAuthCallbackPage: React.FC<OAuthCallbackPageProps> = ({
  'data-testid': testId,
}) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { processOAuthCallback } = useAccountLinking();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || `Authorization failed: ${error}`);
      return;
    }

    if (!code || !state) {
      setStatus('error');
      setErrorMessage('Invalid callback parameters. Missing authorization code or state.');
      return;
    }

    processOAuthCallback(code, state)
      .then(() => {
        setStatus('success');
        // Close the popup after a brief delay to show success
        setTimeout(() => {
          window.close();
        }, 1500);
      })
      .catch((err: unknown) => {
        setStatus('error');
        const message = err instanceof Error ? err.message : 'Failed to complete authorization';
        setErrorMessage(message);
      });
  }, [processOAuthCallback]);

  return (
    <div
      className="oauth-callback-page"
      data-testid={testId || 'oauth-callback-page'}
    >
      {status === 'processing' && (
        <div className="oauth-callback-processing" data-testid="oauth-callback-processing">
          <LoadingSpinner size="large" />
          <h2>Completing authorization...</h2>
          <p>Please wait while we securely connect your account.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="oauth-callback-success" data-testid="oauth-callback-success">
          <div className="success-icon" aria-hidden="true" />
          <h2>Account connected successfully!</h2>
          <p>This window will close automatically.</p>
          <p className="oauth-callback-hint">
            If this window does not close, you can close it manually.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="oauth-callback-error" data-testid="oauth-callback-error">
          <ErrorMessage
            message={errorMessage || 'An unknown error occurred during authorization.'}
            data-testid="oauth-error-message"
          />
          <p className="oauth-callback-hint">
            You can close this window and try again from the Account Linking page.
          </p>
        </div>
      )}
    </div>
  );
};

export default OAuthCallbackPage;
