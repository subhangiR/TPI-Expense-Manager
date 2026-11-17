process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// No real database in unit tests: replace the user model with fakes.
jest.mock('../../backend/models/user.model');
const userModel = require('../../backend/models/user.model');

const app = require('../../backend/app');
const authorize = require('../../backend/middleware/authorize');
const ApiError = require('../../backend/utils/ApiError');

const baseUser = { id: '2', name: 'Bob', email: 'bob@tpi.com', role: 'user', status: 'active' };
let dbUser;

beforeAll(() => {
  dbUser = { ...baseUser, password_hash: bcrypt.hashSync('User@123', 4) };
});

beforeEach(() => {
  userModel.findByEmail.mockResolvedValue(dbUser);
  userModel.findById.mockResolvedValue(baseUser);
});

const login = (body) => request(app).post('/api/auth/login').send(body);

describe('POST /api/auth/login', () => {
  it('returns a token and the user without password_hash', async () => {
    const res = await login({ email: 'bob@tpi.com', password: 'User@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email: 'bob@tpi.com', role: 'user' });
    expect(res.body.data.user.password_hash).toBeUndefined();
    expect(jwt.verify(res.body.data.token, 'test-secret').sub).toBe('2');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await login({ email: 'bob@tpi.com', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password. Please try again.');
  });

  it('gives the same 401 for an unknown email', async () => {
    userModel.findByEmail.mockResolvedValue(undefined);
    const res = await login({ email: 'nobody@tpi.com', password: 'User@123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Incorrect email or password. Please try again.');
  });

  it('blocks inactive users with 403', async () => {
    userModel.findByEmail.mockResolvedValue({ ...dbUser, status: 'inactive' });
    const res = await login({ email: 'bob@tpi.com', password: 'User@123' });
    expect(res.status).toBe(403);
  });

  it('returns 400 with field errors for bad input', async () => {
    const res = await login({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { field: 'email', message: 'Enter a valid email address' },
      { field: 'password', message: 'Password is required' },
    ]);
  });
});

describe('login rate limit', () => {
  it('answers 429 once one address has made too many attempts', async () => {
    let res;
    for (let i = 0; i < 6; i += 1) res = await login(baseUser);
    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  const tokenFor = (id, options) => jwt.sign({ sub: id }, 'test-secret', options);

  it('returns the current user for a valid token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor('2')}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('bob@tpi.com');
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 for a tampered token', async () => {
    const bad = jwt.sign({ sub: '2' }, 'another-secret');
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Your session is not valid. Please log in again.');
  });

  it('returns 401 for an expired token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenFor('2', { expiresIn: -10 })}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('returns 401 if the user was deactivated after the token was issued', async () => {
    userModel.findById.mockResolvedValue({ ...baseUser, status: 'inactive' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor('2')}`);
    expect(res.status).toBe(401);
  });
});

describe('authorize middleware', () => {
  const run = (role, ...allowed) => {
    const next = jest.fn();
    try {
      authorize(...allowed)({ user: role && { role } }, {}, next);
    } catch (error) {
      return { error };
    }
    return { next };
  };

  it('lets an allowed role through', () => {
    expect(run('admin', 'admin').next).toHaveBeenCalled();
  });

  it('throws 403 for a role that is not allowed', () => {
    const { error } = run('user', 'admin');
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(403);
  });

  it('throws 403 when nobody is logged in', () => {
    expect(run(null, 'admin').error.statusCode).toBe(403);
  });
});
