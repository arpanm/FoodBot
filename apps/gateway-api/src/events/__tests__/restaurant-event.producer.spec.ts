import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { KafkaService } from '../kafka.service';
import { RestaurantEventProducer } from '../producers/restaurant-event.producer';

describe('RestaurantEventProducer', () => {
  let producer: RestaurantEventProducer;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantEventProducer,
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

    producer = module.get<RestaurantEventProducer>(RestaurantEventProducer);
    kafkaService = module.get<KafkaService>(KafkaService);
    await kafkaService.onModuleInit();
  });

  afterEach(() => {
    kafkaService.clearMockMessages();
  });

  it('should be defined', () => {
    expect(producer).toBeDefined();
  });

  it('should publish restaurant.created event', async () => {
    const restaurant = {
      id: 'rest-123',
      ownerId: 'owner-123',
      name: 'Test Restaurant',
      description: 'A test restaurant',
      cuisineTypes: ['Italian'],
      address: { street: '123 Main St' },
      phoneNumber: '+11234567890',
      email: 'test@restaurant.com',
      rating: 4.5,
      reviewCount: 100,
      priceRange: 'moderate',
      isActive: true,
      isApproved: true,
      latitude: 37.7749,
      longitude: -122.4194,
      deliveryRadius: 10,
      minimumOrder: 15,
      deliveryFee: 3.99,
      preparationTime: 30,
    };

    await producer.publishRestaurantCreated(restaurant);

    const messages = kafkaService.getMockMessagesByTopic('restaurant.created');
    expect(messages).toHaveLength(1);
    expect(messages[0]!.key).toBe('rest-123');

    const event = messages[0]!.value as Record<string, unknown>;
    expect(event.type).toBe('restaurant.created');
    expect(event.eventId).toBeDefined();
    expect(event.timestamp).toBeDefined();

    const data = event.data as Record<string, unknown>;
    expect(data.restaurantId).toBe('rest-123');
    expect(data.name).toBe('Test Restaurant');
  });

  it('should publish restaurant.updated event', async () => {
    await producer.publishRestaurantUpdated('rest-123', { name: 'Updated Name' }, 'owner-123');

    const messages = kafkaService.getMockMessagesByTopic('restaurant.updated');
    expect(messages).toHaveLength(1);

    const event = messages[0]!.value as Record<string, unknown>;
    expect(event.type).toBe('restaurant.updated');

    const data = event.data as Record<string, unknown>;
    expect(data.restaurantId).toBe('rest-123');
    expect(data.updatedBy).toBe('owner-123');
  });

  it('should publish restaurant.deleted event', async () => {
    await producer.publishRestaurantDeleted('rest-123', 'owner-123', 'Closing business');

    const messages = kafkaService.getMockMessagesByTopic('restaurant.deleted');
    expect(messages).toHaveLength(1);

    const event = messages[0]!.value as Record<string, unknown>;
    expect(event.type).toBe('restaurant.deleted');

    const data = event.data as Record<string, unknown>;
    expect(data.restaurantId).toBe('rest-123');
    expect(data.deletedBy).toBe('owner-123');
    expect(data.reason).toBe('Closing business');
  });
});
