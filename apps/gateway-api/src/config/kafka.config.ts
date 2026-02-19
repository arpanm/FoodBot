import { Logger } from '@nestjs/common';

const logger = new Logger('KafkaConfig');

/**
 * Kafka configuration for the NestJS gateway-api service.
 *
 * In production, connects to the Kafka cluster defined by KAFKA_BROKERS.
 * In test mode, returns a mock-friendly configuration with no real connections.
 */
export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  connectionTimeout: number;
  requestTimeout: number;
  retry: {
    initialRetryTime: number;
    retries: number;
    maxRetryTime: number;
    factor: number;
  };
  ssl: boolean;
  sasl: {
    mechanism: string;
    username: string;
    password: string;
  } | undefined;
}

export function getKafkaConfig(): KafkaConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const brokers = (process.env.KAFKA_BROKERS || 'localhost:29092').split(',');

  if (nodeEnv === 'test') {
    logger.log('Using mock Kafka configuration for test environment');
  }

  const config: KafkaConfig = {
    brokers,
    clientId: 'foodbot-gateway-api',
    connectionTimeout: 5000,
    requestTimeout: 30000,
    retry: {
      initialRetryTime: 300,
      retries: 5,
      maxRetryTime: 30000,
      factor: 2,
    },
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME
      ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM || 'plain',
          username: process.env.KAFKA_SASL_USERNAME,
          password: process.env.KAFKA_SASL_PASSWORD || '',
        }
      : undefined,
  };

  return config;
}

/**
 * Kafka producer configuration defaults.
 */
export const KAFKA_PRODUCER_CONFIG = {
  allowAutoTopicCreation: true,
  idempotent: true,
  maxInFlightRequests: 5,
  acks: -1 as const, // All replicas must acknowledge
  timeout: 30000,
};

/**
 * Kafka consumer configuration defaults.
 */
export const KAFKA_CONSUMER_CONFIG = {
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576, // 1MB
  autoCommit: false,
};
