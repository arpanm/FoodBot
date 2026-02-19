import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { KafkaService } from '../kafka.service';

describe('KafkaService', () => {
  let service: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KafkaService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: string) => {
              if (key === 'NODE_ENV') return 'test';
              return defaultValue;
            },
          },
        },
      ],
    }).compile();

    service = module.get<KafkaService>(KafkaService);
    await service.onModuleInit();
  });

  afterEach(() => {
    service.clearMockMessages();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use mock mode in test environment', () => {
    expect(service.isMockMode()).toBe(true);
  });

  it('should publish a message to a topic', async () => {
    await service.publish('test.topic', 'key-1', { data: 'test' });

    const messages = service.getMockMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.topic).toBe('test.topic');
    expect(messages[0]!.key).toBe('key-1');
    expect(messages[0]!.value).toEqual({ data: 'test' });
  });

  it('should publish multiple messages', async () => {
    await service.publish('topic.a', 'key-1', { a: 1 });
    await service.publish('topic.b', 'key-2', { b: 2 });
    await service.publish('topic.a', 'key-3', { a: 3 });

    expect(service.getMockMessages()).toHaveLength(3);
    expect(service.getMockMessagesByTopic('topic.a')).toHaveLength(2);
    expect(service.getMockMessagesByTopic('topic.b')).toHaveLength(1);
  });

  it('should clear mock messages', async () => {
    await service.publish('test.topic', 'key-1', { data: 'test' });
    expect(service.getMockMessages()).toHaveLength(1);

    service.clearMockMessages();
    expect(service.getMockMessages()).toHaveLength(0);
  });

  it('should include timestamp in published messages', async () => {
    await service.publish('test.topic', 'key-1', { data: 'test' });

    const messages = service.getMockMessages();
    expect(messages[0]!.timestamp).toBeDefined();
    expect(new Date(messages[0]!.timestamp).getTime()).toBeGreaterThan(0);
  });
});
