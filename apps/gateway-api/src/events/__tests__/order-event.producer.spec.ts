import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { KafkaService } from '../kafka.service';
import { OrderEventProducer } from '../producers/order-event.producer';

describe('OrderEventProducer', () => {
  let producer: OrderEventProducer;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventProducer,
        KafkaService,
        {
          provide: ConfigService,
          useValue: {
            get: (_key: string, defaultValue: string) => {
              if (_key === 'NODE_ENV') return 'test';
              return defaultValue;
            },
          },
        },
      ],
    }).compile();

    producer = module.get<OrderEventProducer>(OrderEventProducer);
    kafkaService = module.get<KafkaService>(KafkaService);
    await kafkaService.onModuleInit();
  });

  afterEach(() => {
    kafkaService.clearMockMessages();
  });

  it('should publish order.created event', async () => {
    const order = {
      id: 'order-456',
      userId: 'user-123',
      restaurantId: 'rest-123',
      items: [
        { dishId: 'dish-1', dishName: 'Pizza', quantity: 2, price: 12.99 },
      ],
      subtotal: 25.98,
      deliveryFee: 3.99,
      tax: 2.08,
      discount: 0,
      total: 32.05,
      paymentMethod: 'card',
      deliveryAddress: { street: '123 Main St' },
      estimatedDeliveryTime: new Date('2026-02-19T12:00:00Z'),
    };

    await producer.publishOrderCreated(order);

    const messages = kafkaService.getMockMessagesByTopic('order.created');
    expect(messages).toHaveLength(1);
    expect(messages[0]!.key).toBe('order-456');

    const event = messages[0]!.value as Record<string, unknown>;
    expect(event.type).toBe('order.created');

    const data = event.data as Record<string, unknown>;
    expect(data.orderId).toBe('order-456');
    expect(data.userId).toBe('user-123');
    expect(data.total).toBe(32.05);
  });

  it('should publish order.status.changed event', async () => {
    await producer.publishOrderStatusChanged({
      orderId: 'order-456',
      userId: 'user-123',
      restaurantId: 'rest-123',
      oldStatus: 'pending',
      newStatus: 'confirmed',
    });

    const messages = kafkaService.getMockMessagesByTopic('order.status.changed');
    expect(messages).toHaveLength(1);

    const event = messages[0]!.value as Record<string, unknown>;
    expect(event.type).toBe('order.status.changed');

    const data = event.data as Record<string, unknown>;
    expect(data.orderId).toBe('order-456');
    expect(data.oldStatus).toBe('pending');
    expect(data.newStatus).toBe('confirmed');
  });

  it('should publish cancellation event with reason', async () => {
    await producer.publishOrderStatusChanged({
      orderId: 'order-789',
      userId: 'user-123',
      restaurantId: 'rest-123',
      oldStatus: 'confirmed',
      newStatus: 'cancelled',
      reason: 'Restaurant closed',
    });

    const messages = kafkaService.getMockMessagesByTopic('order.status.changed');
    expect(messages).toHaveLength(1);

    const data = (messages[0]!.value as Record<string, unknown>).data as Record<string, unknown>;
    expect(data.newStatus).toBe('cancelled');
    expect(data.reason).toBe('Restaurant closed');
  });
});
