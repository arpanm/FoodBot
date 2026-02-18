import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthTestHelper } from '../../../test/utils/auth-helper';
import { RestaurantFactory } from '../../../test/factories/restaurant.factory';
import { UserFactory } from '../../../test/factories/user.factory';
import { AppModule } from '../../../app.module';
import { TestRestaurant, TestDish } from '../../../test-helpers/types';

describe('RestaurantController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let customerToken: string;
  let ownerToken: string;
  let adminToken: string;
  let restaurantId: string;
  let ownerId: string;

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

    // Generate tokens for different user roles
    customerToken = authHelper.generateCustomerToken();
    ownerId = 'owner-123';
    ownerToken = authHelper.generateRestaurantOwnerToken(ownerId);
    adminToken = authHelper.generateAdminToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/restaurants/search', () => {
    it('should search restaurants successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          query: 'pizza',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 10,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        restaurants: expect.any(Array),
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
      });
    });

    it('should filter by cuisine type', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          cuisineTypes: ['Italian', 'Chinese'],
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      expect(response.body.restaurants).toBeInstanceOf(Array);
    });

    it('should filter by price range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          priceRange: ['moderate', 'expensive'],
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      expect(response.body.restaurants).toBeInstanceOf(Array);
    });

    it('should filter by minimum rating', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          minRating: 4.0,
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      expect(response.body.restaurants).toBeInstanceOf(Array);
      response.body.restaurants.forEach((restaurant: TestRestaurant) => {
        expect(restaurant.rating).toBeGreaterThanOrEqual(4.0);
      });
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          page: 2,
          limit: 10,
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      expect(response.body.page).toBe(2);
      expect(response.body.limit).toBe(10);
    });

    it('should return 400 for invalid coordinates', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          latitude: 200,
          longitude: -200,
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid coordinates');
    });

    it('should return empty array when no restaurants found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/search')
        .query({
          query: 'nonexistent-cuisine-xyz',
          latitude: 37.7749,
          longitude: -122.4194,
        })
        .expect(200);

      expect(response.body.restaurants).toEqual([]);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/v1/restaurants/:id', () => {
    beforeEach(() => {
      restaurantId = 'restaurant-123';
    });

    it('should get restaurant by ID successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/restaurants/${restaurantId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        name: expect.any(String),
        description: expect.any(String),
        cuisineTypes: expect.any(Array),
        rating: expect.any(Number),
        address: expect.any(Object),
      });
    });

    it('should include operating hours in response', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/restaurants/${restaurantId}`)
        .expect(200);

      expect(response.body.operatingHours).toBeDefined();
      expect(response.body.operatingHours.monday).toBeDefined();
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/nonexistent-id')
        .expect(404);

      expect(response.body.message).toContain('Restaurant not found');
    });

    it('should return 400 for invalid restaurant ID format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/invalid-format!')
        .expect(400);

      expect(response.body.message).toContain('Invalid ID format');
    });
  });

  describe('GET /api/v1/restaurants/:id/menu', () => {
    beforeEach(() => {
      restaurantId = 'restaurant-123';
    });

    it('should get restaurant menu successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/restaurants/${restaurantId}/menu`)
        .expect(200);

      expect(response.body).toMatchObject({
        restaurantId,
        categories: expect.any(Array),
        dishes: expect.any(Array),
      });
    });

    it('should filter menu by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/restaurants/${restaurantId}/menu`)
        .query({ category: 'Main Course' })
        .expect(200);

      expect(response.body.dishes).toBeInstanceOf(Array);
    });

    it('should filter vegetarian items', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/restaurants/${restaurantId}/menu`)
        .query({ isVegetarian: true })
        .expect(200);

      response.body.dishes.forEach((dish: TestDish) => {
        expect(dish.isVegetarian).toBe(true);
      });
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/restaurants/nonexistent-id/menu')
        .expect(404);

      expect(response.body.message).toContain('Restaurant not found');
    });
  });

  describe('POST /api/v1/restaurants', () => {
    it('should create restaurant as restaurant owner', async () => {
      const restaurantData = RestaurantFactory.createRestaurantData({
        ownerId,
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(restaurantData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: restaurantData.name,
        ownerId,
        isApproved: false,
        isActive: false,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          name: 'Test Restaurant',
          // Missing other required fields
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      const restaurantData = RestaurantFactory.createRestaurantData();

      await request(app.getHttpServer())
        .post('/api/v1/restaurants')
        .send(restaurantData)
        .expect(401);
    });

    it('should return 403 for customer role', async () => {
      const restaurantData = RestaurantFactory.createRestaurantData();

      const response = await request(app.getHttpServer())
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(restaurantData)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should validate email format', async () => {
      const restaurantData = RestaurantFactory.createRestaurantData({
        email: 'invalid-email',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(restaurantData)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should validate phone number format', async () => {
      const restaurantData = RestaurantFactory.createRestaurantData({
        phoneNumber: '123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/restaurants')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(restaurantData)
        .expect(400);

      expect(response.body.message).toContain('phoneNumber');
    });
  });

  describe('PUT /api/v1/restaurants/:id', () => {
    beforeEach(() => {
      restaurantId = 'restaurant-123';
    });

    it('should update restaurant as owner', async () => {
      const updateData = {
        name: 'Updated Restaurant Name',
        description: 'Updated description',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: restaurantId,
        name: updateData.name,
        description: updateData.description,
      });
    });

    it('should update operating hours', async () => {
      const updateData = {
        operatingHours: {
          monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
          tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        },
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.operatingHours).toMatchObject(updateData.operatingHours);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/restaurants/${restaurantId}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should return 403 when updating another owner restaurant', async () => {
      const differentOwnerToken = authHelper.generateRestaurantOwnerToken('different-owner');

      const response = await request(app.getHttpServer())
        .put(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${differentOwnerToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/restaurants/nonexistent-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.message).toContain('Restaurant not found');
    });
  });

  describe('DELETE /api/v1/restaurants/:id', () => {
    beforeEach(() => {
      restaurantId = 'restaurant-123';
    });

    it('should delete restaurant as admin', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Restaurant deleted successfully',
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .expect(401);
    });

    it('should return 403 for non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 403 for customer role', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/restaurants/nonexistent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(response.body.message).toContain('Restaurant not found');
    });

    it('should soft delete restaurant (not permanent)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Restaurant should still exist but marked as deleted
      const response = await request(app.getHttpServer())
        .get(`/api/v1/restaurants/${restaurantId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.isActive).toBe(false);
    });
  });
});
