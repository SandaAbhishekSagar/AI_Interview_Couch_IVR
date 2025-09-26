const request = require('supertest');
const app = require('../../server');
const { User } = require('../../database/models');

describe('Auth Routes', () => {
  beforeEach(async () => {
    // Clean up test data
    await User.destroy({ where: {} });
  });

  afterEach(async () => {
    // Clean up test data
    await User.destroy({ where: {} });
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        phoneNumber: '+15551234567',
        name: 'John Doe',
        industry: 'technology',
        experienceLevel: 'mid'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.phoneNumber).toBe(userData.phoneNumber);
      expect(response.body.data.user.name).toBe(userData.name);
    });

    it('should return error for invalid phone number', async () => {
      const userData = {
        phoneNumber: 'invalid-phone',
        name: 'John Doe',
        industry: 'technology',
        experienceLevel: 'mid'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return error for duplicate phone number', async () => {
      const userData = {
        phoneNumber: '+15551234567',
        name: 'John Doe',
        industry: 'technology',
        experienceLevel: 'mid'
      };

      // Create first user
      await User.createUser(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this phone number already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await User.createUser({
        phoneNumber: '+15551234567',
        name: 'John Doe',
        industry: 'technology',
        experienceLevel: 'mid'
      });
    });

    it('should login existing user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '+15551234567' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.phoneNumber).toBe('+15551234567');
    });

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: '+15551234568' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should return error for invalid phone number format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ phoneNumber: 'invalid' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('GET /api/auth/verify', () => {
    let user;
    let token;

    beforeEach(async () => {
      user = await User.createUser({
        phoneNumber: '+15551234567',
        name: 'John Doe',
        industry: 'technology',
        experienceLevel: 'mid'
      });

      // Generate token (simplified for test)
      const jwt = require('jsonwebtoken');
      token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'test-secret');
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(user.id);
    });

    it('should return error for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });
  });
});
