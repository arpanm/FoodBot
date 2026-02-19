import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

import { Address } from '../entities/address.entity';
import { AgentJob } from '../entities/agent-job.entity';
import { CartItem } from '../entities/cart-item.entity';
import { Cart } from '../entities/cart.entity';
import { Dish } from '../entities/dish.entity';
import { Feedback } from '../entities/feedback.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Order } from '../entities/order.entity';
import { Payment } from '../entities/payment.entity';
import { Restaurant } from '../entities/restaurant.entity';
import { User } from '../entities/user.entity';
import { Workflow } from '../entities/workflow.entity';

const entities = [
  User,
  Address,
  Restaurant,
  Dish,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Payment,
  Feedback,
  Workflow,
  AgentJob,
];

export const getDatabaseConfig = (): TypeOrmModuleOptions => {
  const isTest = process.env.NODE_ENV === 'test';

  if (isTest && process.env.DB_TYPE === 'sqlite') {
    return {
      type: 'sqlite',
      database: process.env.DB_DATABASE || ':memory:',
      entities,
      synchronize: true,
      logging: false,
      dropSchema: true, // Clean slate for each test run
    };
  }

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'foodbot',
    entities,
    synchronize: process.env.NODE_ENV === 'development' || isTest,
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Connection pool settings
    extra: {
      max: parseInt(process.env.DB_POOL_SIZE || '10'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    },
  };
};
