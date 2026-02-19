# Job Polling System

A comprehensive React-based job polling system for tracking asynchronous operations with real-time progress updates.

## Overview

The job polling system provides a complete solution for handling long-running operations initiated by AI agents or user actions. It includes hooks, components, and utilities for polling job status, displaying progress, and handling completion or errors.

## Architecture

```
┌─────────────────┐
│   AgentOrder    │  ← Main integration component
└────────┬────────┘
         │
         ├─► useJobPoller Hook  ← Polling logic
         │   └─► jobsService    ← API calls
         │
         ├─► ProgressTracker    ← Progress visualization
         │
         └─► OrderConfirmation  ← Success state
```

## Components

### AgentOrder

Main component that orchestrates the entire job polling workflow.

**Props:**
```typescript
interface AgentOrderProps {
  jobId: string | null;
  onComplete?: (result: PlaceOrderJobResult) => void;
  onCancel?: () => void;
  onError?: (error: Error) => void;
  autoNavigateOnSuccess?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
import { AgentOrder } from '@/components/Job';

function OrderPage() {
  const [jobId, setJobId] = useState<string | null>(null);

  return (
    <AgentOrder
      jobId={jobId}
      onComplete={(result) => {
        console.log('Order completed:', result);
      }}
      onCancel={() => {
        console.log('Order cancelled');
      }}
      autoNavigateOnSuccess={true}
    />
  );
}
```

### ProgressTracker

Displays real-time progress of jobs with visual feedback.

**Props:**
```typescript
interface ProgressTrackerProps {
  job: Job;
  showSteps?: boolean;
  compact?: boolean;
  className?: string;
}
```

**Usage:**
```tsx
import { ProgressTracker } from '@/components/Job';

function JobStatus({ job }: { job: Job }) {
  return (
    <ProgressTracker
      job={job}
      showSteps={true}
      compact={false}
    />
  );
}
```

**Features:**
- Progress bar with percentage
- Step-by-step progress visualization
- Status icons and labels
- Error display with recovery hints
- Result rendering based on action type
- Compact mode for space-constrained layouts

### OrderConfirmation

Displays order confirmation with action buttons.

**Props:**
```typescript
interface OrderConfirmationProps {
  result: PlaceOrderJobResult;
  onViewOrder?: (orderId: string) => void;
  onTrackOrder?: (orderId: string) => void;
  onBackToHome?: () => void;
  className?: string;
}
```

**Usage:**
```tsx
import { OrderConfirmation } from '@/components/Job';

function SuccessPage({ orderResult }: { orderResult: PlaceOrderJobResult }) {
  return (
    <OrderConfirmation
      result={orderResult}
      onTrackOrder={(orderId) => navigate(`/orders/${orderId}/track`)}
      onViewOrder={(orderId) => navigate(`/orders/${orderId}`)}
      onBackToHome={() => navigate('/')}
    />
  );
}
```

## Hooks

### useJobPoller

Custom hook for polling job status with automatic retry and error handling.

**Signature:**
```typescript
function useJobPoller<TResult = unknown, TMetadata = unknown>(
  jobId: string | null,
  options?: JobPollingOptions
): JobPollingState & {
  retry: () => void;
  cancel: () => void;
  reset: () => void;
}
```

**Options:**
```typescript
interface JobPollingOptions {
  pollingInterval?: number;      // Default: 2000ms
  maxAttempts?: number;           // Default: 150 (5 minutes)
  enabled?: boolean;              // Default: true
  onComplete?: (job: Job) => void;
  onError?: (error: JobError) => void;
  onProgress?: (progress: number) => void;
}
```

**Return Value:**
```typescript
interface JobPollingState {
  job: Job | null;
  isLoading: boolean;
  isPolling: boolean;
  error: JobError | null;
  attempts: number;
}
```

**Usage:**
```tsx
import { useJobPoller } from '@/hooks/useJobPoller';

function CustomJobTracker({ jobId }: { jobId: string }) {
  const { job, isPolling, error, retry, cancel } = useJobPoller(jobId, {
    pollingInterval: 2000,
    maxAttempts: 150,
    onComplete: (job) => {
      console.log('Job completed:', job);
      showSuccessToast('Operation completed!');
    },
    onError: (error) => {
      console.error('Job failed:', error);
      showErrorToast(error.userMessage);
    },
    onProgress: (progress) => {
      console.log('Progress:', progress);
    },
  });

  if (error) {
    return (
      <div>
        <p>Error: {error.userMessage}</p>
        <button onClick={retry}>Retry</button>
      </div>
    );
  }

  if (isPolling) {
    return <div>Processing... {job?.progress}%</div>;
  }

  return <div>Completed!</div>;
}
```

## Services

### jobsService

API client for job-related operations.

**Methods:**
```typescript
class JobsService {
  async getJobStatus<TResult, TMetadata>(
    jobId: string
  ): Promise<Job<TResult, TMetadata>>;

  async cancelJob(jobId: string): Promise<Job>;

  async getJobHistory(limit?: number): Promise<Job[]>;

  async retryJob(jobId: string): Promise<Job>;
}
```

