process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../backend/models/user.model');
const userModel = require('../../backend/models/user.model');
const app = require('../../backend/app');

const admin = { id: '1', name: 'Admin', email: 'alice@tpi.com', role: 'admin', status: 'active' };
const bob = { id: '2', name: 'Bob', email: 'bob@tpi.com', role: 'user', status: 'active' };
const carol = { id: '3', name: 'Carol', email: 'carol@tpi.com', role: 'user', status: 'active' };
const people = { 1: admin, 2: bob, 3: carol };

const as = (user) => ({ Authorization: `Bearer ${jwt.sign({ sub: user.id }, 'test-secret')}` });

beforeEach(() => {
  jest.resetAllMocks();
  // authenticate and the service both look users up by id.
  userModel.findById.mockImplementation(async (id) => people[id]);
  userModel.findAll.mockResolvedValue([admin, bob, carol]);
  userModel.update.mockImplementation(async (id, fields) => people[id] && { ...people[id], ...fields });
});

describe('GET /api/users', () => {
  it('lets an admin list users and passes filters to the model', async () => {
    const res = await request(app).get('/api/users?role=user&search=ra').set(as(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.users).toHaveLength(3);
    expect(userModel.findAll).toHaveBeenCalledWith({ role: 'user', search: 'ra' });
  });

  it('returns 403 for a normal user', async () => {
    const res = await request(app).get('/api/users').set(as(bob));
    expect(res.status).toBe(403);
    expect(userModel.findAll).not.toHaveBeenCalled();
  });

  it('returns 401 without a token', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
  });

  it('returns 400 for an invalid role filter', async () => {
    const res = await request(app).get('/api/users?role=boss').set(as(admin));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/:id', () => {
  it('lets a user view themselves', async () => {
    const res = await request(app).get('/api/users/2').set(as(bob));
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('bob@tpi.com');
  });

  it('stops a user viewing someone else', async () => {
    const res = await request(app).get('/api/users/3').set(as(bob));
    expect(res.status).toBe(403);
  });

  it('lets an admin view anyone', async () => {
    const res = await request(app).get('/api/users/3').set(as(admin));
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Carol');
  });

  it('returns 404 for an unknown user', async () => {
    const res = await request(app).get('/api/users/99').set(as(admin));
    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric id', async () => {
    const res = await request(app).get('/api/users/abc').set(as(admin));
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/users/:id', () => {
  const patch = (user, id, body) => request(app).patch(`/api/users/${id}`).set(as(user)).send(body);

  it('lets an admin update another user', async () => {
    const res = await patch(admin, 2, { status: 'inactive', name: '  Bob B  ' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.status).toBe('inactive');
    expect(userModel.update).toHaveBeenCalledWith(2, { status: 'inactive', name: 'Bob B' });
  });

  it('returns 403 when a normal user tries to update anyone', async () => {
    const res = await patch(bob, 2, { name: 'Hacker' });
    expect(res.status).toBe(403);
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('stops an admin changing their own role or status', async () => {
    const res = await patch(admin, 1, { role: 'user' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('You cannot change your own role or status.');
    expect(userModel.update).not.toHaveBeenCalled();
  });

  it('allows an admin to rename themselves', async () => {
    expect((await patch(admin, 1, { name: 'Chief Admin' })).status).toBe(200);
  });

  it('returns 400 for an empty body', async () => {
    const res = await patch(admin, 2, {});
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe('Provide at least one field to update');
  });

  it('returns 400 for an invalid role', async () => {
    const res = await patch(admin, 2, { role: 'boss' });
    expect(res.status).toBe(400);
    expect(res.body.errors[0]).toEqual({ field: 'role', message: 'Role must be user or admin' });
  });

  it('ignores fields that are not editable, such as email', async () => {
    const res = await patch(admin, 2, { name: 'Bob', email: 'bob.b@tpi.com' });
    expect(res.status).toBe(200);
    expect(userModel.update).toHaveBeenCalledWith(2, { name: 'Bob' });
  });

  it('returns 404 for an unknown user', async () => {
    expect((await patch(admin, 99, { name: 'Ghost' })).status).toBe(404);
  });
});
