import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from '../jobs.module';
import { AuthModule } from '../../auth/auth.module';
import { getDatabaseConfig } from '../../../config/database.config';
import { JobAction, JobStatus } from '../../../entities/agent-job.entity';
import { DataSource } from 'typeorm';

describe('JobsController (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(getDatabaseConfig()),
        AuthModule,
        JobsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);

    // Register and login a test user
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'jobtest@example.com',
        password: 'Test@123',
        firstName: 'Job',
        lastName: 'Test',
        phone: '+1234567890',
      });

    authToken = registerResponse.body.access_token;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  describe('POST /jobs', () => {
    it('should create a new job', async () => {
      const response = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.SEARCH_RESTAURANT,
          platform: 'swiggy',
          payload: { query: 'pizza', location: 'Mumbai' },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        status: JobStatus.PENDING,
        action: JobAction.SEARCH_RESTAURANT,
        platform: 'swiggy',
        payload: { query: 'pizza', location: 'Mumbai' },
        progress: 0,
      });
    });

    it('should return 400 for invalid job action', async () => {
      await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: 'invalid_action',
          platform: 'swiggy',
          payload: {},
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/jobs')
        .send({
          action: JobAction.ADD_TO_CART,
          platform: 'zomato',
          payload: {},
        })
        .expect(401);
    });
  });

  describe('GET /jobs/pending', () => {
    it('should return pending jobs', async () => {
      // Create a pending job first
      await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.OPEN_RESTAURANT,
          platform: 'swiggy',
          payload: { restaurantId: 'rest-123' },
        });

      const response = await request(app.getHttpServer())
        .get('/jobs/pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });

    it('should limit results based on query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs/pending?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.jobs.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /jobs/my-jobs', () => {
    it('should return user jobs', async () => {
      const response = await request(app.getHttpServer())
        .get('/jobs/my-jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('jobs');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.jobs)).toBe(true);
    });
  });

  describe('GET /jobs/:jobId', () => {
    it('should return a specific job', async () => {
      // Create a job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.CHECKOUT,
          platform: 'zomato',
          payload: { cartId: 'cart-123' },
        });

      const jobId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: jobId,
        action: JobAction.CHECKOUT,
        platform: 'zomato',
      });
    });

    it('should return 404 for non-existent job', async () => {
      await request(app.getHttpServer())
        .get('/jobs/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /jobs/:jobId/status', () => {
    it('should update job status', async () => {
      // Create a job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.ADD_TO_CART,
          platform: 'swiggy',
          payload: { dishId: 'dish-123' },
        });

      const jobId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .patch(`/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: JobStatus.IN_PROGRESS,
          currentStep: 'Adding item to cart',
          progress: 50,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: jobId,
        status: JobStatus.IN_PROGRESS,
        currentStep: 'Adding item to cart',
        progress: 50,
      });
    });

    it('should return 400 for invalid status transition', async () => {
      // Create a completed job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.TRACK_ORDER,
          platform: 'zomato',
          payload: { orderId: 'order-123' },
        });

      const jobId = createResponse.body.id;

      // Complete the job
      await request(app.getHttpServer())
        .patch(`/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: JobStatus.COMPLETED,
          progress: 100,
        });

      // Try to transition back to pending (invalid)
      await request(app.getHttpServer())
        .patch(`/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: JobStatus.PENDING,
        })
        .expect(400);
    });
  });

  describe('POST /jobs/:jobId/data', () => {
    it('should save job result data', async () => {
      // Create a job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.SEARCH_RESTAURANT,
          platform: 'swiggy',
          payload: { query: 'burger' },
        });

      const jobId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/jobs/${jobId}/data`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          result: {
            restaurants: [
              { id: 'rest-1', name: 'Burger King' },
              { id: 'rest-2', name: 'McDonalds' },
            ],
          },
        })
        .expect(201);

      expect(response.body.result).toMatchObject({
        restaurants: expect.any(Array),
      });
    });
  });

  describe('DELETE /jobs/:jobId', () => {
    it('should cancel a job', async () => {
      // Create a job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.CHECKOUT,
          platform: 'zomato',
          payload: {},
        });

      const jobId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: jobId,
        status: JobStatus.CANCELLED,
        completedAt: expect.any(String),
      });
    });

    it('should return 400 when cancelling completed job', async () => {
      // Create and complete a job
      const createResponse = await request(app.getHttpServer())
        .post('/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          action: JobAction.OPEN_RESTAURANT,
          platform: 'swiggy',
          payload: {},
        });

      const jobId = createResponse.body.id;

      await request(app.getHttpServer())
        .patch(`/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: JobStatus.COMPLETED,
          progress: 100,
        });

      await request(app.getHttpServer())
        .delete(`/jobs/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
