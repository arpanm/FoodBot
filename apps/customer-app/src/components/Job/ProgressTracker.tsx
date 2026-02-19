/**
 * ProgressTracker Component
 * Displays real-time progress of async jobs with visual feedback
 */

import React, { useMemo } from 'react';

import type { Job, JobActionType, JobProgressStep } from '../../types/job.types';
import { getJobProgressSteps } from '../../types/job.types';

import './ProgressTracker.css';

export interface ProgressTrackerProps {
  job: Job;
  showSteps?: boolean;
  compact?: boolean;
  className?: string;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  job,
  showSteps = true,
  compact = false,
  className = '',
}) => {
  /**
   * Get status icon based on job status
   */
  const statusIcon = useMemo(() => {
    switch (job.status) {
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'in_progress':
        return '⏳';
      case 'pending':
        return '⏰';
      case 'cancelled':
        return '🚫';
      default:
        return '🔄';
    }
  }, [job.status]);

  /**
   * Get status label
   */
  const statusLabel = useMemo(() => {
    switch (job.status) {
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'in_progress':
        return 'In Progress';
      case 'pending':
        return 'Pending';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }, [job.status]);

  /**
   * Generate progress steps with status
   */
  const progressSteps = useMemo(() => {
    if (!showSteps) return [];

    const baseSteps = getJobProgressSteps(job.actionType);
    const currentProgress = job.progress || 0;

    return baseSteps.map((step, index): JobProgressStep => {
      const stepProgress = ((index + 1) / baseSteps.length) * 100;

      let status: JobProgressStep['status'];
      if (job.status === 'failed' && currentProgress >= stepProgress - 10) {
        status = 'failed';
      } else if (currentProgress > stepProgress) {
        status = 'completed';
      } else if (currentProgress >= stepProgress - 10 && currentProgress <= stepProgress) {
        status = 'active';
      } else {
        status = 'pending';
      }

      return {
        ...step,
        status,
      };
    });
  }, [job.actionType, job.progress, job.status, showSteps]);

  /**
   * Render compact view
   */
  if (compact) {
    return (
      <div className={`progress-tracker progress-tracker--compact ${className}`}>
        <div className="progress-tracker__header">
          <span className="progress-tracker__icon">{statusIcon}</span>
          <span className="progress-tracker__status">{statusLabel}</span>
          <span className="progress-tracker__percentage">{job.progress || 0}%</span>
        </div>
        <div className="progress-tracker__bar">
          <div
            className={`progress-tracker__fill progress-tracker__fill--${job.status}`}
            style={{ width: `${job.progress || 0}%` }}
          />
        </div>
      </div>
    );
  }

  /**
   * Render full view
   */
  return (
    <div className={`progress-tracker ${className}`} data-testid="progress-tracker">
      {/* Header */}
      <div className="progress-tracker__header">
        <div className="progress-tracker__status-section">
          <span className="progress-tracker__icon" role="img" aria-label={statusLabel}>
            {statusIcon}
          </span>
          <div className="progress-tracker__status-text">
            <h3 className="progress-tracker__status-label">{statusLabel}</h3>
            {job.currentStep && (
              <p className="progress-tracker__current-step">{job.currentStep}</p>
            )}
          </div>
        </div>
        <span className="progress-tracker__percentage">{job.progress || 0}%</span>
      </div>

      {/* Progress Bar */}
      <div className="progress-tracker__bar">
        <div
          className={`progress-tracker__fill progress-tracker__fill--${job.status}`}
          style={{ width: `${job.progress || 0}%` }}
          role="progressbar"
          aria-valuenow={job.progress || 0}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Progress Steps */}
      {showSteps && progressSteps.length > 0 && (
        <div className="progress-tracker__steps">
          {progressSteps.map((step) => (
            <div
              key={step.step}
              className={`progress-tracker__step progress-tracker__step--${step.status}`}
              data-testid={`progress-step-${step.step}`}
            >
              <div className="progress-tracker__step-indicator">
                <div className="progress-tracker__step-number">
                  {step.status === 'completed' ? '✓' : step.status === 'failed' ? '✗' : step.step}
                </div>
              </div>
              <div className="progress-tracker__step-content">
                <div className="progress-tracker__step-label">{step.label}</div>
                {step.description && (
                  <div className="progress-tracker__step-description">{step.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {job.status === 'failed' && job.error && (
        <div className="progress-tracker__error" role="alert">
          <div className="progress-tracker__error-icon">⚠️</div>
          <div className="progress-tracker__error-content">
            <p className="progress-tracker__error-message">{job.error.userMessage}</p>
            {job.error.recoverable && (
              <p className="progress-tracker__error-hint">You can try again or contact support.</p>
            )}
          </div>
        </div>
      )}

      {/* Result */}
      {job.status === 'completed' && job.result && (
        <div className="progress-tracker__result" data-testid="job-result">
          {renderResult(job.result, job.actionType)}
        </div>
      )}
    </div>
  );
};

/**
 * Render job result based on action type
 */
function renderResult(result: unknown, actionType: JobActionType): React.ReactNode {
  if (!result || typeof result !== 'object') {
    return null;
  }

  switch (actionType) {
    case 'PLACE_ORDER':
      return <OrderResult result={result} />;
    case 'SEARCH_RESTAURANTS':
    case 'SEARCH_DISHES':
      return <SearchResult result={result} />;
    case 'ADD_TO_CART':
      return <CartResult result={result} />;
    default:
      return <GenericResult result={result} />;
  }
}

/**
 * Order result component
 */
const OrderResult: React.FC<{ result: unknown }> = ({ result }) => {
  const data = result as {
    orderId?: string;
    orderNumber?: string;
    restaurantName?: string;
    estimatedDeliveryTime?: string;
    total?: number;
  };

  return (
    <div className="result result--order">
      <h4 className="result__title">Order Placed Successfully!</h4>
      <div className="result__details">
        <div className="result__item">
          <span className="result__label">Order Number:</span>
          <span className="result__value">{data.orderNumber || data.orderId}</span>
        </div>
        {data.restaurantName && (
          <div className="result__item">
            <span className="result__label">Restaurant:</span>
            <span className="result__value">{data.restaurantName}</span>
          </div>
        )}
        {data.estimatedDeliveryTime && (
          <div className="result__item">
            <span className="result__label">Estimated Delivery:</span>
            <span className="result__value">{data.estimatedDeliveryTime}</span>
          </div>
        )}
        {data.total !== undefined && (
          <div className="result__item">
            <span className="result__label">Total:</span>
            <span className="result__value">${data.total.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Search result component
 */
const SearchResult: React.FC<{ result: unknown }> = ({ result }) => {
  const data = result as {
    totalCount?: number;
    items?: unknown[];
    hasMore?: boolean;
  };

  return (
    <div className="result result--search">
      <h4 className="result__title">Search Complete</h4>
      <p className="result__message">
        Found {data.totalCount || data.items?.length || 0} result(s)
        {data.hasMore && ' (showing first batch)'}
      </p>
    </div>
  );
};

/**
 * Cart result component
 */
const CartResult: React.FC<{ result: unknown }> = ({ result }) => {
  const data = result as {
    itemCount?: number;
    subtotal?: number;
    message?: string;
  };

  return (
    <div className="result result--cart">
      <h4 className="result__title">Cart Updated</h4>
      <p className="result__message">{data.message || 'Item added to cart'}</p>
      {data.itemCount !== undefined && (
        <p className="result__meta">
          {data.itemCount} item(s) - ${(data.subtotal || 0).toFixed(2)}
        </p>
      )}
    </div>
  );
};

/**
 * Generic result component
 */
const GenericResult: React.FC<{ result: unknown }> = ({ result }) => {
  return (
    <div className="result result--generic">
      <h4 className="result__title">Completed</h4>
      <pre className="result__data">{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
};
