import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { OrderFactory } from '../../../test/factories/order.factory';
import { AuthTestHelper } from '../../../test/utils/auth-helper';
import type { TestOrder } from '../../../test-helpers/types';

describe('OrderController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let customerToken: string;
  let ownerToken: string;
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
    ownerToken = authHelper.generateRestaurantOwnerToken('owner-123', 'restaurant-123');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/orders (Checkout)', () => {
    it('should create order successfully', async () => {
      const orderData = OrderFactory.createOrderData();

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId,
        status: 'pending',
        total: expect.any(Number),
      });
    });

    it('should return 400 for empty cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [] })
        .expect(400);

      expect(response.body.message).toContain('Cart is empty');
    });

    it('should return 400 for missing delivery address', async () => {
      const orderData = OrderFactory.createOrderData();
      delete (orderData as any).deliveryAddress;

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.message).toContain('deliveryAddress');
    });

    it('should validate payment method', async () => {
      const orderData = OrderFactory.createOrderData();
      (orderData as any).paymentMethod = 'invalid-method';

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.message).toContain('paymentMethod');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send(OrderFactory.createOrderData())
        .expect(401);
    });
  });

  describe('GET /api/v1/orders', () => {
    it('should get user orders successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        orders: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 20,
      });
    });

    it('should filter orders by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .query({ status: 'delivered' })
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      response.body.orders.forEach((order: TestOrder) => {
        expect(order.status).toBe('delivered');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders')
        .query({ page: 2, limit: 10 })
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/orders').expect(401);
    });
  });

  describe('GET /api/v1/orders/:id', () => {
    let orderId: string;

    beforeEach(() => {
      orderId = 'order-123';
    });

    it('should get order by ID successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: orderId,
        userId,
        items: expect.any(Array),
        status: expect.any(String),
      });
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/nonexistent-id')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    it('should return 403 for accessing another user order', async () => {
      const differentUserToken = authHelper.generateCustomerToken('different-user');

      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${differentUserToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/orders/:id/tracking', () => {
    let orderId: string;

    beforeEach(() => {
      orderId = 'order-123';
    });

    it('should get order tracking successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        orderId,
        status: expect.any(String),
        trackingUpdates: expect.any(Array),
        estimatedDeliveryTime: expect.any(String),
      });
    });

    it('should include real-time location for out-for-delivery', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      if (response.body.status === 'out-for-delivery') {
        expect(response.body).toHaveProperty('currentLocation');
        expect(response.body.currentLocation).toMatchObject({
          latitude: expect.any(Number),
          longitude: expect.any(Number),
        });
      }
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/orders/nonexistent-id/tracking')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/orders/${orderId}/tracking`)
        .expect(401);
    });
  });

  describe('POST /api/v1/orders/:id/cancel', () => {
    let orderId: string;

    beforeEach(() => {
      orderId = 'order-123';
    });

    it('should cancel order successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: orderId,
        status: 'cancelled',
      });
    });

    it('should return 400 for already delivered order', async () => {
      const deliveredOrderId = 'delivered-order-123';

      const response = await request(app.getHttpServer())
        .post(`/api/v1/orders/${deliveredOrderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Test' })
        .expect(400);

      expect(response.body.message).toContain('Cannot cancel delivered order');
    });

    it('should return 404 for non-existent order', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders/nonexistent-id/cancel')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Test' })
        .expect(404);

      expect(response.body.message).toContain('Order not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/orders/${orderId}/cancel`)
        .send({ reason: 'Test' })
        .expect(401);
    });
  });

  describe('PUT /api/v1/orders/:id/status', () => {
    let orderId: string;

    beforeEach(() => {
      orderId = 'order-123';
    });

    it('should update order status as restaurant owner', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'preparing' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: orderId,
        status: 'preparing',
      });
    });

    it('should return 400 for invalid status transition', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ status: 'delivered' }) // Can't go directly to delivered
        .expect(400);

      expect(response.body.message).toContain('Invalid status transition');
    });

    it('should return 403 for customer role', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'preparing' })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/orders/${orderId}/status`)
        .send({ status: 'preparing' })
        .expect(401);
    });
  });
});
