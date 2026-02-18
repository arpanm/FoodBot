import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import { StatusTracker } from '../StatusTracker';

/**
 * StatusTracker Component Tests
 */

describe('StatusTracker Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<StatusTracker />);
      expect(screen.getByTestId('status-tracker')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<StatusTracker data-testid="my-tracker" />);
      expect(screen.getByTestId('my-tracker')).toBeInTheDocument();
    });

    it('displays status label', () => {
      render(<StatusTracker status="PROCESSING" />);
      expect(screen.getByTestId('status-label')).toHaveTextContent('PROCESSING');
    });

    it('displays default IDLE status', () => {
      render(<StatusTracker />);
      expect(screen.getByTestId('status-label')).toHaveTextContent('IDLE');
    });
  });

  describe('Progress Bar', () => {
    it('shows progress bar when progress > 0', () => {
      render(<StatusTracker progress={50} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-fill')).toBeInTheDocument();
    });

    it('displays progress percentage text', () => {
      render(<StatusTracker progress={75} />);
      expect(screen.getByTestId('progress-text')).toHaveTextContent('75%');
    });

    it('sets progress fill width style', () => {
      render(<StatusTracker progress={60} />);
      expect(screen.getByTestId('progress-fill')).toHaveStyle({ width: '60%' });
    });

    it('does not show progress bar when progress is 0', () => {
      render(<StatusTracker progress={0} />);
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('does not show progress bar by default', () => {
      render(<StatusTracker />);
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });
  });

  describe('Message', () => {
    it('displays status message when provided', () => {
      render(<StatusTracker message="Processing your order..." />);
      expect(screen.getByTestId('status-message')).toHaveTextContent('Processing your order...');
    });

    it('does not display message when empty', () => {
      render(<StatusTracker />);
      expect(screen.queryByTestId('status-message')).not.toBeInTheDocument();
    });
  });

  describe('Error', () => {
    it('displays error when provided', () => {
      render(<StatusTracker error="Something went wrong" />);
      expect(screen.getByTestId('status-error')).toHaveTextContent('Something went wrong');
    });

    it('does not display error when null', () => {
      render(<StatusTracker error={null} />);
      expect(screen.queryByTestId('status-error')).not.toBeInTheDocument();
    });

    it('error has alert role', () => {
      render(<StatusTracker error="Error occurred" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner for PROCESSING status', () => {
      render(<StatusTracker status="PROCESSING" />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows loading spinner for QUEUED status', () => {
      render(<StatusTracker status="QUEUED" />);
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('does not show loading spinner for IDLE status', () => {
      render(<StatusTracker status="IDLE" />);
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('does not show loading spinner for COMPLETED status', () => {
      render(<StatusTracker status="COMPLETED" />);
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });
});
