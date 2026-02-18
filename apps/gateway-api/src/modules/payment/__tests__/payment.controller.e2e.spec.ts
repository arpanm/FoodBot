import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthTestHelper } from '../../../test/utils/auth-helper';

describe('PaymentController (E2E)', () => {
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

  describe('POST /api/v1/payments/initiate', () => {
    it('should initiate payment successfully', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 50.00,
        paymentMethod: 'card',
        cardDetails: {
          cardNumber: '4242424242424242',
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body).toMatchObject({
        paymentId: expect.any(String),
        status: 'pending',
        orderId: paymentData.orderId,
        amount: paymentData.amount,
      });
    });

    it('should handle UPI payment method', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 50.00,
        paymentMethod: 'upi',
        upiId: 'user@upi',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.paymentMethod).toBe('upi');
    });

    it('should handle wallet payment', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 50.00,
        paymentMethod: 'wallet',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(201);

      expect(response.body.paymentMethod).toBe('wallet');
    });

    it('should return 400 for missing orderId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          amount: 50.00,
          paymentMethod: 'card',
        })
        .expect(400);

      expect(response.body.message).toContain('orderId');
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          amount: -10,
          paymentMethod: 'card',
        })
        .expect(400);

      expect(response.body.message).toContain('amount');
    });

    it('should return 400 for invalid card number', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'order-123',
          amount: 50.00,
          paymentMethod: 'card',
          cardDetails: {
            cardNumber: '1234',
            expiryMonth: '12',
            expiryYear: '2025',
            cvv: '123',
          },
        })
        .expect(400);

      expect(response.body.message).toContain('card');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .send({
          orderId: 'order-123',
          amount: 50.00,
          paymentMethod: 'card',
        })
        .expect(401);
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          orderId: 'nonexistent-order',
          amount: 50.00,
          paymentMethod: 'card',
        })
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });
  });

  describe('POST /api/v1/payments/confirm', () => {
    let paymentId: string;

    beforeEach(() => {
      paymentId = 'payment-123';
    });

    it('should confirm payment successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentId,
          confirmationToken: 'token-123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        paymentId,
        status: 'completed',
        confirmedAt: expect.any(String),
      });
    });

    it('should return 400 for missing paymentId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          confirmationToken: 'token-123',
        })
        .expect(400);

      expect(response.body.message).toContain('paymentId');
    });

    it('should return 400 for invalid confirmation token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentId,
          confirmationToken: 'invalid-token',
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid confirmation token');
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentId: 'nonexistent-payment',
          confirmationToken: 'token-123',
        })
        .expect(404);

      expect(response.body.message).toContain('Payment not found');
    });

    it('should return 409 for already confirmed payment', async () => {
      // Confirm first time
      await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentId,
          confirmationToken: 'token-123',
        });

      // Try to confirm again
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          paymentId,
          confirmationToken: 'token-123',
        })
        .expect(409);

      expect(response.body.message).toContain('already confirmed');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/payments/confirm')
        .send({
          paymentId,
          confirmationToken: 'token-123',
        })
        .expect(401);
    });
  });

  describe('POST /api/v1/payments/webhook', () => {
    it('should handle payment gateway webhook successfully', async () => {
      const webhookData = {
        event: 'payment.success',
        paymentId: 'payment-123',
        amount: 50.00,
        status: 'completed',
        signature: 'valid-signature',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(webhookData)
        .expect(200);

      expect(response.body).toMatchObject({
        received: true,
      });
    });

    it('should handle payment failure webhook', async () => {
      const webhookData = {
        event: 'payment.failed',
        paymentId: 'payment-123',
        reason: 'Insufficient funds',
        signature: 'valid-signature',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('X-Webhook-Signature', 'valid-signature')
        .send(webhookData)
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    it('should return 400 for invalid signature', async () => {
      const webhookData = {
        event: 'payment.success',
        paymentId: 'payment-123',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .set('X-Webhook-Signature', 'invalid-signature')
        .send(webhookData)
        .expect(400);

      expect(response.body.message).toContain('Invalid signature');
    });

    it('should return 400 for missing signature', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/webhook')
        .send({
          event: 'payment.success',
          paymentId: 'payment-123',
        })
        .expect(400);

      expect(response.body.message).toContain('signature');
    });
  });

  describe('GET /api/v1/payments/:id/status', () => {
    let paymentId: string;

    beforeEach(() => {
      paymentId = 'payment-123';
    });

    it('should get payment status successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        paymentId,
        status: expect.stringMatching(/^(pending|completed|failed|refunded)$/),
        amount: expect.any(Number),
        createdAt: expect.any(String),
      });
    });

    it('should include refund details if refunded', async () => {
      const refundedPaymentId = 'refunded-payment-123';

      const response = await request(app.getHttpServer())
        .get(`/api/v1/payments/${refundedPaymentId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      if (response.body.status === 'refunded') {
        expect(response.body).toHaveProperty('refundDetails');
        expect(response.body.refundDetails).toMatchObject({
          refundedAt: expect.any(String),
          refundAmount: expect.any(Number),
        });
      }
    });

    it('should return 404 for non-existent payment', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/payments/nonexistent-payment/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Payment not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}/status`)
        .expect(401);
    });

    it('should return 403 when accessing another user payment', async () => {
      const differentUserToken = authHelper.generateCustomerToken('different-user');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/payments/${paymentId}/status`)
        .set('Authorization', `Bearer ${differentUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  describe('Payment Error Handling', () => {
    it('should handle card declined scenario', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 50.00,
        paymentMethod: 'card',
        cardDetails: {
          cardNumber: '4000000000000002', // Test card that declines
          expiryMonth: '12',
          expiryYear: '2025',
          cvv: '123',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.message).toContain('declined');
    });

    it('should handle insufficient funds', async () => {
      const paymentData = {
        orderId: 'order-123',
        amount: 1000000.00, // Very large amount
        paymentMethod: 'wallet',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(400);

      expect(response.body.message).toContain('Insufficient funds');
    });

    it('should handle payment gateway timeout', async () => {
      const paymentData = {
        orderId: 'order-timeout',
        amount: 50.00,
        paymentMethod: 'card',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/payments/initiate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(paymentData)
        .expect(500);

      expect(response.body.message).toContain('timeout');
    });
  });
});
