import type { INestApplication} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from '../../../app.module';
import { UserFactory } from '../../../test/factories/user.factory';
import { AuthTestHelper } from '../../../test/utils/auth-helper';

describe('AuthController (E2E)', () => {
  let app: INestApplication;
  let authHelper: AuthTestHelper;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = UserFactory.createRegistrationData();

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          email: userData.email,
          name: userData.name,
          phoneNumber: userData.phoneNumber,
          role: 'customer',
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for missing email', async () => {
      const userData = UserFactory.createRegistrationData();
      delete (userData as any).email;

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 400 for invalid email format', async () => {
      const userData = UserFactory.createRegistrationData({
        email: 'invalid-email',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 400 for weak password', async () => {
      const userData = UserFactory.createRegistrationData({
        password: '123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = UserFactory.createRegistrationData();

      // Register first time
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again with same email
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid phone number format', async () => {
      const userData = UserFactory.createRegistrationData({
        phoneNumber: '123',
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.message).toContain('phoneNumber');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const userCredentials = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
    };

    beforeEach(async () => {
      // Register a user for login tests
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          ...userCredentials,
          name: 'Test User',
          phoneNumber: '+11234567890',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(userCredentials)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: userCredentials.email,
        },
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ password: userCredentials.password })
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userCredentials.email })
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userCredentials.password,
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 429 after multiple failed login attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({
            email: userCredentials.email,
            password: 'WrongPassword123!',
          })
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userCredentials.email,
          password: 'WrongPassword123!',
        })
        .expect(429);

      expect(response.body.message).toContain('ThrottlerException');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let authToken: string;

    beforeEach(async () => {
      const userData = UserFactory.createRegistrationData();
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      authToken = registerResponse.body.accessToken;
    });

    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Logged out successfully',
      });
    });

    it('should return 401 without authentication token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should invalidate token after logout', async () => {
      // Logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Try to use the same token
      await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;
    let accessToken: string;

    beforeEach(async () => {
      const userData = UserFactory.createRegistrationData();
      const registerResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      accessToken = registerResponse.body.accessToken;
      refreshToken = registerResponse.body.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });
      expect(response.body.accessToken).not.toBe(accessToken);
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('refreshToken');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });

    it('should return 401 for expired refresh token', async () => {
      // Generate an expired token
      const expiredToken = authHelper.generateToken({
        userId: 'test-id',
        email: 'test@example.com',
        role: 'customer',
      });

      // Wait for token to expire (if using short expiry in tests)
      // Or mock the time

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body.message).toContain('expired');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    const userEmail = 'test@example.com';

    beforeEach(async () => {
      const userData = UserFactory.createRegistrationData({
        email: userEmail,
      });
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);
    });

    it('should send password reset email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: userEmail })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password reset email sent',
      });
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('email');
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });

    it('should return 429 after multiple reset requests', async () => {
      // Send multiple reset requests
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/forgot-password')
          .send({ email: userEmail });
      }

      // Next attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: userEmail })
        .expect(429);

      expect(response.body.message).toContain('ThrottlerException');
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    let resetToken: string;
    const newPassword = 'NewSecurePassword123!';

    beforeEach(async () => {
      const userData = UserFactory.createRegistrationData();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      // Get reset token
      const forgotResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email });

      // In real implementation, you'd get the token from email or database
      resetToken = 'mock-reset-token';
    });

    it('should reset password successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password reset successful',
      });
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ newPassword })
        .expect(400);

      expect(response.body.message).toContain('token');
    });

    it('should return 400 for missing password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({ token: resetToken })
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.message).toContain('password');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword,
        })
        .expect(401);

      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should allow login with new password after reset', async () => {
      const userEmail = 'reset@example.com';
      const userData = UserFactory.createRegistrationData({
        email: userEmail,
      });

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      await request(app.getHttpServer())
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword,
        });

      // Try to login with new password
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: userEmail,
          password: newPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
    });
  });

  describe('POST /api/v1/auth/verify-email', () => {
    let verificationToken: string;

    beforeEach(async () => {
      const userData = UserFactory.createRegistrationData();
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(userData);

      // In real implementation, you'd get the token from email or database
      verificationToken = 'mock-verification-token';
    });

    it('should verify email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Email verified successfully',
      });
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({})
        .expect(400);

      expect(response.body.message).toContain('token');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid verification token');
    });

    it('should return 409 for already verified email', async () => {
      // Verify first time
      await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      // Try to verify again
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-email')
        .send({ token: verificationToken })
        .expect(409);

      expect(response.body.message).toContain('already verified');
    });
  });
});