**Usage:**
```typescript
import { jobsService } from '@/services/jobs.service';

// Get job status
const job = await jobsService.getJobStatus('job-123');

// Cancel job
await jobsService.cancelJob('job-123');

// Get job history
const history = await jobsService.getJobHistory(10);

// Retry failed job
const newJob = await jobsService.retryJob('job-123');
```

## Types

### Job

Main job interface:

```typescript
interface Job<TResult = unknown, TMetadata = unknown> {
  id: string;
  status: JobStatus;
  actionType: JobActionType;
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  result?: TResult;
  error?: JobError;
  metadata?: TMetadata;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

type JobActionType =
  | 'PLACE_ORDER'
  | 'SEARCH_RESTAURANTS'
  | 'SEARCH_DISHES'
  | 'MODIFY_ORDER'
  | 'CANCEL_ORDER'
  | 'TRACK_ORDER'
  | 'ADD_TO_CART'
  | 'CHECKOUT'
  | 'APPLY_COUPON'
  | 'PAYMENT_PROCESSING'
  | 'GENERAL';
```

### JobError

Error information:

```typescript
interface JobError {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
  recoverable?: boolean;
  retryAfter?: number;
}
```

### Result Types

Typed results for different action types:

```typescript
interface PlaceOrderJobResult {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  estimatedDeliveryTime: string;
  total: number;
  paymentStatus: string;
}

interface SearchJobResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  filters?: Record<string, unknown>;
}

interface CartJobResult {
  itemCount: number;
  subtotal: number;
  message: string;
}
```

## Styling

All components come with pre-built CSS that can be customized via CSS variables or by overriding classes.

### CSS Variables

```css
:root {
  --job-primary-color: #4CAF50;
  --job-error-color: #f44336;
  --job-warning-color: #ff9800;
  --job-info-color: #2196F3;
}
```

### Custom Styling

```tsx
<ProgressTracker
  job={job}
  className="my-custom-tracker"
/>
```

```css
.my-custom-tracker {
  /* Your custom styles */
}

.my-custom-tracker .progress-tracker__bar {
  height: 12px;
}
```

## Best Practices

### 1. Always Handle Errors

```tsx
const { job, error } = useJobPoller(jobId, {
  onError: (error) => {
    // Log to error tracking service
    logError(error);

    // Show user-friendly message
    showToast(error.userMessage);
  },
});
```

### 2. Set Appropriate Timeouts

```tsx
// For quick operations (< 30 seconds)
useJobPoller(jobId, {
  pollingInterval: 1000,
  maxAttempts: 30,
});

// For long operations (up to 5 minutes)
useJobPoller(jobId, {
  pollingInterval: 2000,
  maxAttempts: 150,
});
```

### 3. Clean Up on Unmount

The hook automatically cleans up, but you can manually reset:

```tsx
const { reset } = useJobPoller(jobId);

useEffect(() => {
  return () => {
    reset(); // Clean up on unmount
  };
}, [reset]);
```

### 4. Handle Navigation

```tsx
const { job } = useJobPoller(jobId, {
  onComplete: (job) => {
    // Navigate after short delay for user to see success
    setTimeout(() => {
      navigate(`/orders/${job.result.orderId}`);
    }, 2000);
  },
});
```

### 5. Provide User Feedback

```tsx
<AgentOrder
  jobId={jobId}
  onComplete={(result) => {
    showSuccessToast('Order placed successfully!');
  }}
  onError={(error) => {
    showErrorToast(error.message);
  }}
/>
```

## Testing

### Testing Components

```typescript
import { render, screen } from '@testing-library/react';
import { ProgressTracker } from '@/components/Job';

test('renders progress tracker', () => {
  const job = {
    id: 'job-123',
    status: 'in_progress',
    actionType: 'PLACE_ORDER',
    progress: 50,
  };

  render(<ProgressTracker job={job} />);

  expect(screen.getByText('In Progress')).toBeInTheDocument();
  expect(screen.getByText('50%')).toBeInTheDocument();
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useJobPoller } from '@/hooks/useJobPoller';

test('polls job status', async () => {
  const { result } = renderHook(() => useJobPoller('job-123'));

  await waitFor(() => {
    expect(result.current.isPolling).toBe(true);
  });
});
```

## Performance Considerations

1. **Polling Interval**: Balance between responsiveness and server load
2. **Max Attempts**: Set reasonable limits to prevent infinite polling
3. **Cleanup**: Components automatically cleanup on unmount
4. **Memoization**: Progress steps are memoized to prevent unnecessary re-renders
5. **Conditional Rendering**: Only render expensive components when needed

## Accessibility

- All components use semantic HTML
- Progress bars have proper ARIA attributes
- Status icons have aria-labels
- Error messages use role="alert"
- Keyboard navigation supported for all interactive elements

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android 70+

## License

Part of the FoodBot project.
