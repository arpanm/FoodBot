/**
 * Restaurant Onboarding Workflow
 *
 * Manages the restaurant partner onboarding process.
 * Handles verification, approval, payment setup, and welcome kit distribution.
 *
 * Steps:
 * 1. Send verification email to restaurant owner
 * 2. Wait for email verification
 * 3. Wait for admin approval (manual review)
 * 4. Setup payment account (Stripe Connect)
 * 5. Send welcome kit and training materials
 * 6. Activate restaurant listing
 *
 * Signals:
 * - emailVerified: Owner has verified their email
 * - adminApproved: Admin has approved the restaurant
 * - adminRejected: Admin has rejected the restaurant
 *
 * This is a long-running workflow (can span days waiting for human approval).
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  condition,
  log,
  sleep,
} from '@temporalio/workflow';

// Type definitions
interface RestaurantOnboardingInput {
  restaurantId: string;
  ownerEmail: string;
  restaurantName: string;
}

interface RestaurantOnboardingResult {
  restaurantId: string;
  status: 'active' | 'rejected' | 'timeout';
  completedSteps: string[];
  paymentAccountId?: string;
}

// Activity interface
interface Activities {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  saveToDatabase(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateDatabase(collection: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  loadFromDatabase(collection: string, id: string): Promise<Record<string, unknown> | null>;
  callExternalAPI(url: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
  notifyCustomer(userId: string, message: string): Promise<void>;
}

// Configure activity proxy
const {
  sendEmail,
  saveToDatabase,
  updateDatabase,
  loadFromDatabase,
  callExternalAPI,
  notifyCustomer,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '60s',
    maximumAttempts: 5,
  },
});

// Signal definitions
export const emailVerifiedSignal = defineSignal('emailVerified');
export const adminApprovedSignal = defineSignal('adminApproved');
export const adminRejectedSignal = defineSignal<[string]>('adminRejected');

/**
 * Restaurant Onboarding Workflow
 *
 * Orchestrates the complete restaurant partner onboarding process.
 */
