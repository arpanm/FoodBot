import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

/**
 * Test module factory for creating NestJS test applications
 */
export class TestModuleFactory {
  /**
   * Creates a testing module with the specified imports and providers
   */
  static async createTestingModule(config: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
  }): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ...(config.imports || []),
      ],
      providers: config.providers || [],
      controllers: config.controllers || [],
    }).compile();
  }

  /**
   * Creates and initializes a NestJS application for testing
   */
  static async createTestApp(module: TestingModule): Promise<INestApplication> {
    const app = module.createNestApplication();

    // Apply global pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      })
    );

    await app.init();
    return app;
  }

  /**
   * Creates a complete test application with common configuration
   */
  static async createFullTestApp(config: {
    imports?: any[];
    providers?: any[];
    controllers?: any[];
  }): Promise<INestApplication> {
    const module = await this.createTestingModule(config);
    return this.createTestApp(module);
  }

  /**
   * Cleanup helper for test applications
   */
  static async closeApp(app: INestApplication): Promise<void> {
    if (app) {
      await app.close();
    }
  }

  /**
   * Creates a supertest request instance
   */
  static getRequest(app: INestApplication): request.SuperTest<request.Test> {
    return request(app.getHttpServer());
  }
}

/**
 * Database cleanup helper for tests
 */
export class DatabaseTestHelper {
  /**
   * Clears all data from test database tables
   */
  static async clearDatabase(entities: any[]): Promise<void> {
    // Implementation would depend on your database setup
    // This is a placeholder for the actual implementation
    for (const entity of entities) {
      // await entity.clear();
    }
  }

  /**
   * Seeds the database with test data
   */
  static async seedDatabase(data: any): Promise<void> {
    // Implementation would depend on your database setup
    // This is a placeholder for the actual implementation
  }
}

/**
 * Mock service factory for creating test doubles
 */
export class MockServiceFactory {
  /**
   * Creates a mock service with all methods returning resolved promises
   */
  static createMockService<T>(methods: string[]): jest.Mocked<T> {
    const mock: any = {};
    methods.forEach((method) => {
      mock[method] = jest.fn().mockResolvedValue(undefined);
    });
    return mock as jest.Mocked<T>;
  }

  /**
   * Creates a mock repository
   */
  static createMockRepository<T>(): any {
    return {
      find: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getOne: jest.fn(),
        getCount: jest.fn(),
      })),
    };
  }
}
