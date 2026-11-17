const request = require('supertest');
const { z } = require('zod');

process.env.NODE_ENV = 'test';
const app = require('../../backend/app');
const validate = require('../../backend/middleware/validate');
const ApiError = require('../../backend/utils/ApiError');

describe('health endpoint', () => {
  it('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, status: 'ok' });
  });
});

describe('error handling', () => {
  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      message: 'Route not found: GET /api/nope',
    });
  });

  it('returns 400 for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{ bad json');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Request body is not valid JSON');
  });
});

describe('security middleware', () => {
  it('sets security headers and the CORS origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('validate middleware', () => {
  const schema = z.object({ amount: z.number().positive('Amount must be greater than zero') });
  const run = (body) => {
    const req = { body };
    const next = jest.fn();
    validate(schema)(req, {}, next);
    return { req, next };
  };

  it('passes valid data through in req.validated', () => {
    const { req, next } = run({ amount: 10 });
    expect(next).toHaveBeenCalledWith();
    expect(req.validated.body).toEqual({ amount: 10 });
  });

  it('forwards a 400 ApiError with field messages for invalid data', () => {
    const { next } = run({ amount: 0 });
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ApiError);
    expect(error.statusCode).toBe(400);
    expect(error.errors).toEqual([{ field: 'amount', message: 'Amount must be greater than zero' }]);
  });
});