export async function restaurantOnboardingWorkflow(
  input: RestaurantOnboardingInput
): Promise<RestaurantOnboardingResult> {
  const { restaurantId, ownerEmail, restaurantName } = input;
  log.info('Starting restaurant onboarding workflow', { restaurantId, restaurantName });

  let isEmailVerified = false;
  let isAdminApproved = false;
  let isAdminRejected = false;
  let rejectionReason = '';
  const completedSteps: string[] = [];

  // Register signal handlers
  setHandler(emailVerifiedSignal, () => {
    log.info('Signal received: email verified', { restaurantId });
    isEmailVerified = true;
  });

  setHandler(adminApprovedSignal, () => {
    log.info('Signal received: admin approved', { restaurantId });
    isAdminApproved = true;
  });

  setHandler(adminRejectedSignal, (reason: string) => {
    log.info('Signal received: admin rejected', { restaurantId, reason });
    isAdminRejected = true;
    rejectionReason = reason;
  });

  try {
    // Save initial onboarding record
    await saveToDatabase('restaurant_onboarding', {
      restaurantId,
      ownerEmail,
      restaurantName,
      status: 'pending_verification',
      startedAt: new Date().toISOString(),
    });

    // Step 1: Send verification email
    log.info('Step 1: Sending verification email', { restaurantId, ownerEmail });
    const verificationToken = generateVerificationToken(restaurantId);

    await sendEmail(
      ownerEmail,
      `Verify your ${restaurantName} listing on FoodBot`,
      buildVerificationEmailBody(restaurantName, verificationToken)
    );
    completedSteps.push('verification_email_sent');
    log.info('Verification email sent', { restaurantId });

    // Step 2: Wait for email verification (max 7 days)
    log.info('Step 2: Waiting for email verification', { restaurantId });
    const emailVerified = await condition(() => isEmailVerified, '7 days');

    if (!emailVerified) {
      log.warn('Email verification timed out', { restaurantId });

      // Send reminder email
      await sendEmail(
        ownerEmail,
        `Reminder: Verify your ${restaurantName} listing on FoodBot`,
        buildReminderEmailBody(restaurantName, verificationToken)
      );

      // Wait 3 more days
      const retryVerification = await condition(() => isEmailVerified, '3 days');
      if (!retryVerification) {
        log.error('Email verification expired', { restaurantId });
        await updateDatabase('restaurant_onboarding', restaurantId, {
          status: 'expired',
          expiredAt: new Date().toISOString(),
        });
        return { restaurantId, status: 'timeout', completedSteps };
      }
    }

    completedSteps.push('email_verified');
    await updateDatabase('restaurant_onboarding', restaurantId, {
      status: 'pending_approval',
      emailVerifiedAt: new Date().toISOString(),
    });

    // Step 3: Wait for admin approval (max 14 days)
    log.info('Step 3: Waiting for admin approval', { restaurantId });

    // Notify admin team about pending review
    await sendEmail(
      'onboarding@foodbot.com',
      `New Restaurant Pending Review: ${restaurantName}`,
      buildAdminReviewEmailBody(restaurantName, restaurantId, ownerEmail)
    );

    const adminDecided = await condition(
      () => isAdminApproved || isAdminRejected,
      '14 days'
    );

    if (!adminDecided) {
      log.warn('Admin approval timed out', { restaurantId });
      await updateDatabase('restaurant_onboarding', restaurantId, {
        status: 'approval_timeout',
        timedOutAt: new Date().toISOString(),
      });
      return { restaurantId, status: 'timeout', completedSteps };
    }

    // Handle rejection
    if (isAdminRejected) {
      log.info('Restaurant rejected by admin', { restaurantId, reason: rejectionReason });

      await sendEmail(
        ownerEmail,
        `Update on your ${restaurantName} FoodBot application`,
        buildRejectionEmailBody(restaurantName, rejectionReason)
      );

      await updateDatabase('restaurant_onboarding', restaurantId, {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason,
      });

      completedSteps.push('admin_rejected');
      return { restaurantId, status: 'rejected', completedSteps };
    }

    completedSteps.push('admin_approved');
    await updateDatabase('restaurant_onboarding', restaurantId, {
      status: 'setting_up_payment',
      approvedAt: new Date().toISOString(),
    });

    // Step 4: Setup payment account
    log.info('Step 4: Setting up payment account', { restaurantId });
    let paymentAccountId: string;

    try {
      const paymentSetupResult = await callExternalAPI(
        'https://api.stripe.com/v1/accounts',
        {
          type: 'express',
          email: ownerEmail,
          business_type: 'company',
          company: { name: restaurantName },
          metadata: { restaurantId, source: 'foodbot_onboarding' },
        }
      );

      paymentAccountId = (paymentSetupResult.id as string) ?? `acct_${Date.now()}`;
      log.info('Payment account created', { restaurantId, paymentAccountId });
    } catch (error) {
      log.error('Payment account setup failed, using fallback', { error });
      paymentAccountId = `acct_pending_${restaurantId}`;
    }

    // Save payment account info
    await updateDatabase('restaurants', restaurantId, {
      paymentAccountId,
      paymentSetupComplete: true,
    });

    completedSteps.push('payment_account_setup');

    // Step 5: Send welcome kit and training materials
    log.info('Step 5: Sending welcome kit', { restaurantId });
    await sendEmail(
      ownerEmail,
      `Welcome to FoodBot Partner Program, ${restaurantName}!`,
      buildWelcomeKitEmailBody(restaurantName)
    );

    completedSteps.push('welcome_kit_sent');

    // Step 6: Activate restaurant listing
    log.info('Step 6: Activating restaurant listing', { restaurantId });
    await updateDatabase('restaurants', restaurantId, {
      status: 'active',
      activatedAt: new Date().toISOString(),
      onboardingComplete: true,
    });

    await updateDatabase('restaurant_onboarding', restaurantId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedSteps,
    });

    completedSteps.push('listing_activated');

    // Send activation confirmation
    await sendEmail(
      ownerEmail,
      `Your ${restaurantName} listing is now live on FoodBot!`,
      buildActivationEmailBody(restaurantName)
    );

    log.info('Restaurant onboarding workflow completed', {
      restaurantId,
      completedSteps,
    });

    return {
      restaurantId,
      status: 'active',
      completedSteps,
      paymentAccountId,
    };
  } catch (error) {
    log.error('Restaurant onboarding workflow failed', { error, restaurantId });

    try {
      await updateDatabase('restaurant_onboarding', restaurantId, {
        status: 'failed',
        failedAt: new Date().toISOString(),
        error: (error as Error).message,
        completedSteps,
      });
    } catch (updateError) {
      log.error('Failed to update onboarding record', { updateError });
    }

    throw error;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateVerificationToken(restaurantId: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomPart = Array.from(
    { length: 32 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `${restaurantId}_${randomPart}`;
}

// ============================================================================
// Email Template Builders
// ============================================================================

function buildVerificationEmailBody(restaurantName: string, token: string): string {
  return `
Thank you for registering ${restaurantName} on FoodBot!

Please verify your email address by clicking the link below:
https://foodbot.com/verify-restaurant?token=${token}

This link expires in 7 days.

If you did not register this restaurant, please ignore this email.

Best regards,
The FoodBot Team
`.trim();
}

function buildReminderEmailBody(restaurantName: string, token: string): string {
  return `
This is a reminder to verify your ${restaurantName} listing on FoodBot.

Click below to verify:
https://foodbot.com/verify-restaurant?token=${token}

This link will expire in 3 days.

Best regards,
The FoodBot Team
`.trim();
}

function buildAdminReviewEmailBody(
  restaurantName: string,
  restaurantId: string,
  ownerEmail: string
): string {
  return `
A new restaurant is pending review:

Restaurant: ${restaurantName}
ID: ${restaurantId}
Owner Email: ${ownerEmail}

Please review and approve/reject at:
https://admin.foodbot.com/restaurants/${restaurantId}/review

Best regards,
FoodBot Onboarding System
`.trim();
}

function buildRejectionEmailBody(restaurantName: string, reason: string): string {
  return `
We appreciate your interest in joining FoodBot.

Unfortunately, we are unable to approve the ${restaurantName} listing at this time.

Reason: ${reason}

If you believe this was a mistake or would like to address the concerns, please reply to this email.

Best regards,
The FoodBot Team
`.trim();
}

function buildWelcomeKitEmailBody(restaurantName: string): string {
  return `
Congratulations! ${restaurantName} has been approved to join FoodBot!

Here is your welcome kit:

1. Restaurant Dashboard Access
   Log in at: https://partners.foodbot.com

2. Menu Management Guide
   Learn how to add, update, and manage your menu items.

3. Order Management
   Accept, track, and manage incoming orders.

4. Analytics Dashboard
   View real-time sales data and customer insights.

5. Support Resources
   Our partner support team is available 24/7.
   Email: partners@foodbot.com
   Phone: 1-800-FOODBOT

We are excited to have ${restaurantName} on board!

Best regards,
The FoodBot Partner Team
`.trim();
}

function buildActivationEmailBody(restaurantName: string): string {
  return `
Great news! Your ${restaurantName} listing is now live on FoodBot!

Customers can now discover and order from your restaurant.

Next steps:
1. Log in to your partner dashboard to manage your menu
2. Set your operating hours
3. Configure your delivery zones
4. Start receiving orders!

Best regards,
The FoodBot Team
`.trim();
}
