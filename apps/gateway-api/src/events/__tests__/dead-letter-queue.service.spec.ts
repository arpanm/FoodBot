import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { DeadLetterQueueService } from '../dlq/dead-letter-queue.service';
import { KafkaService } from '../kafka.service';

describe('DeadLetterQueueService', () => {
  let dlqService: DeadLetterQueueService;
  let kafkaService: KafkaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeadLetterQueueService,
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

    dlqService = module.get<DeadLetterQueueService>(DeadLetterQueueService);
    kafkaService = module.get<KafkaService>(KafkaService);
    await kafkaService.onModuleInit();
  });

  afterEach(() => {
    dlqService.clear();
    kafkaService.clearMockMessages();
  });

  it('should be defined', () => {
    expect(dlqService).toBeDefined();
  });

  it('should send a message to the DLQ', async () => {
    const dlqId = await dlqService.sendToDlq(
      'order.created',
      'order-123',
      { data: 'test' },
      new Error('Processing failed'),
    );

    expect(dlqId).toBeDefined();

    const messages = dlqService.getMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]!.originalTopic).toBe('order.created');
    expect(messages[0]!.error).toBe('Processing failed');
    expect(messages[0]!.status).toBe('pending');
  });

  it('should retry a DLQ message', async () => {
    const dlqId = await dlqService.sendToDlq(
      'order.created',
      'order-123',
      { data: 'test' },
      new Error('Temporary failure'),
    );

    const result = await dlqService.retryMessage(dlqId);
    expect(result).toBe(true);

    const messages = dlqService.getMessages();
    expect(messages[0]!.status).toBe('resolved');
  });

  it('should mark message as exhausted after max retries', async () => {
    const dlqId = await dlqService.sendToDlq(
      'order.created',
      'order-123',
      { data: 'test' },
      new Error('Persistent failure'),
      3, // Already at max retries
    );

    const messages = dlqService.getMessages();
    expect(messages[0]!.status).toBe('exhausted');

    const result = await dlqService.retryMessage(dlqId);
    expect(result).toBe(false);
  });

  it('should replay all pending messages', async () => {
    await dlqService.sendToDlq('topic.a', 'key-1', { a: 1 }, new Error('err1'));
    await dlqService.sendToDlq('topic.b', 'key-2', { b: 2 }, new Error('err2'));

    const result = await dlqService.replayAll();
    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should return correct stats', async () => {
    await dlqService.sendToDlq('topic.a', 'key-1', {}, new Error('err'));
    await dlqService.sendToDlq('topic.b', 'key-2', {}, new Error('err'), 3);

    const stats = dlqService.getStats();
    expect(stats.total).toBe(2);
    expect(stats.pending).toBe(1);
    expect(stats.exhausted).toBe(1);
  });

  it('should resolve a message without retrying', async () => {
    const dlqId = await dlqService.sendToDlq(
      'topic.a',
      'key-1',
      {},
      new Error('err'),
    );

    const result = dlqService.resolveMessage(dlqId);
    expect(result).toBe(true);

    const messages = dlqService.getMessages();
    expect(messages[0]!.status).toBe('resolved');
  });
});
