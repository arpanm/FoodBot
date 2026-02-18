import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthTestHelper } from '../../../test/utils/auth-helper';
import { DishFactory } from '../../../test/factories/dish.factory';
import { TestDish } from '../../../test-helpers/types';

describe('DishController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;
  let ownerToken: string;
  let customerToken: string;
  let restaurantId: string;
  let dishId: string;

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

    restaurantId = 'restaurant-123';
    ownerToken = authHelper.generateRestaurantOwnerToken('owner-123', restaurantId);
    customerToken = authHelper.generateCustomerToken();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/dishes/search', () => {
    it('should search dishes successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dishes/search')
        .query({ query: 'pizza' })
        .expect(200);

      expect(response.body).toMatchObject({
        dishes: expect.any(Array),
        total: expect.any(Number),
      });
    });

    it('should filter by restaurant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dishes/search')
        .query({ restaurantId })
        .expect(200);

      response.body.dishes.forEach((dish: TestDish) => {
        expect(dish.restaurantId).toBe(restaurantId);
      });
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dishes/search')
        .query({ category: 'Main Course' })
        .expect(200);

      expect(response.body.dishes).toBeInstanceOf(Array);
    });

    it('should filter vegetarian dishes', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dishes/search')
        .query({ isVegetarian: true })
        .expect(200);

      response.body.dishes.forEach((dish: TestDish) => {
        expect(dish.isVegetarian).toBe(true);
      });
    });

    it('should filter by price range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dishes/search')
        .query({ minPrice: 10, maxPrice: 25 })
        .expect(200);

      response.body.dishes.forEach((dish: TestDish) => {
        expect(dish.price).toBeGreaterThanOrEqual(10);
        expect(dish.price).toBeLessThanOrEqual(25);
      });
    });
  });

  describe('GET /api/v1/dishes/:id', () => {
    beforeEach(() => {
      dishId = 'dish-123';
    });

    it('should get dish by ID successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/dishes/${dishId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: dishId,
        name: expect.any(String),
        price: expect.any(Number),
        restaurantId: expect.any(String),
      });
    });

    it('should return 404 for non-existent dish', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/dishes/nonexistent-id')
        .expect(404);

      expect(response.body.message).toContain('Dish not found');
    });
  });

  describe('POST /api/v1/dishes', () => {
    it('should create dish as restaurant owner', async () => {
      const dishData = DishFactory.createDishData({ restaurantId });

      const response = await request(app.getHttpServer())
        .post('/api/v1/dishes')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(dishData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: dishData.name,
        restaurantId,
      });
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/dishes')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Test Dish' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/dishes')
        .send(DishFactory.createDishData())
        .expect(401);
    });

    it('should return 403 for customer role', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/dishes')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(DishFactory.createDishData())
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should validate price is positive', async () => {
      const dishData = DishFactory.createDishData({ price: -10 });

      const response = await request(app.getHttpServer())
        .post('/api/v1/dishes')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(dishData)
        .expect(400);

      expect(response.body.message).toContain('price');
    });
  });

  describe('PUT /api/v1/dishes/:id', () => {
    beforeEach(() => {
      dishId = 'dish-123';
    });

    it('should update dish as owner', async () => {
      const updateData = {
        name: 'Updated Dish Name',
        price: 19.99,
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/dishes/${dishId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: dishId,
        name: updateData.name,
        price: updateData.price,
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/dishes/${dishId}`)
        .send({ name: 'Updated Name' })
        .expect(401);
    });

    it('should return 403 for different restaurant owner', async () => {
      const differentOwnerToken = authHelper.generateRestaurantOwnerToken(
        'different-owner',
        'different-restaurant'
      );

      const response = await request(app.getHttpServer())
        .put(`/api/v1/dishes/${dishId}`)
        .set('Authorization', `Bearer ${differentOwnerToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 404 for non-existent dish', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/dishes/nonexistent-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body.message).toContain('Dish not found');
    });
  });

  describe('DELETE /api/v1/dishes/:id', () => {
    beforeEach(() => {
      dishId = 'dish-123';
    });

    it('should delete dish as owner', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/dishes/${dishId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Dish deleted successfully',
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/dishes/${dishId}`)
        .expect(401);
    });

    it('should return 403 for customer role', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/dishes/${dishId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });

    it('should return 404 for non-existent dish', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/dishes/nonexistent-id')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Dish not found');
    });
  });

  describe('PATCH /api/v1/dishes/:id/availability', () => {
    beforeEach(() => {
      dishId = 'dish-123';
    });

    it('should update availability as owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/dishes/${dishId}/availability`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ isAvailable: false })
        .expect(200);

      expect(response.body).toMatchObject({
        id: dishId,
        isAvailable: false,
      });
    });

    it('should return 400 for missing isAvailable field', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/dishes/${dishId}/availability`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({})
        .expect(400);

      expect(response.body.message).toContain('isAvailable');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/dishes/${dishId}/availability`)
        .send({ isAvailable: false })
        .expect(401);
    });

    it('should return 403 for customer role', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/dishes/${dishId}/availability`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ isAvailable: false })
        .expect(403);

      expect(response.body.message).toContain('Forbidden');
    });
  });
});
