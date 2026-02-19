/**
 * JobPollingExample Component
 * Example demonstrating how to use job polling components
 */

import React, { useState } from 'react';

import { chatService } from '../../services/chat.service';
import { Button } from '../common/Button';

import { AgentOrder } from './AgentOrder';

import './JobPollingExample.css';

/**
 * Example component showing job polling integration
 */
export const JobPollingExample: React.FC = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Simulate placing an order via chat
   */
  const handlePlaceOrder = async () => {
    try {
      setIsProcessing(true);

      // Send message to chat service
      const response = await chatService.sendMessage(
        'I want to order a pizza from Pizza Hut'
      );

      // Start polling with the returned job ID
      setJobId(response.jobId);
    } catch (error) {
      console.error('Failed to place order:', error);
      alert('Failed to start order process');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle order completion
   */
  const handleOrderComplete = (result: unknown) => {
    console.log('Order completed:', result);
    // You can show a toast notification or navigate to order details
  };

  /**
   * Handle order cancellation
   */
  const handleOrderCancel = () => {
    console.log('Order cancelled');
    setJobId(null);
  };

  /**
   * Handle order error
   */
  const handleOrderError = (error: Error) => {
    console.error('Order error:', error);
    // You can show an error toast
  };

  return (
    <div className="job-polling-example">
      <div className="job-polling-example__container">
        <h1 className="job-polling-example__title">Job Polling Demo</h1>

        {/* Show order button when no job is active */}
        {!jobId && (
          <div className="job-polling-example__start">
            <p className="job-polling-example__description">
              This demo shows how job polling works for agent-initiated orders.
              Click the button below to simulate placing an order.
            </p>
            <Button
              variant="primary"
              size="large"
              onClick={handlePlaceOrder}
              disabled={isProcessing}
            >
              {isProcessing ? 'Starting...' : 'Place Sample Order'}
            </Button>
          </div>
        )}

        {/* Show AgentOrder component when job is active */}
        {jobId && (
          <AgentOrder
            jobId={jobId}
            onComplete={handleOrderComplete}
            onCancel={handleOrderCancel}
            onError={handleOrderError}
            autoNavigateOnSuccess={false}
          />
        )}
      </div>

      {/* Usage Instructions */}
      <div className="job-polling-example__instructions">
        <h2 className="job-polling-example__instructions-title">How to Use</h2>
        <div className="job-polling-example__code-block">
          <pre>{`import { AgentOrder } from '@/components/Job';
import { useJobPoller } from '@/hooks/useJobPoller';

// Basic usage
<AgentOrder
  jobId={jobId}
  onComplete={(result) => console.log('Done!', result)}
  onCancel={() => console.log('Cancelled')}
  onError={(error) => console.error('Error:', error)}
  autoNavigateOnSuccess={true}
/>

// Advanced usage with custom hook
const { job, isPolling, error, retry, cancel } = useJobPoller(jobId, {
  pollingInterval: 2000,
  maxAttempts: 150,
  onComplete: (job) => console.log('Job completed:', job),
  onError: (error) => console.error('Job error:', error),
  onProgress: (progress) => console.log('Progress:', progress),
});`}</pre>
        </div>
      </div>
    </div>
  );
};
