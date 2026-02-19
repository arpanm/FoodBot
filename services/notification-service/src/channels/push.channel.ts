import pino from 'pino';

const logger = pino({ name: 'PushChannel' });

export interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Push notification channel for mobile devices.
 *
 * In production, integrates with Firebase Cloud Messaging (FCM)
 * or Apple Push Notification Service (APNS).
 * Currently logs for development.
 */
export class PushChannel {
  async send(payload: PushPayload): Promise<void> {
    logger.info(
      { userId: payload.userId, title: payload.title },
      'Sending push notification',
    );

    // Production implementation:
    // await firebase.messaging().send({
    //   token: userDeviceToken,
    //   notification: { title: payload.title, body: payload.body },
    //   data: payload.data,
    // });

    logger.info({ userId: payload.userId }, 'Push notification sent');
  }
}
