import pino from 'pino';

const logger = pino({ name: 'EmailChannel' });

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
}

/**
 * Email notification channel.
 *
 * In production, integrates with an email provider such as SendGrid,
 * AWS SES, or Mailgun. Currently logs the email for development.
 */
export class EmailChannel {
  async send(payload: EmailPayload): Promise<void> {
    logger.info(
      { to: payload.to, subject: payload.subject },
      'Sending email notification',
    );

    // Production implementation:
    // await emailProvider.send({
    //   from: 'noreply@foodbot.com',
    //   to: payload.to,
    //   subject: payload.subject,
    //   html: payload.body,
    // });

    logger.info({ to: payload.to }, 'Email notification sent');
  }
}
