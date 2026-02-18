import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthTestHelper } from '../../../test/utils/auth-helper';
import { TestCartItem } from '../../../test-helpers/types';

describe('CartController (E2E)', () => {
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

  describe('GET /api/v1/cart', () => {
    it('should get user cart successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId,
        items: expect.any(Array),
        subtotal: expect.any(Number),
        total: expect.any(Number),
      });
    });

    it('should return empty cart for new user', async () => {
      const newUserToken = authHelper.generateCustomerToken('new-user-123');

      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        items: [],
        subtotal: 0,
        total: 0,
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/cart').expect(401);
    });
  });

  describe('POST /api/v1/cart/items', () => {
    it('should add item to cart successfully', async () => {
      const itemData = {
        dishId: 'dish-123',
        quantity: 2,
        specialInstructions: 'Extra cheese',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body).toMatchObject({
        userId,
        items: expect.arrayContaining([
          expect.objectContaining({
            dishId: itemData.dishId,
            quantity: itemData.quantity,
          }),
        ]),
      });
    });

    it('should return 400 for missing dishId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 })
        .expect(400);

      expect(response.body.message).toContain('dishId');
    });

    it('should return 400 for invalid quantity', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'dish-123', quantity: 0 })
        .expect(400);

      expect(response.body.message).toContain('quantity');
    });

    it('should return 404 for non-existent dish', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'nonexistent-dish', quantity: 1 })
        .expect(404);

      expect(response.body.message).toContain('Dish not found');
    });

    it('should return 400 when dish is unavailable', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'unavailable-dish-123', quantity: 1 })
        .expect(400);

      expect(response.body.message).toContain('unavailable');
    });

    it('should update quantity if item already in cart', async () => {
      const itemData = { dishId: 'dish-123', quantity: 1 };

      // Add first time
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(itemData);

      // Add again
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(itemData)
        .expect(201);

      const cartItem = response.body.items.find(
        (item: TestCartItem) => item.dishId === itemData.dishId
      );
      expect(cartItem.quantity).toBe(2);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .send({ dishId: 'dish-123', quantity: 1 })
        .expect(401);
    });
  });

  describe('PUT /api/v1/cart/items/:id', () => {
    let cartItemId: string;

    beforeEach(() => {
      cartItemId = 'cart-item-123';
    });

    it('should update cart item successfully', async () => {
      const updateData = {
        quantity: 3,
        specialInstructions: 'No onions',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: cartItemId,
            quantity: updateData.quantity,
          }),
        ]),
      });
    });

    it('should return 400 for invalid quantity', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: -1 })
        .expect(400);

      expect(response.body.message).toContain('quantity');
    });

    it('should return 404 for non-existent cart item', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/cart/items/nonexistent-item')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 2 })
        .expect(404);

      expect(response.body.message).toContain('Cart item not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/cart/items/${cartItemId}`)
        .send({ quantity: 2 })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/cart/items/:id', () => {
    let cartItemId: string;

    beforeEach(() => {
      cartItemId = 'cart-item-123';
    });

    it('should delete cart item successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Item removed from cart',
      });
    });

    it('should return 404 for non-existent cart item', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/cart/items/nonexistent-item')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Cart item not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/cart/items/${cartItemId}`)
        .expect(401);
    });
  });

  describe('DELETE /api/v1/cart', () => {
    it('should clear cart successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Cart cleared successfully',
      });
    });

    it('should return empty cart after clearing', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.items).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).delete('/api/v1/cart').expect(401);
    });
  });

  describe('Cart Business Logic', () => {
    it('should calculate subtotal correctly', async () => {
      // Add multiple items
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'dish-1', quantity: 2 }); // $10 each

      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'dish-2', quantity: 1 }); // $15 each

      const response = await request(app.getHttpServer())
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body.subtotal).toBe(35); // (2*10) + 15
    });

    it('should prevent adding items from different restaurants', async () => {
      // Add item from restaurant 1
      await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'dish-restaurant-1', quantity: 1 });

      // Try to add item from restaurant 2
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ dishId: 'dish-restaurant-2', quantity: 1 })
        .expect(400);

      expect(response.body.message).toContain(
        'Cannot add items from different restaurants'
      );
    });
  });
});
