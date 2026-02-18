import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AddressFactory } from '../../../test/factories/user.factory';
import { AuthTestHelper } from '../../../test/utils/auth-helper';

describe('UserController (E2E)', () => {
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

  describe('GET /api/v1/users/me', () => {
    it('should get current user profile successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        email: expect.any(String),
        name: expect.any(String),
        phoneNumber: expect.any(String),
        role: 'customer',
      });
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });
  });

  describe('PUT /api/v1/users/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phoneNumber: '+11234567890',
      };

      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userId,
        name: updateData.name,
        phoneNumber: updateData.phoneNumber,
      });
    });

    it('should return 400 for invalid phone number', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ phoneNumber: '123' })
        .expect(400);

      expect(response.body.message).toContain('phoneNumber');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should not allow changing role', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ role: 'admin' })
        .expect(400);

      expect(response.body.message).toContain('Cannot change role');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put('/api/v1/users/me')
        .send({ name: 'Updated Name' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/users/me', () => {
    it('should delete user account successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Account deleted successfully',
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer()).delete('/api/v1/users/me').expect(401);
    });

    it('should not allow access after account deletion', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      // Try to access with same token
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/users/me/addresses', () => {
    it('should get user addresses successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        addresses: expect.any(Array),
      });
    });

    it('should return empty array for user without addresses', async () => {
      const newUserToken = authHelper.generateCustomerToken('new-user-123');

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${newUserToken}`)
        .expect(200);

      expect(response.body.addresses).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/users/me/addresses')
        .expect(401);
    });
  });

  describe('POST /api/v1/users/me/addresses', () => {
    it('should add address successfully', async () => {
      const addressData = AddressFactory.create({ userId });
      const { id, createdAt, updatedAt, ...createData } = addressData;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId,
        street: createData.street,
        city: createData.city,
        state: createData.state,
      });
    });

    it('should set first address as default', async () => {
      const newUserToken = authHelper.generateCustomerToken('new-user-456');
      const addressData = AddressFactory.create();
      const { id, createdAt, updatedAt, ...createData } = addressData;

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${newUserToken}`)
        .send(createData)
        .expect(201);

      expect(response.body.isDefault).toBe(true);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ city: 'New York' })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should validate coordinates', async () => {
      const addressData = AddressFactory.create();
      const { id, createdAt, updatedAt, ...createData } = addressData;
      createData.latitude = 200; // Invalid

      const response = await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .set('Authorization', `Bearer ${customerToken}`)
        .send(createData)
        .expect(400);

      expect(response.body.message).toContain('latitude');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/me/addresses')
        .send(AddressFactory.create())
        .expect(401);
    });
  });

  describe('PUT /api/v1/users/me/addresses/:id', () => {
    let addressId: string;

    beforeEach(() => {
      addressId = 'address-123';
    });

    it('should update address successfully', async () => {
      const updateData = {
        label: 'Work',
        street: '456 Updated St',
      };

      const response = await request(app.getHttpServer())
        .put(`/api/v1/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: addressId,
        label: updateData.label,
        street: updateData.street,
      });
    });

    it('should set address as default', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ isDefault: true })
        .expect(200);

      expect(response.body.isDefault).toBe(true);
    });

    it('should return 404 for non-existent address', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/me/addresses/nonexistent-id')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ label: 'Updated' })
        .expect(404);

      expect(response.body.message).toContain('Address not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/users/me/addresses/${addressId}`)
        .send({ label: 'Updated' })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/users/me/addresses/:id', () => {
    let addressId: string;

    beforeEach(() => {
      addressId = 'address-123';
    });

    it('should delete address successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Address deleted successfully',
      });
    });

    it('should return 400 when deleting default address with other addresses', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/users/me/addresses/${addressId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(400);

      expect(response.body.message).toContain(
        'Cannot delete default address. Set another address as default first'
      );
    });

    it('should return 404 for non-existent address', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/v1/users/me/addresses/nonexistent-id')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(404);

      expect(response.body.message).toContain('Address not found');
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/users/me/addresses/${addressId}`)
        .expect(401);
    });
  });
});
