import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { OrderFactory } from '../../../test/factories/order.factory';
import { AuthTestHelper } from '../../../test/utils/auth-helper';

describe('FeedbackController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let customerToken: string;
  let userId: string;

  beforeAll(async () => {
    const { AppModule } = await import('../../../app.module');
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

    userId = 'customer-123';
    customerToken = authHelper.generateCustomerToken(userId);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/feedback', () => {
    it('should submit feedback successfully', async () => {
      const feedbackData = OrderFactory.createFeedback({
        rating: 5,
        comment: 'Excellent food and service!',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          ...feedbackData,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        orderId: 'order-123',
        userId,
        rating: feedbackData.rating,
        comment: feedbackData.comment,
      });
    });

    it('should submit feedback without comment', async () => {
      const feedbackData = {
        orderId: 'order-123',
        rating: 4,
        foodQuality: 4,
        deliverySpeed: 5,
        packaging: 4,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(feedbackData)
        .expect(201);

      expect(response.body.rating).toBe(4);
      expect(response.body.comment).toBeUndefined();
    });

    it('should return 400 for missing orderId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rating: 5,
          comment: 'Great!',
        })
        .expect(400);

      expect(response.body.message).toContain('orderId');
    });

    it('should return 400 for invalid rating', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          rating: 6, // Rating should be 1-5
        })
        .expect(400);

      expect(response.body.message).toContain('rating');
    });

    it('should return 400 for negative rating', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          rating: -1,
        })
        .expect(400);

      expect(response.body.message).toContain('rating');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'nonexistent-order',
          rating: 5,
        })
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    it('should return 400 for order not delivered', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'pending-order-123',
          rating: 5,
        })
        .expect(400);

      expect(response.body.message).toContain('Order not delivered yet');
    });

    it('should return 409 for duplicate feedback', async () => {
      const feedbackData = {
        orderId: 'order-123',
        rating: 5,
        comment: 'Great!',
      };

      // Submit first time
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(feedbackData)
        .expect(201);

      // Try to submit again
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(feedbackData)
        .expect(409);

      expect(response.body.message).toContain('Feedback already submitted');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .send({
          orderId: 'order-123',
          rating: 5,
        })
        .expect(401);
    });

    it('should return 403 for feedback on another user order', async () => {
      const differentUserToken = authHelper.generateCustomerToken('different-user');

      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${differentUserToken}`)
        .send({
          orderId: 'order-123', // Order belongs to userId
          rating: 5,
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should validate foodQuality rating range', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          rating: 5,
          foodQuality: 10, // Should be 1-5
        })
        .expect(400);

      expect(response.body.message).toContain('foodQuality');
    });

    it('should validate deliverySpeed rating range', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          rating: 5,
          deliverySpeed: 0, // Should be 1-5
        })
        .expect(400);

      expect(response.body.message).toContain('deliverySpeed');
    });

    it('should handle long comments', async () => {
      const longComment = 'a'.repeat(1000);

      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          rating: 5,
          comment: longComment,
        })
        .expect(201);

      expect(response.body.comment).toBe(longComment);
    });

    it('should reject extremely long comments', async () => {
      const veryLongComment = 'a'.repeat(5001); // Assuming max is 5000

      const response = await request(app.getHttpServer())
        .post('/api/v1/feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          rating: 5,
          comment: veryLongComment,
        })
        .expect(400);

      expect(response.body.message).toContain('comment');
    });
  });

  describe('GET /api/v1/feedback/:orderId', () => {
    let orderId: string;

    beforeEach(() => {
      orderId = 'order-123';
    });

    it('should get feedback for order successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/feedback/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        orderId,
        rating: expect.any(Number),
        createdAt: expect.any(String),
      });
    });

    it('should return 404 for order without feedback', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/feedback/order-no-feedback')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Feedback not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/feedback/${orderId}`)
        .expect(401);
    });

    it('should return 403 for accessing another user feedback', async () => {
      const differentUserToken = authHelper.generateCustomerToken('different-user');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/feedback/${orderId}`)
        .set('Authorization', `Bearer ${differentUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should include all rating components', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/feedback/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        rating: expect.any(Number),
        foodQuality: expect.any(Number),
        deliverySpeed: expect.any(Number),
        packaging: expect.any(Number),
      });
    });
  });
});
