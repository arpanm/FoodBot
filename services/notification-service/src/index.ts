/**
 * FoodBot Notification Service
 *
 * A standalone microservice that consumes Kafka events and dispatches
 * notifications through multiple channels:
 * - Email (order confirmation, status updates)
 * - SMS (delivery updates)
 * - WebSocket (real-time UI updates)
 * - Push notifications (mobile)
 *
 * Consumer group: notification-service
 */
import { NotificationService } from './notification.service';

const service = new NotificationService();

async function main(): Promise<void> {
  await service.start();

  const shutdown = async (): Promise<void> => {
    await service.stop();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

void main();
