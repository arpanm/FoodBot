import React from 'react';

import { Card } from '../common/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';

export interface StatusTrackerProps {
  jobId?: string | null;
  status?: string;
  progress?: number;
  message?: string;
  error?: string | null;
  'data-testid'?: string;
}

/**
 * Status tracker component for job/order status
 */
export const StatusTracker: React.FC<StatusTrackerProps> = ({
  status = 'IDLE',
  progress = 0,
  message = '',
  error = null,
  'data-testid': testId,
}) => {
  const isLoading = status === 'PROCESSING' || status === 'QUEUED';

  return (
    <div className="status-tracker" data-testid={testId || 'status-tracker'}>
      <Card variant="outlined">
        <div className="status-header">
          <span data-testid="status-label">{status}</span>
          {isLoading && <LoadingSpinner size="small" />}
        </div>

        {progress > 0 && (
          <div className="progress-bar" data-testid="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
              data-testid="progress-fill"
            />
            <span data-testid="progress-text">{progress}%</span>
          </div>
        )}

        {message && (
          <div data-testid="status-message">{message}</div>
        )}

        {error && (
          <div className="status-error" data-testid="status-error" role="alert">
            {error}
          </div>
        )}
      </Card>
    </div>
  );
};
