/**
 * User Onboarding Workflow
 *
 * Manages the new user onboarding experience with timed engagement emails.
 *
 * Steps:
 * 1. Send welcome email immediately
 * 2. Wait 1 day, then send getting started guide
 * 3. Wait 3 days, check if user has placed an order
 * 4. If no order, send first-order discount code
 * 5. Wait 7 days, send feedback request
 *
 * Signals:
 * - orderPlaced: User places their first order (skips discount step)
 *
 * This is a long-running workflow (can span up to 11 days).
 */

import {
  proxyActivities,
  defineSignal,
  setHandler,
  log,
  sleep,
} from '@temporalio/workflow';

// Type definitions
interface UserOnboardingInput {
  userId: string;
  email: string;
  name: string;
}

interface UserOnboardingResult {
  userId: string;
  completedSteps: string[];
  firstOrderPlaced: boolean;
  discountSent: boolean;
}

// Activity interface
interface Activities {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  loadFromDatabase(collection: string, id: string): Promise<Record<string, unknown> | null>;
  saveToDatabase(collection: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  updateDatabase(collection: string, id: string, data: Record<string, unknown>): Promise<Record<string, unknown>>;
  notifyCustomer(userId: string, message: string): Promise<void>;
}

// Configure activity proxy
const {
  sendEmail,
  loadFromDatabase,
  saveToDatabase,
  updateDatabase,
  notifyCustomer,
} = proxyActivities<Activities>({
  startToCloseTimeout: '30s',
  retry: {
    initialInterval: '2s',
    backoffCoefficient: 2,
    maximumInterval: '30s',
    maximumAttempts: 3,
  },
});

// Signal definitions
export const orderPlacedSignal = defineSignal<[string]>('orderPlaced');

/**
 * User Onboarding Workflow
 *
 * Orchestrates a multi-day onboarding sequence for new users.
 */
export async function userOnboardingWorkflow(
  input: UserOnboardingInput
): Promise<UserOnboardingResult> {
  const { userId, email, name } = input;
  log.info('Starting user onboarding workflow', { userId, email });

  let hasPlacedOrder = false;
  const completedSteps: string[] = [];
  let discountSent = false;

  // Register signal handler for first order
  setHandler(orderPlacedSignal, (orderId: string) => {
    log.info('Signal received: user placed first order', { userId, orderId });
    hasPlacedOrder = true;
  });

  try {
    // Save onboarding record
    await saveToDatabase('onboarding', {
      userId,
      email,
      name,
      startedAt: new Date().toISOString(),
      status: 'in_progress',
    });

    // Step 1: Send welcome email immediately
    log.info('Step 1: Sending welcome email', { userId, email });
    await sendEmail(
      email,
      `Welcome to FoodBot, ${name}!`,
      buildWelcomeEmailBody(name)
    );
    completedSteps.push('welcome_email');
    log.info('Welcome email sent', { userId });

    // Send in-app welcome notification
    try {
      await notifyCustomer(userId, `Welcome to FoodBot, ${name}! Explore restaurants near you.`);
    } catch (error) {
      log.error('Failed to send in-app welcome notification', { error });
    }

    // Step 2: Wait 1 day, then send getting started guide
    log.info('Step 2: Waiting 1 day before sending getting started guide', { userId });
    await sleep('1 day');

    log.info('Sending getting started guide', { userId });
    await sendEmail(
      email,
      'Getting Started with FoodBot',
      buildGettingStartedBody(name)
    );
    completedSteps.push('getting_started_guide');

    // Step 3: Wait 3 more days, check if user has placed an order
    log.info('Step 3: Waiting 3 days before discount check', { userId });
    await sleep('3 days');

    // Check if user has placed an order (via signal or database check)
    if (!hasPlacedOrder) {
      log.info('Checking database for first order', { userId });
      const orderCheck = await loadFromDatabase('orders', userId);
      if (orderCheck) {
        hasPlacedOrder = true;
      }
    }

    // Step 4: Send discount code if no order placed
    if (!hasPlacedOrder) {
      log.info('Step 4: No order placed, sending discount code', { userId });
      const discountCode = generateDiscountCode(userId);

      await sendEmail(
        email,
        'Here is 20% off your first FoodBot order!',
        buildDiscountEmailBody(name, discountCode)
      );

      // Save discount code to database
      await saveToDatabase('discount_codes', {
        userId,
        code: discountCode,
        discount: 20,
        type: 'percentage',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        used: false,
      });

      completedSteps.push('discount_sent');
      discountSent = true;
      log.info('Discount code sent', { userId, discountCode });
    } else {
      log.info('Step 4: User already placed first order, skipping discount', { userId });
      completedSteps.push('discount_skipped_order_placed');
    }

    // Step 5: Wait 7 more days, send feedback request
    log.info('Step 5: Waiting 7 days before feedback request', { userId });
    await sleep('7 days');

    log.info('Sending feedback request', { userId });
    await sendEmail(
      email,
      'How is your FoodBot experience?',
      buildFeedbackEmailBody(name)
    );
    completedSteps.push('feedback_request');

    // Update onboarding record as completed
    await updateDatabase('onboarding', userId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedSteps,
      firstOrderPlaced: hasPlacedOrder,
      discountSent,
    });

    log.info('User onboarding workflow completed', {
      userId,
      completedSteps,
      firstOrderPlaced: hasPlacedOrder,
    });

    return {
      userId,
      completedSteps,
      firstOrderPlaced: hasPlacedOrder,
      discountSent,
    };
  } catch (error) {
    log.error('User onboarding workflow failed', { error, userId });

    // Update onboarding record with failure
    try {
      await updateDatabase('onboarding', userId, {
        status: 'failed',
        failedAt: new Date().toISOString(),
        completedSteps,
        error: (error as Error).message,
      });
    } catch (updateError) {
      log.error('Failed to update onboarding record', { updateError });
    }

    throw error;
  }
}

// ============================================================================
// Email Template Builders
// ============================================================================

function buildWelcomeEmailBody(name: string): string {
  return `
Hi ${name},

Welcome to FoodBot! We are excited to have you on board.

With FoodBot, you can:
- Discover amazing restaurants near you
- Order food with just a few taps
- Track your delivery in real-time
- Get personalized recommendations

Start exploring restaurants now and enjoy your first meal!

Best regards,
The FoodBot Team
`.trim();
}

function buildGettingStartedBody(name: string): string {
  return `
Hi ${name},

Here are some tips to get the most out of FoodBot:

1. Set your dietary preferences in your profile
2. Save your favorite restaurants for quick access
3. Use our AI-powered search to find exactly what you are craving
4. Enable notifications to track your orders in real-time

Need help? Our support team is available 24/7.

Happy ordering!
The FoodBot Team
`.trim();
}

function buildDiscountEmailBody(name: string, discountCode: string): string {
  return `
Hi ${name},

We noticed you have not placed your first order yet. Here is a special offer just for you!

Use code ${discountCode} to get 20% off your first order.

This code expires in 7 days, so do not miss out!

Order now and taste the difference.

Cheers,
The FoodBot Team
`.trim();
}

function buildFeedbackEmailBody(name: string): string {
  return `
Hi ${name},

We would love to hear about your FoodBot experience so far!

Your feedback helps us improve our service for everyone. Please take a moment to share your thoughts.

Thank you for being a valued member of the FoodBot community!

Best regards,
The FoodBot Team
`.trim();
}

function generateDiscountCode(userId: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const randomPart = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `WELCOME${randomPart}`;
}
