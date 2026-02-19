import pino from 'pino';

import { EmailChannel } from '../channels/email.channel';

const logger = pino({ name: 'UserEventConsumer' });

interface UserRegisteredData {
  userId: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Consumes user events and dispatches notifications.
 *
 * Topics:
 * - user.registered -> Welcome email
 */
export class UserEventConsumer {
  constructor(private readonly emailChannel: EmailChannel) {}

  async handleUserRegistered(data: UserRegisteredData): Promise<void> {
    logger.info(
      { userId: data.userId, email: data.email },
      'Processing user.registered notification',
    );

    await this.emailChannel.send({
      to: data.email,
      subject: 'Welcome to FoodBot!',
      body: `Hi ${data.name}, welcome to FoodBot! Start exploring restaurants and ordering delicious food.`,
    });

    logger.info({ userId: data.userId }, 'Welcome email dispatched');
  }
}
