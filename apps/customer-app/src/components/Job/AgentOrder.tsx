/**
 * AgentOrder Component
 * Main component for handling agent-initiated orders with job polling
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useJobPoller } from '../../hooks/useJobPoller';
import type { Job, PlaceOrderJobResult } from '../../types/job.types';
import { Button } from '../common/Button';
import { ErrorMessage } from '../common/ErrorMessage';

import { OrderConfirmation } from './OrderConfirmation';
import { ProgressTracker } from './ProgressTracker';

import './AgentOrder.css';

export interface AgentOrderProps {
  jobId: string | null;
  onComplete?: (result: PlaceOrderJobResult) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
  autoNavigateOnSuccess?: boolean;
  className?: string;
}

export const AgentOrder: React.FC<AgentOrderProps> = ({
  jobId,
  onComplete,
  onCancel,
  onError,
  autoNavigateOnSuccess = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Poll job status
  const { job, isLoading, isPolling, error, retry, cancel, reset } = useJobPoller<PlaceOrderJobResult>(
    jobId,
    {
      pollingInterval: 2000,
      maxAttempts: 150,
      enabled: !!jobId && !showConfirmation,
      onComplete: (completedJob: Job<PlaceOrderJobResult>) => {
        setShowConfirmation(true);
        onComplete?.(completedJob.result as PlaceOrderJobResult);

        // Auto-navigate to order tracking
        if (autoNavigateOnSuccess && completedJob.result?.orderId) {
          setTimeout(() => {
            navigate(`/orders/${completedJob.result?.orderId}`);
          }, 3000);
        }
      },
      onError: (jobError) => {
        onError?.(new Error(jobError.message));
      },
    }
  );

  // Reset confirmation when jobId changes
  useEffect(() => {
    if (jobId) {
      setShowConfirmation(false);
    }
  }, [jobId]);

  /**
   * Handle cancel job
   */
  const handleCancel = useCallback(async () => {
    try {
      await cancel();
      onCancel?.();
    } catch (err) {
      // Error already handled by useJobPoller
    }
  }, [cancel, onCancel]);

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    setShowConfirmation(false);
    retry();
  }, [retry]);

  /**
   * Handle view order
   */
  const handleViewOrder = useCallback(
    (orderId: string) => {
      navigate(`/orders/${orderId}`);
    },
    [navigate]
  );

  /**
   * Handle track order
   */
  const handleTrackOrder = useCallback(
    (orderId: string) => {
      navigate(`/orders/${orderId}/track`);
    },
    [navigate]
  );

  /**
   * Handle back to home
   */
  const handleBackToHome = useCallback(() => {
    reset();
    navigate('/');
  }, [reset, navigate]);

  // No job ID provided
  if (!jobId) {
    return (
      <div className={`agent-order agent-order--empty ${className}`}>
        <p className="agent-order__empty-message">No order is being processed</p>
      </div>
    );
  }

  // Show confirmation screen
  if (showConfirmation && job?.result) {
    return (
      <div className={`agent-order agent-order--confirmation ${className}`}>
        <OrderConfirmation
          result={job.result}
          onViewOrder={handleViewOrder}
          onTrackOrder={handleTrackOrder}
          onBackToHome={handleBackToHome}
        />
      </div>
    );
  }

  // Show error state
  if (error && !isPolling) {
    return (
      <div className={`agent-order agent-order--error ${className}`}>
        <ErrorMessage
          title="Order Processing Failed"
          message={error.userMessage}
          details={error.message}
          className="agent-order__error"
        />
        <div className="agent-order__error-actions">
          {error.recoverable && (
            <Button
              variant="primary"
              onClick={handleRetry}
              data-testid="retry-button"
            >
              Try Again
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="cancel-button"
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Show loading state (initial load)
  if (isLoading && !job) {
    return (
      <div className={`agent-order agent-order--loading ${className}`}>
        <div className="agent-order__loading-spinner" />
        <p className="agent-order__loading-message">Initializing order...</p>
      </div>
    );
  }

  // Show progress tracker
  return (
    <div className={`agent-order ${className}`} data-testid="agent-order">
      {/* Header */}
      <div className="agent-order__header">
        <h2 className="agent-order__title">Processing Your Order</h2>
        <p className="agent-order__subtitle">Please wait while we confirm your order</p>
      </div>

      {/* Progress Tracker */}
      {job && (
        <ProgressTracker
          job={job}
          showSteps={true}
          className="agent-order__progress"
        />
      )}

      {/* Actions */}
      {isPolling && (
        <div className="agent-order__actions">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={!isPolling}
            data-testid="cancel-order-button"
          >
            Cancel Order
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="agent-order__info">
        <p className="agent-order__info-text">
          This may take a few moments. Please don&apos;t close this page.
        </p>
      </div>
    </div>
  );
};
