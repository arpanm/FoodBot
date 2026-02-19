import pino from 'pino';

const logger = pino({ name: 'SmsChannel' });

export interface SmsPayload {
  phoneNumber: string;
  message: string;
}

/**
 * SMS notification channel.
 *
 * In production, integrates with Twilio, AWS SNS, or similar.
 * Currently logs the SMS for development.
 */
export class SmsChannel {
  async send(payload: SmsPayload): Promise<void> {
    logger.info(
      { phoneNumber: payload.phoneNumber },
      'Sending SMS notification',
    );

    // Production implementation:
    // await twilioClient.messages.create({
    //   body: payload.message,
    //   to: payload.phoneNumber,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    // });

    logger.info({ phoneNumber: payload.phoneNumber }, 'SMS notification sent');
  }
}
