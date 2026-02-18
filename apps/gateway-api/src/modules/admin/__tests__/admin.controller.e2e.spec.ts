import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthTestHelper } from '../../../test/utils/auth-helper';
import { TestUser, TestRestaurant } from '../../../test-helpers/types';

describe('AdminController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let adminToken: string;
  let customerToken: string;
  let ownerToken: string;

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

    adminToken = authHelper.generateAdminToken();
    customerToken = authHelper.generateCustomerToken();
    ownerToken = authHelper.generateRestaurantOwnerToken('owner-123');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/admin/users', () => {
    it('should get all users as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        users: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        limit: 20,
      });
    });

    it('should filter users by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ role: 'customer' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      response.body.users.forEach((user: TestUser) => {
        expect(user.role).toBe('customer');
      });
    });

    it('should search users by email', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ search: 'test@example.com' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.users).toBeInstanceOf(Array);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .query({ page: 2, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/admin/users').expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 403 for restaurant owner', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  describe('GET /api/v1/admin/restaurants/pending', () => {
    it('should get pending restaurants as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/restaurants/pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        restaurants: expect.any(Array),
        total: expect.any(Number),
      });

      response.body.restaurants.forEach((restaurant: TestRestaurant) => {
        expect(restaurant.isApproved).toBe(false);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/restaurants/pending')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/restaurants/pending')
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/restaurants/pending')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  describe('PUT /api/v1/admin/restaurants/:id/approve', () => {
    let restaurantId: string;

    beforeEach(() => {
      restaurantId = 'pending-restaurant-123';
    });

    it('should approve restaurant as admin', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalNotes: 'All documents verified. Approved.',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        isApproved: true,
        isActive: true,
      });
    });

    it('should send notification to restaurant owner upon approval', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalNotes: 'Approved successfully',
        })
        .expect(200);

      expect(response.body).toHaveProperty('notificationSent');
      expect(response.body.notificationSent).toBe(true);
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/admin/restaurants/nonexistent-id/approve')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalNotes: 'Approved',
        })
        .expect(404);

      expect(response.body.message).toContain('Restaurant not found');
    });

    it('should return 400 for already approved restaurant', async () => {
      const approvedRestaurantId = 'approved-restaurant-123';

      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${approvedRestaurantId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvalNotes: 'Approved',
        })
        .expect(400);

      expect(response.body.message).toContain('Restaurant already approved');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/approve`)
        .send({
          approvalNotes: 'Approved',
        })
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/approve`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          approvalNotes: 'Approved',
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 403 for restaurant owner', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/approve`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          approvalNotes: 'Approved',
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  describe('PUT /api/v1/admin/restaurants/:id/reject', () => {
    let restaurantId: string;

    beforeEach(() => {
      restaurantId = 'pending-restaurant-123';
    });

    it('should reject restaurant as admin', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Incomplete documentation',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        isApproved: false,
        isActive: false,
      });
    });

    it('should require rejection reason', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('rejectionReason');
    });

    it('should send notification to restaurant owner upon rejection', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Incomplete documentation',
        })
        .expect(200);

      expect(response.body).toHaveProperty('notificationSent');
      expect(response.body.notificationSent).toBe(true);
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/admin/restaurants/nonexistent-id/reject')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Test reason',
        })
        .expect(404);

      expect(response.body.message).toContain('Restaurant not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/reject`)
        .send({
          rejectionReason: 'Test reason',
        })
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/restaurants/${restaurantId}/reject`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          rejectionReason: 'Test reason',
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  describe('Admin Dashboard Statistics', () => {
    it('should get dashboard statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalUsers: expect.any(Number),
        totalRestaurants: expect.any(Number),
        totalOrders: expect.any(Number),
        pendingApprovals: expect.any(Number),
        revenue: expect.any(Number),
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/stats')
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/dashboard/stats')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });

  describe('User Management', () => {
    let targetUserId: string;

    beforeEach(() => {
      targetUserId = 'user-to-manage-123';
    });

    it('should suspend user account', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/users/${targetUserId}/suspend`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Violating terms of service',
          duration: 7, // days
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: targetUserId,
        isSuspended: true,
      });
    });

    it('should reactivate suspended user', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/users/${targetUserId}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: targetUserId,
        isSuspended: false,
      });
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/admin/users/${targetUserId}/suspend`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          reason: 'Test',
        })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });
});
