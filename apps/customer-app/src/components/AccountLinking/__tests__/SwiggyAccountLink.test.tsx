/**
 * SwiggyAccountLink Component Tests
 */

import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import type { LinkedAccount, PlatformType } from '../../../services/account-linking.service';
import { SwiggyAccountLink } from '../SwiggyAccountLink';

// Mock the useAccountLinking hook
const mockLinkSwiggy = jest.fn().mockResolvedValue(undefined);
const mockUnlinkPlatform = jest.fn().mockResolvedValue(undefined);
const mockDismissError = jest.fn();
const mockIsPlatformLinked = jest.fn();
const mockIsPlatformExpired = jest.fn();
const mockGetAccountByPlatform = jest.fn();

jest.mock('../../../hooks/useAccountLinking', () => ({
  useAccountLinking: () => ({
    loading: mockLoading,
    error: mockError,
    oauthInProgress: mockOauthInProgress,
    linkSwiggy: mockLinkSwiggy,
    unlinkPlatform: mockUnlinkPlatform,
    dismissError: mockDismissError,
    isPlatformLinked: mockIsPlatformLinked,
    isPlatformExpired: mockIsPlatformExpired,
    getAccountByPlatform: mockGetAccountByPlatform,
  }),
}));

let mockLoading = false;
let mockError: string | null = null;
let mockOauthInProgress: PlatformType | null = null;

describe('SwiggyAccountLink Component', () => {
  const defaultProps = {
    onLinkSuccess: jest.fn(),
    onLinkError: jest.fn(),
  };

  beforeEach(() => {
    mockLoading = false;
    mockError = null;
    mockOauthInProgress = null;
    mockLinkSwiggy.mockResolvedValue(undefined);
    mockUnlinkPlatform.mockResolvedValue(undefined);
    mockIsPlatformLinked.mockReturnValue(false);
    mockIsPlatformExpired.mockReturnValue(false);
    mockGetAccountByPlatform.mockReturnValue(undefined);
  });

  it('renders without crashing', () => {
    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-account-link')).toBeInTheDocument();
  });

  it('renders Swiggy branding', () => {
    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByText('Swiggy')).toBeInTheDocument();
    expect(screen.getByText('Food Delivery Platform')).toBeInTheDocument();
    expect(screen.getByTestId('swiggy-icon')).toBeInTheDocument();
  });

  it('shows Connect button when not linked', () => {
    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    const connectButton = screen.getByTestId('swiggy-link-button');
    expect(connectButton).toBeInTheDocument();
    expect(connectButton).toHaveTextContent('Connect Swiggy');
  });

  it('shows connect message when not linked', () => {
    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-status-message')).toHaveTextContent(
      'Connect your Swiggy account to order food through FoodBot.'
    );
  });

  it('calls linkSwiggy when Connect button is clicked', async () => {
    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('swiggy-link-button'));

    expect(mockLinkSwiggy).toHaveBeenCalled();
  });

  it('shows Disconnect button when linked', () => {
    mockIsPlatformLinked.mockReturnValue(true);
    mockGetAccountByPlatform.mockReturnValue({
      platform: 'swiggy',
      status: 'linked',
      linkedAt: '2026-02-10T00:00:00Z',
      lastUsed: null,
      displayName: 'test@swiggy.com',
      expiresAt: null,
    } as LinkedAccount);

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    const disconnectButton = screen.getByTestId('swiggy-unlink-button');
    expect(disconnectButton).toBeInTheDocument();
    expect(disconnectButton).toHaveTextContent('Disconnect Swiggy');
  });

  it('shows linked status message when connected', () => {
    mockIsPlatformLinked.mockReturnValue(true);

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-status-message')).toHaveTextContent(
      'Your Swiggy account is connected.'
    );
  });

  it('shows account details when linked', () => {
    mockIsPlatformLinked.mockReturnValue(true);
    mockGetAccountByPlatform.mockReturnValue({
      platform: 'swiggy',
      status: 'linked',
      linkedAt: '2026-02-10T00:00:00Z',
      lastUsed: null,
      displayName: 'test@swiggy.com',
      expiresAt: null,
    } as LinkedAccount);

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-link-details')).toBeInTheDocument();
    expect(screen.getByText('Account: test@swiggy.com')).toBeInTheDocument();
  });

  it('shows Reconnect button when expired', () => {
    mockIsPlatformExpired.mockReturnValue(true);

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    const reconnectButton = screen.getByTestId('swiggy-link-button');
    expect(reconnectButton).toHaveTextContent('Reconnect Swiggy');
  });

  it('shows expired status message', () => {
    mockIsPlatformExpired.mockReturnValue(true);

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-status-message')).toHaveTextContent(
      'Your Swiggy session has expired. Please reconnect.'
    );
  });

  it('shows OAuth progress when OAuth is in progress', () => {
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-oauth-progress')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Swiggy authorization...')).toBeInTheDocument();
  });

  it('disables Connect button when OAuth is in progress', () => {
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-link-button')).toBeDisabled();
  });

  it('shows error message when OAuth fails', () => {
    mockError = 'Failed to initiate OAuth';
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.getByTestId('swiggy-link-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to initiate OAuth')).toBeInTheDocument();
  });

  it('does not show error when OAuth error belongs to another platform', () => {
    mockError = 'Failed to initiate OAuth';
    mockOauthInProgress = 'zomato';

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(screen.queryByTestId('swiggy-link-error')).not.toBeInTheDocument();
  });

  it('shows privacy note', () => {
    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    expect(
      screen.getByText(/Your credentials are never stored in the browser/)
    ).toBeInTheDocument();
  });

  it('calls unlinkPlatform when Disconnect is clicked', () => {
    mockIsPlatformLinked.mockReturnValue(true);
    mockGetAccountByPlatform.mockReturnValue({
      platform: 'swiggy',
      status: 'linked',
      linkedAt: '2026-02-10T00:00:00Z',
      lastUsed: null,
      displayName: null,
      expiresAt: null,
    } as LinkedAccount);

    renderWithProviders(<SwiggyAccountLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('swiggy-unlink-button'));

    expect(mockUnlinkPlatform).toHaveBeenCalledWith('swiggy');
  });
});
