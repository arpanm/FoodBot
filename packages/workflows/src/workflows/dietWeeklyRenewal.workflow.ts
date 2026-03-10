/**
 * Diet Weekly Renewal Workflow
 *
 * Weekly workflow that checks if a diet plan is active,
 * generates next week's meals, and notifies the user for confirmation.
 */

import {
  proxyActivities,
  defineQuery,
  setHandler,
  log,
} from '@temporalio/workflow';

import type { DietActivities } from './dietDailyScheduler.types';

// ============================================================================
// Activity Proxy Configuration
// ============================================================================

const {
  generateWeeklyMeals,
  notifyMealPlanReady,
} = proxyActivities<DietActivities>({
  startToCloseTimeout: '60s',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 3,
  },
});

// ============================================================================
// Query Definitions
// ============================================================================

export const getRenewalStatusQuery = defineQuery<string>('getRenewalStatus');

// ============================================================================
// Types
// ============================================================================

export interface DietWeeklyRenewalInput {
  userId: string;
  planId: string;
  isActive: boolean;
  autoRenewal: boolean;
}

export interface DietWeeklyRenewalResult {
  userId: string;
  planId: string;
  renewed: boolean;
  reason: string;
}

// ============================================================================
// Diet Weekly Renewal Workflow
// ============================================================================

export async function dietWeeklyRenewalWorkflow(
  input: DietWeeklyRenewalInput,
): Promise<DietWeeklyRenewalResult> {
  log.info('Starting diet weekly renewal', {
    userId: input.userId,
    planId: input.planId,
  });

  let currentStatus = 'checking_status';
  setHandler(getRenewalStatusQuery, () => currentStatus);

  // Step 1: Check if plan is active
  if (!input.isActive) {
    log.info('Plan is not active, skipping renewal');
    return {
      userId: input.userId,
      planId: input.planId,
      renewed: false,
      reason: 'Plan is not active',
    };
  }

  // Step 2: Check if auto-renewal is enabled
  if (!input.autoRenewal) {
    log.info('Auto-renewal is disabled, skipping');
    return {
      userId: input.userId,
      planId: input.planId,
      renewed: false,
      reason: 'Auto-renewal is disabled',
    };
  }

  // Step 3: Generate next week's meals
  currentStatus = 'generating_meals';
  log.info('Generating next week meals');

  const generated = await generateWeeklyMeals(input.planId);
  if (!generated) {
    log.error('Failed to generate weekly meals');
    return {
      userId: input.userId,
      planId: input.planId,
      renewed: false,
      reason: 'Meal generation failed',
    };
  }

  // Step 4: Notify user that plan is ready
  currentStatus = 'notifying_user';
  log.info('Notifying user that meal plan is ready');

  try {
    await notifyMealPlanReady(input.userId, input.planId);
  } catch (error) {
    log.error('Failed to notify user', { error });
  }

  currentStatus = 'completed';
  log.info('Diet weekly renewal completed');

  return {
    userId: input.userId,
    planId: input.planId,
    renewed: true,
    reason: 'Successfully renewed',
  };
}
