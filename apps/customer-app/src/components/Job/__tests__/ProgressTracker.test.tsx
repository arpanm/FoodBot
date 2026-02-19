/**
 * ProgressTracker Component Tests
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { Job } from '../../../types/job.types';

import { ProgressTracker } from '../ProgressTracker';

describe('ProgressTracker', () => {
  const mockPendingJob: Job = {
    id: 'job-123',
    status: 'pending',
    actionType: 'PLACE_ORDER',
    progress: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockInProgressJob: Job = {
    id: 'job-123',
    status: 'in_progress',
    actionType: 'PLACE_ORDER',
    progress: 50,
    currentStep: 'Processing Payment',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockCompletedJob: Job = {
    id: 'job-123',
    status: 'completed',
    actionType: 'PLACE_ORDER',
    progress: 100,
    result: {
      orderId: 'order-123',
      orderNumber: 'ORD-123',
      restaurantName: 'Pizza Hut',
      estimatedDeliveryTime: '30 minutes',
      total: 25.99,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:01:00Z',
  };

  const mockFailedJob: Job = {
    id: 'job-123',
    status: 'failed',
    actionType: 'PLACE_ORDER',
    progress: 75,
    error: {
      code: 'PAYMENT_FAILED',
      message: 'Payment processing failed',
      userMessage: 'Unable to process your payment',
      recoverable: true,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  it('should render pending job status', () => {
    render(<ProgressTracker job={mockPendingJob} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should render in-progress job status', () => {
    render(<ProgressTracker job={mockInProgressJob} />);

    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('Processing Payment')).toBeInTheDocument();
  });

  it('should render completed job status', () => {
    render(<ProgressTracker job={mockCompletedJob} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should render failed job status with error', () => {
    render(<ProgressTracker job={mockFailedJob} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Unable to process your payment')).toBeInTheDocument();
    expect(screen.getByText('You can try again or contact support.')).toBeInTheDocument();
  });

  it('should render progress bar with correct width', () => {
    render(<ProgressTracker job={mockInProgressJob} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('should render progress steps when enabled', () => {
    render(<ProgressTracker job={mockInProgressJob} showSteps={true} />);

    expect(screen.getByTestId('progress-step-1')).toBeInTheDocument();
    expect(screen.getByTestId('progress-step-2')).toBeInTheDocument();
    expect(screen.getByTestId('progress-step-3')).toBeInTheDocument();
    expect(screen.getByTestId('progress-step-4')).toBeInTheDocument();
  });

  it('should not render progress steps when disabled', () => {
    render(<ProgressTracker job={mockInProgressJob} showSteps={false} />);

    expect(screen.queryByTestId('progress-step-1')).not.toBeInTheDocument();
  });

  it('should render order result when completed', () => {
    render(<ProgressTracker job={mockCompletedJob} />);

    expect(screen.getByTestId('job-result')).toBeInTheDocument();
    expect(screen.getByText('Order Placed Successfully!')).toBeInTheDocument();
    expect(screen.getByText('ORD-123')).toBeInTheDocument();
    expect(screen.getByText('Pizza Hut')).toBeInTheDocument();
    expect(screen.getByText('30 minutes')).toBeInTheDocument();
    expect(screen.getByText('$25.99')).toBeInTheDocument();
  });

  it('should render in compact mode', () => {
    const { container } = render(
      <ProgressTracker job={mockInProgressJob} compact={true} />
    );

    expect(
      container.querySelector('.progress-tracker--compact')
    ).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ProgressTracker job={mockInProgressJob} className="custom-class" />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should show correct status icon for each status', () => {
    const { rerender } = render(<ProgressTracker job={mockPendingJob} />);
    expect(screen.getByLabelText('Pending')).toHaveTextContent('⏰');

    rerender(<ProgressTracker job={mockInProgressJob} />);
    expect(screen.getByLabelText('In Progress')).toHaveTextContent('⏳');

    rerender(<ProgressTracker job={mockCompletedJob} />);
    expect(screen.getByLabelText('Completed')).toHaveTextContent('✅');

    rerender(<ProgressTracker job={mockFailedJob} />);
    expect(screen.getByLabelText('Failed')).toHaveTextContent('❌');
  });

  it('should render search result correctly', () => {
    const searchJob: Job = {
      id: 'job-123',
      status: 'completed',
      actionType: 'SEARCH_RESTAURANTS',
      progress: 100,
      result: {
        totalCount: 15,
        items: [],
        hasMore: true,
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
    };

    render(<ProgressTracker job={searchJob} />);

    expect(screen.getByText('Search Complete')).toBeInTheDocument();
    expect(screen.getByText(/Found 15 result\(s\)/)).toBeInTheDocument();
  });

  it('should render cart result correctly', () => {
    const cartJob: Job = {
      id: 'job-123',
      status: 'completed',
      actionType: 'ADD_TO_CART',
      progress: 100,
      result: {
        itemCount: 3,
        subtotal: 45.5,
        message: 'Item added successfully',
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
    };

    render(<ProgressTracker job={cartJob} />);

    expect(screen.getByText('Cart Updated')).toBeInTheDocument();
    expect(screen.getByText('Item added successfully')).toBeInTheDocument();
    expect(screen.getByText(/3 item\(s\)/)).toBeInTheDocument();
  });

  it('should handle missing result gracefully', () => {
    const jobWithoutResult: Job = {
      id: 'job-123',
      status: 'completed',
      actionType: 'PLACE_ORDER',
      progress: 100,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      completedAt: '2024-01-01T00:01:00Z',
    };

    render(<ProgressTracker job={jobWithoutResult} />);

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.queryByTestId('job-result')).not.toBeInTheDocument();
  });

  it('should handle missing error message for failed job', () => {
    const failedJobWithoutError: Job = {
      id: 'job-123',
      status: 'failed',
      actionType: 'PLACE_ORDER',
      progress: 50,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    render(<ProgressTracker job={failedJobWithoutError} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
