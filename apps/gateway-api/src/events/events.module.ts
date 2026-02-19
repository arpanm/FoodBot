import { Global, Module } from '@nestjs/common';

import { DeadLetterQueueService } from './dlq/dead-letter-queue.service';
import { EventReplayService } from './dlq/event-replay.service';
import { KafkaService } from './kafka.service';
import { EventMetricsService } from './monitoring/event-metrics.service';
import { DishEventProducer } from './producers/dish-event.producer';
import { OrderEventProducer } from './producers/order-event.producer';
import { PaymentEventProducer } from './producers/payment-event.producer';
import { RestaurantEventProducer } from './producers/restaurant-event.producer';

/**
 * Global events module that exposes Kafka producers, DLQ,
 * event replay, and monitoring services to the entire application.
 *
 * Marked @Global so that any module can inject the producers without
 * explicitly importing EventsModule.
 */
@Global()
@Module({
  providers: [
    KafkaService,
    RestaurantEventProducer,
    DishEventProducer,
    OrderEventProducer,
    PaymentEventProducer,
    DeadLetterQueueService,
    EventReplayService,
    EventMetricsService,
  ],
  exports: [
    KafkaService,
    RestaurantEventProducer,
    DishEventProducer,
    OrderEventProducer,
    PaymentEventProducer,
    DeadLetterQueueService,
    EventReplayService,
    EventMetricsService,
  ],
})
export class EventsModule {}
