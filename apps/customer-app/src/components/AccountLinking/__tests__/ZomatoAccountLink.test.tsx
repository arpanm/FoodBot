/**
 * ZomatoAccountLink Component Tests
 */

import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import type { LinkedAccount, PlatformType } from '../../../services/account-linking.service';
import { ZomatoAccountLink } from '../ZomatoAccountLink';

// Mock the useAccountLinking hook
const mockLinkZomato = jest.fn().mockResolvedValue(undefined);
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
    linkZomato: mockLinkZomato,
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

describe('ZomatoAccountLink Component', () => {
  const defaultProps = {
    onLinkSuccess: jest.fn(),
    onLinkError: jest.fn(),
  };

  beforeEach(() => {
    mockLoading = false;
    mockError = null;
    mockOauthInProgress = null;
    mockLinkZomato.mockResolvedValue(undefined);
    mockUnlinkPlatform.mockResolvedValue(undefined);
    mockIsPlatformLinked.mockReturnValue(false);
    mockIsPlatformExpired.mockReturnValue(false);
    mockGetAccountByPlatform.mockReturnValue(undefined);
  });

  it('renders without crashing', () => {
    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-account-link')).toBeInTheDocument();
  });

  it('renders Zomato branding', () => {
    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByText('Zomato')).toBeInTheDocument();
    expect(screen.getByText('Food Delivery & Reviews')).toBeInTheDocument();
    expect(screen.getByTestId('zomato-icon')).toBeInTheDocument();
  });

  it('shows Connect button when not linked', () => {
    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    const connectButton = screen.getByTestId('zomato-link-button');
    expect(connectButton).toBeInTheDocument();
    expect(connectButton).toHaveTextContent('Connect Zomato');
  });

  it('shows connect message when not linked', () => {
    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-status-message')).toHaveTextContent(
      'Connect your Zomato account to browse restaurants and order food through FoodBot.'
    );
  });

  it('calls linkZomato when Connect button is clicked', () => {
    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('zomato-link-button'));

    expect(mockLinkZomato).toHaveBeenCalled();
  });

  it('shows Disconnect button when linked', () => {
    mockIsPlatformLinked.mockReturnValue(true);
    mockGetAccountByPlatform.mockReturnValue({
      platform: 'zomato',
      status: 'linked',
      linkedAt: '2026-02-10T00:00:00Z',
      lastUsed: null,
      displayName: 'user@zomato.com',
      expiresAt: null,
    } as LinkedAccount);

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    const disconnectButton = screen.getByTestId('zomato-unlink-button');
    expect(disconnectButton).toBeInTheDocument();
    expect(disconnectButton).toHaveTextContent('Disconnect Zomato');
  });

  it('shows linked status message when connected', () => {
    mockIsPlatformLinked.mockReturnValue(true);

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-status-message')).toHaveTextContent(
      'Your Zomato account is connected.'
    );
  });

  it('shows account details when linked', () => {
    mockIsPlatformLinked.mockReturnValue(true);
    mockGetAccountByPlatform.mockReturnValue({
      platform: 'zomato',
      status: 'linked',
      linkedAt: '2026-02-10T00:00:00Z',
      lastUsed: null,
      displayName: 'user@zomato.com',
      expiresAt: null,
    } as LinkedAccount);

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-link-details')).toBeInTheDocument();
    expect(screen.getByText('Account: user@zomato.com')).toBeInTheDocument();
  });

  it('shows Reconnect button when expired', () => {
    mockIsPlatformExpired.mockReturnValue(true);

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    const reconnectButton = screen.getByTestId('zomato-link-button');
    expect(reconnectButton).toHaveTextContent('Reconnect Zomato');
  });

  it('shows expired status message', () => {
    mockIsPlatformExpired.mockReturnValue(true);

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-status-message')).toHaveTextContent(
      'Your Zomato session has expired. Please reconnect.'
    );
  });

  it('shows OAuth progress when OAuth is in progress', () => {
    mockOauthInProgress = 'zomato';

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-oauth-progress')).toBeInTheDocument();
    expect(screen.getByText('Waiting for Zomato authorization...')).toBeInTheDocument();
  });

  it('disables Connect button when OAuth is in progress', () => {
    mockOauthInProgress = 'zomato';

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-link-button')).toBeDisabled();
  });

  it('shows error message when OAuth fails for Zomato', () => {
    mockError = 'Zomato OAuth failed';
    mockOauthInProgress = 'zomato';

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.getByTestId('zomato-link-error')).toBeInTheDocument();
    expect(screen.getByText('Zomato OAuth failed')).toBeInTheDocument();
  });

  it('does not show error when OAuth error belongs to Swiggy', () => {
    mockError = 'Swiggy OAuth failed';
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(screen.queryByTestId('zomato-link-error')).not.toBeInTheDocument();
  });

  it('shows privacy note', () => {
    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    expect(
      screen.getByText(/Your credentials are never stored in the browser/)
    ).toBeInTheDocument();
  });

  it('calls unlinkPlatform when Disconnect is clicked', () => {
    mockIsPlatformLinked.mockReturnValue(true);
    mockGetAccountByPlatform.mockReturnValue({
      platform: 'zomato',
      status: 'linked',
      linkedAt: '2026-02-10T00:00:00Z',
      lastUsed: null,
      displayName: null,
      expiresAt: null,
    } as LinkedAccount);

    renderWithProviders(<ZomatoAccountLink {...defaultProps} />);

    fireEvent.click(screen.getByTestId('zomato-unlink-button'));

    expect(mockUnlinkPlatform).toHaveBeenCalledWith('zomato');
  });
});
