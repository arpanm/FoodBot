/**
 * AccountStatus Component Tests
 */

import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import type { LinkedAccount } from '../../../services/account-linking.service';
import { AccountStatus } from '../AccountStatus';

// Mock the useAccountLinking hook
const mockRefreshAccounts = jest.fn().mockResolvedValue(undefined);
const mockDismissError = jest.fn();
const mockGetAccountByPlatform = jest.fn();

jest.mock('../../../hooks/useAccountLinking', () => ({
  useAccountLinking: () => ({
    accounts: mockAccounts,
    loading: mockLoading,
    error: mockError,
    unlinkingPlatform: mockUnlinkingPlatform,
    refreshAccounts: mockRefreshAccounts,
    dismissError: mockDismissError,
    getAccountByPlatform: mockGetAccountByPlatform,
  }),
}));

let mockAccounts: LinkedAccount[] = [];
let mockLoading = false;
let mockError: string | null = null;
let mockUnlinkingPlatform: string | null = null;

describe('AccountStatus Component', () => {
  const defaultProps = {
    onLinkPlatform: jest.fn(),
    onUnlinkPlatform: jest.fn(),
  };

  beforeEach(() => {
    mockAccounts = [];
    mockLoading = false;
    mockError = null;
    mockUnlinkingPlatform = null;
    mockRefreshAccounts.mockResolvedValue(undefined);
    mockGetAccountByPlatform.mockImplementation((platform: string) =>
      mockAccounts.find((a) => a.platform === platform)
    );
  });

  it('renders loading state when fetching accounts with no existing data', () => {
    mockLoading = true;
    mockAccounts = [];

    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('account-status-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading account status...')).toBeInTheDocument();
  });

  it('renders the account status container', () => {
    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('account-status')).toBeInTheDocument();
    expect(screen.getByText('Linked Accounts')).toBeInTheDocument();
  });

  it('renders both platform cards', () => {
    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('platform-status-swiggy')).toBeInTheDocument();
    expect(screen.getByTestId('platform-status-zomato')).toBeInTheDocument();
  });

  it('shows Connect button for unlinked platforms', () => {
    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('link-swiggy-button')).toBeInTheDocument();
    expect(screen.getByTestId('link-zomato-button')).toBeInTheDocument();
  });

  it('shows Disconnect button for linked platforms', () => {
    mockAccounts = [
      {
        platform: 'swiggy',
        status: 'linked',
        linkedAt: '2026-02-10T00:00:00Z',
        lastUsed: null,
        displayName: 'user@swiggy.com',
        expiresAt: null,
      },
    ];
    mockGetAccountByPlatform.mockImplementation((platform: string) =>
      mockAccounts.find((a) => a.platform === platform)
    );

    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('unlink-swiggy-button')).toBeInTheDocument();
    expect(screen.getByTestId('link-zomato-button')).toBeInTheDocument();
  });

  it('shows Reconnect button for expired platforms', () => {
    mockAccounts = [
      {
        platform: 'swiggy',
        status: 'expired',
        linkedAt: '2026-01-01T00:00:00Z',
        lastUsed: null,
        displayName: null,
        expiresAt: '2026-01-02T00:00:00Z',
      },
    ];
    mockGetAccountByPlatform.mockImplementation((platform: string) =>
      mockAccounts.find((a) => a.platform === platform)
    );

    renderWithProviders(<AccountStatus {...defaultProps} />);

    const reconnectButton = screen.getByTestId('link-swiggy-button');
    expect(reconnectButton).toBeInTheDocument();
    expect(reconnectButton).toHaveTextContent('Reconnect');
  });

  it('shows expired warning for expired platforms', () => {
    mockAccounts = [
      {
        platform: 'swiggy',
        status: 'expired',
        linkedAt: '2026-01-01T00:00:00Z',
        lastUsed: null,
        displayName: null,
        expiresAt: null,
      },
    ];
    mockGetAccountByPlatform.mockImplementation((platform: string) =>
      mockAccounts.find((a) => a.platform === platform)
    );

    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('swiggy-expired-warning')).toBeInTheDocument();
  });

  it('calls onLinkPlatform when Connect button is clicked', () => {
    renderWithProviders(<AccountStatus {...defaultProps} />);

    fireEvent.click(screen.getByTestId('link-swiggy-button'));

    expect(defaultProps.onLinkPlatform).toHaveBeenCalledWith('swiggy');
  });

  it('calls onUnlinkPlatform when Disconnect button is clicked', () => {
    mockAccounts = [
      {
        platform: 'zomato',
        status: 'linked',
        linkedAt: '2026-02-10T00:00:00Z',
        lastUsed: null,
        displayName: null,
        expiresAt: null,
      },
    ];
    mockGetAccountByPlatform.mockImplementation((platform: string) =>
      mockAccounts.find((a) => a.platform === platform)
    );

    renderWithProviders(<AccountStatus {...defaultProps} />);

    fireEvent.click(screen.getByTestId('unlink-zomato-button'));

    expect(defaultProps.onUnlinkPlatform).toHaveBeenCalledWith('zomato');
  });

  it('shows error message and retry button when error exists', () => {
    mockError = 'Failed to fetch accounts';

    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('account-status-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch accounts')).toBeInTheDocument();
  });

  it('shows linked date when account is connected', () => {
    mockAccounts = [
      {
        platform: 'swiggy',
        status: 'linked',
        linkedAt: '2026-02-10T00:00:00Z',
        lastUsed: null,
        displayName: null,
        expiresAt: null,
      },
    ];
    mockGetAccountByPlatform.mockImplementation((platform: string) =>
      mockAccounts.find((a) => a.platform === platform)
    );

    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(screen.getByTestId('swiggy-details')).toBeInTheDocument();
  });

  it('refreshes accounts on mount', () => {
    renderWithProviders(<AccountStatus {...defaultProps} />);

    expect(mockRefreshAccounts).toHaveBeenCalled();
  });
});
