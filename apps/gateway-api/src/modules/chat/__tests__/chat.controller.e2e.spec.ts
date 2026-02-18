import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../../app.module';
import { UserFactory } from '../../../test/factories/user.factory';
import { AuthTestHelper } from '../../../test/utils/auth-helper';

describe('ChatController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      })
    );

    await app.init();
    authHelper = new AuthTestHelper(app);

    // Create a test user and get token
    const user = UserFactory.createCustomer();
    userId = user.id;
    authToken = authHelper.generateCustomerToken(userId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/chat', () => {
    it('should create a job and return jobId for valid message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'I want pizza for dinner',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        jobId: expect.stringMatching(/^job_[a-zA-Z0-9]+$/),
        status: 'QUEUED',
        message: 'Job queued successfully',
      });
      expect(response.body.jobId).toBeDefined();
    });

    it('should handle conversation context with sessionId', async () => {
      const sessionId = 'session_123';

      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'Show me the menu',
          sessionId,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        jobId: expect.any(String),
        status: 'QUEUED',
        sessionId,
      });
    });

    it('should handle location-based queries', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'Find restaurants near me',
          location: {
            latitude: 37.7749,
            longitude: -122.4194,
          },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        jobId: expect.any(String),
        status: 'QUEUED',
      });
    });

    it('should handle cuisine preference queries', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'I want Italian food',
          preferences: {
            cuisineTypes: ['Italian'],
            priceRange: 'moderate',
          },
        })
        .expect(201);

      expect(response.body.jobId).toBeDefined();
    });

    it('should handle dietary restriction queries', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'Show me vegetarian options',
          preferences: {
            isVegetarian: true,
          },
        })
        .expect(201);

      expect(response.body.jobId).toBeDefined();
    });

    it('should return 400 for missing userId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'I want pizza for dinner',
        })
        .expect(400);

      expect(response.body.message).toContain('userId');
    });

    it('should return 400 for missing message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
        })
        .expect(400);

      expect(response.body.message).toContain('message');
    });

    it('should return 400 for empty message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: '',
        })
        .expect(400);

      expect(response.body.message).toContain('message');
    });

    it('should return 400 for message exceeding max length', async () => {
      const longMessage = 'a'.repeat(2001); // Assuming max length is 2000

      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: longMessage,
        })
        .expect(400);

      expect(response.body.message).toContain('message');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat')
        .send({
          userId,
          message: 'I want pizza',
        })
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          userId,
          message: 'I want pizza',
        })
        .expect(401);
    });

    it('should return 403 when userId does not match authenticated user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: 'different-user-id',
          message: 'I want pizza',
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should handle special characters in message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'I want pizza with "extra cheese" & jalapeños!',
        })
        .expect(201);

      expect(response.body.jobId).toBeDefined();
    });

    it('should handle multilingual messages', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'Je veux une pizza',
        })
        .expect(201);

      expect(response.body.jobId).toBeDefined();
    });
  });

  describe('GET /api/v1/jobs/:jobId/status', () => {
    let jobId: string;

    beforeEach(async () => {
      // Create a job first
      const chatResponse = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'I want pizza',
        });

      jobId = chatResponse.body.jobId;
    });

    it('should return job status for valid jobId', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        jobId,
        status: expect.stringMatching(
          /^(QUEUED|IN_PROGRESS|COMPLETED|FAILED)$/
        ),
      });
    });

    it('should return job result when completed', async () => {
      // Wait for job to complete (or mock completion)
      // This might require polling or mocking

      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.status === 'COMPLETED') {
        expect(response.body).toHaveProperty('result');
        expect(response.body.result).toHaveProperty('response');
      }
    });

    it('should return progress updates when in progress', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.status === 'IN_PROGRESS') {
        expect(response.body).toHaveProperty('progress');
        expect(response.body.progress).toMatchObject({
          currentStep: expect.any(String),
          totalSteps: expect.any(Number),
          currentStepNumber: expect.any(Number),
        });
      }
    });

    it('should return error details when job failed', async () => {
      // Mock a failed job or wait for one to fail

      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.status === 'FAILED') {
        expect(response.body).toHaveProperty('error');
        expect(response.body.error).toMatchObject({
          code: expect.any(String),
          message: expect.any(String),
        });
      }
    });

    it('should return 404 for non-existent jobId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/jobs/job_nonexistent/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.message).toContain('Job not found');
    });

    it('should return 400 for invalid jobId format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/jobs/invalid-format/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.message).toContain('Invalid job ID');
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .expect(401);
    });

    it('should return 403 when accessing another user job', async () => {
      // Create a different user token
      const differentUserToken = authHelper.generateCustomerToken('different-user-id');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${differentUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should handle concurrent status polling', async () => {
      // Make multiple concurrent requests
      const requests = Array(5)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get(`/api/v1/jobs/${jobId}/status`)
            .set('Authorization', `Bearer ${authToken}`)
        );

      const responses = await Promise.all(requests);

      responses.forEach((response: { status: number; body: { jobId: string } }) => {
        expect(response.status).toBe(200);
        expect(response.body.jobId).toBe(jobId);
      });
    });

    it('should include timestamp in status response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(new Date(response.body.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should return 410 for expired job', async () => {
      // Mock an expired job (older than retention period)

      const expiredJobId = 'job_expired123';
      const response = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${expiredJobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(410);

      expect(response.body.message).toContain('expired');
    });
  });

  describe('Chat Workflow Integration', () => {
    it('should complete full chat workflow: search -> select -> order', async () => {
      // Step 1: Search for restaurants
      const searchResponse = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'Show me pizza restaurants',
        })
        .expect(201);

      const searchJobId = searchResponse.body.jobId;

      // Poll for completion
      let searchResult;
      for (let i = 0; i < 10; i++) {
        const statusResponse = await request(app.getHttpServer())
          .get(`/api/v1/jobs/${searchJobId}/status`)
          .set('Authorization', `Bearer ${authToken}`);

        if (statusResponse.body.status === 'COMPLETED') {
          searchResult = statusResponse.body.result;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      expect(searchResult).toBeDefined();
      expect(searchResult.restaurants).toBeInstanceOf(Array);
    });

    it('should handle error recovery in workflow', async () => {
      // Send a query that might cause errors
      const response = await request(app.getHttpServer())
        .post('/api/v1/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId,
          message: 'Invalid query that causes error',
        })
        .expect(201);

      const jobId = response.body.jobId;

      // Wait and check if error is handled gracefully
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusResponse = await request(app.getHttpServer())
        .get(`/api/v1/jobs/${jobId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (statusResponse.body.status === 'FAILED') {
        expect(statusResponse.body.error).toBeDefined();
        expect(statusResponse.body.error.message).toBeTruthy();
      }
    });
  });
});
