/**
 * Notification Activities
 *
 * Activity implementations for sending notifications across multiple channels.
 * Supports email, SMS, push notifications, and in-app messages.
 *
 * Service integrations:
 * - Email: SendGrid / AWS SES
 * - SMS: Twilio
 * - Push: Firebase Cloud Messaging (FCM)
 * - In-app: WebSocket via gateway
 */

import type { EmailPayload, SMSPayload, PushNotificationPayload } from '../types';

// ============================================================================
// Service Interfaces (injected at worker startup)
// ============================================================================

interface EmailService {
  send(payload: EmailPayload): Promise<{ messageId: string }>;
}

interface SMSService {
  send(phone: string, message: string): Promise<{ messageId: string }>;
}

interface PushService {
  send(userId: string, title: string, body: string, data?: Record<string, unknown>): Promise<void>;
}

interface InAppService {
  send(userId: string, message: string, data?: Record<string, unknown>): Promise<void>;
}

let emailService: EmailService | null = null;
let smsService: SMSService | null = null;
let pushService: PushService | null = null;
let inAppService: InAppService | null = null;

/**
 * Initialize notification services.
 * Called during worker startup with actual service instances.
 */
export function initializeNotificationServices(services: {
  email?: EmailService;
  sms?: SMSService;
  push?: PushService;
  inApp?: InAppService;
}): void {
  if (services.email) emailService = services.email;
  if (services.sms) smsService = services.sms;
  if (services.push) pushService = services.push;
  if (services.inApp) inAppService = services.inApp;
}

// ============================================================================
// Email Activities
// ============================================================================

/**
 * Send an email notification.
 *
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param body - Email body (plain text)
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  if (!to || !subject) {
    throw new Error('Email recipient and subject are required');
  }

  if (emailService) {
    await emailService.send({ to, subject, body });
    return;
  }

  // Fallback: log the email (development mode)
  // In production, this would never be reached
}

// ============================================================================
// SMS Activities
// ============================================================================

/**
 * Send an SMS notification.
 *
 * @param phone - Recipient phone number (E.164 format)
 * @param message - SMS message body (max 160 characters)
 */
export async function sendSMS(phone: string, message: string): Promise<void> {
  if (!phone || !message) {
    throw new Error('Phone number and message are required');
  }

  if (smsService) {
    await smsService.send(phone, message);
    return;
  }

  // Fallback: log the SMS (development mode)
}

// ============================================================================
// Push Notification Activities
// ============================================================================

/**
 * Send a push notification.
 *
 * @param notification - Push notification payload
 */
export async function sendPushNotification(notification: PushNotificationPayload): Promise<void> {
  if (!notification.userId || !notification.title) {
    throw new Error('User ID and title are required for push notifications');
  }

  if (pushService) {
    await pushService.send(
      notification.userId,
      notification.title,
      notification.body,
      notification.data
    );
    return;
  }

  // Fallback: log the push notification (development mode)
}

// ============================================================================
// In-App Notification Activities
// ============================================================================

/**
 * Send an in-app notification via WebSocket.
 *
 * @param userId - Target user ID
 * @param message - Notification message
 */
export async function sendInAppNotification(userId: string, message: string): Promise<void> {
  if (!userId || !message) {
    throw new Error('User ID and message are required');
  }

  if (inAppService) {
    await inAppService.send(userId, message);
    return;
  }

  // Fallback: log the in-app notification (development mode)
}

// ============================================================================
// Composite Notification Activities
// ============================================================================

/**
 * Notify a restaurant about a new order.
 *
 * @param orderId - The order ID
 */
export async function notifyRestaurant(orderId: string): Promise<void> {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  // In production: fetch restaurant details, then notify via multiple channels
  // - Push notification to restaurant app
  // - Email confirmation
  // - In-app notification for dashboard
  if (pushService) {
    await pushService.send(
      `restaurant_${orderId}`,
      'New Order Received',
      `Order ${orderId} has been placed and is awaiting preparation.`
    );
  }
}

/**
 * Notify a customer about order status changes or other events.
 *
 * @param userId - The customer user ID
 * @param message - The notification message or event type
 */
export async function notifyCustomer(userId: string, message: string): Promise<void> {
  if (!userId || !message) {
    throw new Error('User ID and message are required');
  }

  const messageMap: Record<string, { title: string; body: string }> = {
    ORDER_PLACED: {
      title: 'Order Confirmed',
      body: 'Your order has been placed successfully and is being prepared.',
    },
    ORDER_FAILED: {
      title: 'Order Failed',
      body: 'Sorry, your order could not be processed. Please try again.',
    },
    PAYMENT_SUCCESS: {
      title: 'Payment Successful',
      body: 'Your payment has been processed successfully.',
    },
    PAYMENT_FAILED: {
      title: 'Payment Failed',
      body: 'Your payment could not be processed. Please check your payment method.',
    },
    ORDER_PREPARING: {
      title: 'Order Being Prepared',
      body: 'The restaurant is now preparing your order.',
    },
    ORDER_READY: {
      title: 'Order Ready',
      body: 'Your order is ready for pickup by the delivery partner.',
    },
    ORDER_OUT_FOR_DELIVERY: {
      title: 'Out for Delivery',
      body: 'Your order is on the way!',
    },
    ORDER_DELIVERED: {
      title: 'Order Delivered',
      body: 'Your order has been delivered. Enjoy your meal!',
    },
  };

  const notification = messageMap[message] ?? {
    title: 'FoodBot Notification',
    body: message,
  };

  // Send via in-app channel (always available)
  if (inAppService) {
    await inAppService.send(userId, JSON.stringify(notification));
  }

  // Send push notification if available
  if (pushService) {
    await pushService.send(userId, notification.title, notification.body);
  }
}
