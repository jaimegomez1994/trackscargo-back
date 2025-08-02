import request from 'supertest';
import express from 'express';
import { apiRoutes } from '../src/routes';
import { prisma } from '../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/v1', apiRoutes);

describe('Authentication API', () => {
  describe('POST /api/v1/auth/signup', () => {
    it('should create organization and owner user successfully', async () => {
      const signupData = {
        organizationName: 'Test Corp',
        email: 'owner@testcorp.com',
        password: 'securepass123',
        displayName: 'Test Owner'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(signupData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Organization created successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeValidJWT();
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: expect.any(String),
        email: signupData.email,
        displayName: signupData.displayName,
        role: 'owner'
      });
      expect(response.body).toHaveProperty('organization');
      expect(response.body.organization).toEqual({
        id: expect.any(String),
        name: signupData.organizationName,
        slug: 'test-corp',
        plan: 'free'
      });

      // Verify data was created in database
      const org = await prisma.organization.findUnique({
        where: { slug: 'test-corp' },
        include: { users: true }
      });
      expect(org).toBeTruthy();
      expect(org!.users).toHaveLength(1);
      expect(org!.users[0].email).toBe(signupData.email);
      expect(org!.users[0].role).toBe('owner');
    });

    it('should allow duplicate organization names with unique slugs', async () => {
      const signupData = {
        organizationName: 'Duplicate Corp',
        email: 'owner1@duplicate.com',
        password: 'pass123',
        displayName: 'Owner One'
      };

      // First signup should succeed
      const firstResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send(signupData)
        .expect(201);

      // Second signup with same org name should succeed with different slug
      const duplicateData = {
        ...signupData,
        email: 'owner2@duplicate.com',
        displayName: 'Owner Two'
      };

      const secondResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send(duplicateData)
        .expect(201);

      expect(firstResponse.body.organization.slug).toBe('duplicate-corp');
      expect(secondResponse.body.organization.slug).toBe('duplicate-corp-1');
    });

    it('should reject duplicate email addresses', async () => {
      const signupData = {
        organizationName: 'Email Test Corp',
        email: 'duplicate@email.com',
        password: 'pass123',
        displayName: 'First User'
      };

      // First signup should succeed
      await request(app)
        .post('/api/v1/auth/signup')
        .send(signupData)
        .expect(201);

      // Second signup with same email should fail
      const duplicateEmailData = {
        organizationName: 'Different Corp',
        email: 'duplicate@email.com',
        password: 'pass123',
        displayName: 'Second User'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(duplicateEmailData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toHaveLength(4); // All required fields missing
    });

    it('should validate email format', async () => {
      const signupData = {
        organizationName: 'Test Corp',
        email: 'invalid-email',
        password: 'pass123',
        displayName: 'Test User'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(signupData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details.some((detail: any) => 
        detail.path === 'email' && detail.msg.includes('Valid email is required')
      )).toBe(true);
    });

    it('should validate password strength', async () => {
      const signupData = {
        organizationName: 'Test Corp',
        email: 'test@corp.com',
        password: '123', // Too short
        displayName: 'Test User'
      };

      const response = await request(app)
        .post('/api/v1/auth/signup')
        .send(signupData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details.some((detail: any) => 
        detail.path === 'password' && detail.msg.includes('6 characters')
      )).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      await request(app)
        .post('/api/v1/auth/signup')
        .send({
          organizationName: 'Login Test Corp',
          email: 'logintest@corp.com',
          password: 'loginpass123',
          displayName: 'Login Test User'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@corp.com',
          password: 'loginpass123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('token');
      expect(response.body.token).toBeValidJWT();
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('logintest@corp.com');
      expect(response.body.user.role).toBe('owner');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@corp.com',
          password: 'loginpass123'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'logintest@corp.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;
    let userId: string;
    let orgId: string;

    beforeEach(async () => {
      // Create test user and get auth token
      const signupResponse = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          organizationName: 'Me Test Corp',
          email: 'metest@corp.com',
          password: 'metestpass123',
          displayName: 'Me Test User'
        });

      authToken = signupResponse.body.token;
      userId = signupResponse.body.user.id;
      orgId = signupResponse.body.organization.id;
    });

    it('should return user info with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toEqual({
        id: userId,
        email: 'metest@corp.com',
        displayName: 'Me Test User',
        role: 'owner',
        avatarUrl: null
      });

      expect(response.body).toHaveProperty('organization');
      expect(response.body.organization).toEqual({
        id: orgId,
        name: 'Me Test Corp',
        slug: 'me-test-corp',
        plan: 'free',
        maxUsers: null,
        maxShipmentsPerMonth: null
      });
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    it('should reject request with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });
});