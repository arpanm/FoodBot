/**
 * Job Types
 * Types for asynchronous job processing and polling
 */

// ==================== Job Status Types ====================

export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type JobActionType =
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

// ==================== Job Models ====================

export interface Job<TResult = unknown, TMetadata = unknown> {
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

export interface JobError {
  code: string;
  message: string;
  userMessage: string;
  details?: Record<string, unknown>;
  recoverable?: boolean;
  retryAfter?: number;
}

// ==================== Job Result Types ====================

export interface PlaceOrderJobResult {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  estimatedDeliveryTime: string;
  total: number;
  paymentStatus: string;
}

export interface SearchJobResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  filters?: Record<string, unknown>;
}

export interface OrderModificationJobResult {
  orderId: string;
  message: string;
  newTotal?: number;
  refundAmount?: number;
}

export interface CartJobResult {
  itemCount: number;
  subtotal: number;
  message: string;
}

export interface PaymentJobResult {
  paymentId: string;
  status: string;
  amount: number;
  transactionId?: string;
}

// ==================== Job Metadata Types ====================

export interface OrderJobMetadata {
  restaurantId: string;
  restaurantName: string;
  itemCount: number;
  totalAmount: number;
}

export interface SearchJobMetadata {
  query: string;
  filters?: Record<string, unknown>;
  resultCount?: number;
}

// ==================== Job Polling Types ====================

export interface JobPollingOptions {
  pollingInterval?: number;
  maxAttempts?: number;
  enabled?: boolean;
  onComplete?: (job: Job) => void;
  onError?: (error: JobError) => void;
  onProgress?: (progress: number) => void;
}

export interface JobPollingState {
  job: Job | null;
  isLoading: boolean;
  isPolling: boolean;
  error: JobError | null;
  attempts: number;
}

// ==================== Progress Steps ====================

export interface JobProgressStep {
  step: number;
  label: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  timestamp?: string;
}

export const ORDER_PLACEMENT_STEPS: Omit<JobProgressStep, 'status' | 'timestamp'>[] = [
  {
    step: 1,
    label: 'Validating Order',
    description: 'Checking items and availability',
  },
  {
    step: 2,
    label: 'Processing Payment',
    description: 'Securing your payment',
  },
  {
    step: 3,
    label: 'Confirming with Restaurant',
    description: 'Sending order to restaurant',
  },
  {
    step: 4,
    label: 'Order Confirmed',
    description: 'Your order has been placed',
  },
];

export const SEARCH_STEPS: Omit<JobProgressStep, 'status' | 'timestamp'>[] = [
  {
    step: 1,
    label: 'Searching',
    description: 'Finding the best matches',
  },
  {
    step: 2,
    label: 'Filtering',
    description: 'Applying your preferences',
  },
  {
    step: 3,
    label: 'Results Ready',
    description: 'Preparing your results',
  },
];

// ==================== Type Guards ====================

export function isJobCompleted(job: Job): boolean {
  return job.status === 'completed';
}

export function isJobFailed(job: Job): boolean {
  return job.status === 'failed';
}

export function isJobTerminal(job: Job): boolean {
  return ['completed', 'failed', 'cancelled'].includes(job.status);
}

export function isJobActive(job: Job): boolean {
  return ['pending', 'in_progress'].includes(job.status);
}

// ==================== Helper Functions ====================

export function getJobProgressSteps(actionType: JobActionType): Omit<JobProgressStep, 'status' | 'timestamp'>[] {
  switch (actionType) {
    case 'PLACE_ORDER':
    case 'CHECKOUT':
      return ORDER_PLACEMENT_STEPS;
    case 'SEARCH_RESTAURANTS':
    case 'SEARCH_DISHES':
      return SEARCH_STEPS;
    default:
      return [];
  }
}

export function calculateJobProgress(currentStep?: string, totalSteps?: number): number {
  if (!currentStep || !totalSteps) return 0;
  const stepMatch = currentStep.match(/(\d+)/);
  if (!stepMatch) return 0;
  const current = parseInt(stepMatch[1], 10);
  return Math.min(100, Math.round((current / totalSteps) * 100));
}
