/**
 * AccountLinkingModal Component Tests
 */

import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import type { PlatformType } from '../../../services/account-linking.service';
import { AccountLinkingModal } from '../AccountLinkingModal';

// Mock the useAccountLinking hook
const mockDismissError = jest.fn();

jest.mock('../../../hooks/useAccountLinking', () => ({
  useAccountLinking: () => ({
    error: mockError,
    oauthInProgress: mockOauthInProgress,
    dismissError: mockDismissError,
    loading: false,
    accounts: [],
    unlinkingPlatform: null,
    linkSwiggy: jest.fn().mockResolvedValue(undefined),
    linkZomato: jest.fn().mockResolvedValue(undefined),
    unlinkPlatform: jest.fn().mockResolvedValue(undefined),
    isPlatformLinked: jest.fn().mockReturnValue(false),
    isPlatformExpired: jest.fn().mockReturnValue(false),
    getAccountByPlatform: jest.fn().mockReturnValue(undefined),
    processOAuthCallback: jest.fn().mockResolvedValue(undefined),
    refreshAccounts: jest.fn().mockResolvedValue(undefined),
  }),
}));

let mockError: string | null = null;
let mockOauthInProgress: PlatformType | null = null;

describe('AccountLinkingModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockError = null;
    mockOauthInProgress = null;
  });

  it('renders nothing when not open', () => {
    renderWithProviders(
      <AccountLinkingModal {...defaultProps} isOpen={false} />
    );

    expect(screen.queryByTestId('account-linking-modal')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.getByTestId('account-linking-modal')).toBeInTheDocument();
    expect(screen.getByText('Connect Food Delivery Account')).toBeInTheDocument();
  });

  it('renders both platform tabs', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.getByTestId('swiggy-tab')).toBeInTheDocument();
    expect(screen.getByTestId('zomato-tab')).toBeInTheDocument();
  });

  it('defaults to Swiggy tab', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    const swiggyTab = screen.getByTestId('swiggy-tab');
    expect(swiggyTab).toHaveAttribute('aria-selected', 'true');
  });

  it('defaults to specified initial platform tab', () => {
    renderWithProviders(
      <AccountLinkingModal {...defaultProps} initialPlatform="zomato" />
    );

    const zomatoTab = screen.getByTestId('zomato-tab');
    expect(zomatoTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches tabs when clicked', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('zomato-tab'));

    const zomatoTab = screen.getByTestId('zomato-tab');
    const swiggyTab = screen.getByTestId('swiggy-tab');
    expect(zomatoTab).toHaveAttribute('aria-selected', 'true');
    expect(swiggyTab).toHaveAttribute('aria-selected', 'false');
  });

  it('shows Swiggy link component when Swiggy tab is active', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.getByTestId('swiggy-account-link')).toBeInTheDocument();
  });

  it('shows Zomato link component when Zomato tab is active', () => {
    renderWithProviders(
      <AccountLinkingModal {...defaultProps} initialPlatform="zomato" />
    );

    expect(screen.getByTestId('zomato-account-link')).toBeInTheDocument();
  });

  it('has a close button', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.getByTestId('modal-close-button')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('modal-close-button'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose when overlay is clicked', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('account-linking-modal'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not close when overlay is clicked during OAuth', () => {
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('account-linking-modal'));

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('disables close button during OAuth', () => {
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.getByTestId('modal-close-button')).toBeDisabled();
  });

  it('calls onClose when Escape key is pressed', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.keyDown(screen.getByTestId('account-linking-modal'), {
      key: 'Escape',
    });

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('does not close on Escape during OAuth', () => {
    mockOauthInProgress = 'zomato';

    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.keyDown(screen.getByTestId('account-linking-modal'), {
      key: 'Escape',
    });

    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('shows error message when there is an error and no OAuth in progress', () => {
    mockError = 'Something went wrong';

    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.getByTestId('modal-error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not show modal-level error during active OAuth', () => {
    mockError = 'Some error';
    mockOauthInProgress = 'swiggy';

    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(screen.queryByTestId('modal-error')).not.toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    const modal = screen.getByTestId('account-linking-modal');
    expect(modal).toHaveAttribute('role', 'dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'account-linking-modal-title');
  });

  it('shows security note in footer', () => {
    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    expect(
      screen.getByText(/never stored in your browser/)
    ).toBeInTheDocument();
  });

  it('clears error when switching tabs', () => {
    mockError = 'Previous error';

    renderWithProviders(<AccountLinkingModal {...defaultProps} />);

    fireEvent.click(screen.getByTestId('zomato-tab'));

    expect(mockDismissError).toHaveBeenCalled();
  });
});
