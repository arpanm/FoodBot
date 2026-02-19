/**
 * AccountLinking Page Tests
 * Tests for the main account linking page, including OAuth callback handling.
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithProviders } from '../../test/utils/renderWithProviders';
import type { PlatformType, LinkedAccount } from '../../services/account-linking.service';
import { AccountLinkingPage } from '../AccountLinking';

// Mock the useAccountLinking hook
const mockProcessOAuthCallback = jest.fn().mockResolvedValue(undefined);
const mockRefreshAccounts = jest.fn().mockResolvedValue(undefined);
const mockUnlinkPlatform = jest.fn().mockResolvedValue(undefined);
const mockDismissError = jest.fn();
const mockGetAccountByPlatform = jest.fn();

jest.mock('../../hooks/useAccountLinking', () => ({
  useAccountLinking: () => ({
    accounts: mockAccounts,
    loading: false,
    error: null,
    oauthInProgress: null,
    unlinkingPlatform: null,
    processOAuthCallback: mockProcessOAuthCallback,
    refreshAccounts: mockRefreshAccounts,
    unlinkPlatform: mockUnlinkPlatform,
    dismissError: mockDismissError,
    getAccountByPlatform: mockGetAccountByPlatform,
    isPlatformLinked: jest.fn().mockReturnValue(false),
    isPlatformExpired: jest.fn().mockReturnValue(false),
    linkSwiggy: jest.fn().mockResolvedValue(undefined),
    linkZomato: jest.fn().mockResolvedValue(undefined),
  }),
}));

let mockAccounts: LinkedAccount[] = [];

// Helper to set URL search params
function setSearchParams(params: Record<string, string>): void {
  const searchParams = new URLSearchParams(params);
  const url = `${window.location.pathname}?${searchParams.toString()}`;
  window.history.pushState({}, '', url);
}

// Helper to clear URL search params
function clearSearchParams(): void {
  window.history.pushState({}, '', window.location.pathname);
}

describe('AccountLinkingPage', () => {
  beforeEach(() => {
    mockAccounts = [];
    mockProcessOAuthCallback.mockResolvedValue(undefined);
    mockRefreshAccounts.mockResolvedValue(undefined);
    mockUnlinkPlatform.mockResolvedValue(undefined);
    mockGetAccountByPlatform.mockReturnValue(undefined);
    clearSearchParams();
  });

  afterEach(() => {
    clearSearchParams();
  });

  describe('Rendering', () => {
    it('renders the page with title and description', () => {
      renderWithProviders(<AccountLinkingPage />);

      expect(screen.getByTestId('account-linking-page')).toBeInTheDocument();
      expect(screen.getByText('Account Linking')).toBeInTheDocument();
      expect(
        screen.getByText(/Manage your connected food delivery platforms/)
      ).toBeInTheDocument();
    });

    it('renders the AccountStatus component', () => {
      renderWithProviders(<AccountLinkingPage />);

      expect(screen.getByTestId('account-status')).toBeInTheDocument();
    });

    it('renders How it works section', () => {
      renderWithProviders(<AccountLinkingPage />);

      expect(screen.getByText('How it works')).toBeInTheDocument();
      expect(screen.getByText(/Connect your account/)).toBeInTheDocument();
      expect(screen.getByText(/Tokens stored securely/)).toBeInTheDocument();
      expect(screen.getByText(/Search across platforms/)).toBeInTheDocument();
      expect(screen.getByText(/Disconnect anytime/)).toBeInTheDocument();
    });

    it('renders Security section', () => {
      renderWithProviders(<AccountLinkingPage />);

      expect(screen.getByText('Security')).toBeInTheDocument();
      expect(
        screen.getByText(/AES-256-GCM/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/OAuth state parameter prevents CSRF/)
      ).toBeInTheDocument();
    });
  });

  describe('OAuth Callback Handling', () => {
    it('processes OAuth callback when URL contains code and state', async () => {
      setSearchParams({ code: 'auth-code-123', state: 'csrf-state-456' });

      renderWithProviders(<AccountLinkingPage />);

      await waitFor(() => {
        expect(mockProcessOAuthCallback).toHaveBeenCalledWith(
          'auth-code-123',
          'csrf-state-456'
        );
      });
    });

    it('shows loading state during callback processing', () => {
      // Make processOAuthCallback hang
      mockProcessOAuthCallback.mockReturnValue(new Promise(() => {}));
      setSearchParams({ code: 'auth-code', state: 'state' });

      renderWithProviders(<AccountLinkingPage />);

      expect(screen.getByTestId('account-linking-page-loading')).toBeInTheDocument();
      expect(screen.getByText('Completing account connection...')).toBeInTheDocument();
    });

    it('shows error when OAuth callback fails', async () => {
      mockProcessOAuthCallback.mockRejectedValue(new Error('Invalid state'));
      setSearchParams({ code: 'bad-code', state: 'bad-state' });

      renderWithProviders(<AccountLinkingPage />);

      await waitFor(() => {
        expect(screen.getByTestId('callback-error')).toBeInTheDocument();
      });
    });

    it('shows error when platform returns OAuth error', () => {
      setSearchParams({
        error: 'access_denied',
        error_description: 'User denied access',
      });

      renderWithProviders(<AccountLinkingPage />);

      expect(screen.getByTestId('callback-error')).toBeInTheDocument();
      expect(screen.getByText('User denied access')).toBeInTheDocument();
    });

    it('does not process callback when URL has no OAuth params', () => {
      renderWithProviders(<AccountLinkingPage />);

      expect(mockProcessOAuthCallback).not.toHaveBeenCalled();
    });
  });

  describe('Modal Interaction', () => {
    it('opens modal when link platform is triggered', () => {
      renderWithProviders(<AccountLinkingPage />);

      // Click on Connect button for Swiggy
      fireEvent.click(screen.getByTestId('link-swiggy-button'));

      expect(screen.getByTestId('account-linking-modal')).toBeInTheDocument();
    });

    it('closes modal and refreshes accounts', async () => {
      renderWithProviders(<AccountLinkingPage />);

      // Open modal
      fireEvent.click(screen.getByTestId('link-swiggy-button'));
      expect(screen.getByTestId('account-linking-modal')).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByTestId('modal-close-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('account-linking-modal')).not.toBeInTheDocument();
      });
    });
  });
});
