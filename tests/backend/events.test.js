process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const http = require('http');
const jwt = require('jsonwebtoken');

jest.mock('../../backend/models/user.model');
const userModel = require('../../backend/models/user.model');
const eventBus = require('../../backend/utils/eventBus');
const sseService = require('../../backend/services/sse.service');
const app = require('../../backend/app');

const admin = { id: 1, role: 'admin', status: 'active' };
const bob = { id: 2, role: 'user', status: 'active' };
const carol = { id: 3, role: 'user', status: 'active' };
const people = { 1: admin, 2: bob, 3: carol };
const tokenFor = (user) => jwt.sign({ sub: String(user.id) }, 'test-secret');

let server;
let port;
const openConnections = [];

beforeAll((done) => {
  server = app.listen(0, () => {
    port = server.address().port;
    done();
  });
});

afterEach(async () => {
  openConnections.splice(0).forEach((req) => req.destroy());
  await new Promise((resolve) => setTimeout(resolve, 50)); // let the server notice the disconnects
});

afterAll((done) => {
  server.closeAllConnections();
  server.close(done);
});

beforeEach(() => {
  userModel.findById.mockImplementation(async (id) => people[id]);
});

// Opens a real SSE connection and collects the text it receives.
function connect(path, headers = {}) {
  return new Promise((resolve) => {
    const received = { text: '' };
    const req = http.get({ port, path, headers }, (res) => {
      received.status = res.statusCode;
      received.contentType = res.headers['content-type'];
      res.setEncoding('utf8');
      res.on('data', (chunk) => { received.text += chunk; });
      resolve(received);
    });
    openConnections.push(req);
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const emit = (event) => eventBus.emit(eventBus.EXPENSE_CHANGED, event);

describe('GET /api/events', () => {
  it('rejects a connection without a token', async () => {
    const conn = await connect('/api/events');
    expect(conn.status).toBe(401);
  });

  it('rejects an invalid token', async () => {
    const conn = await connect('/api/events?token=garbage');
    expect(conn.status).toBe(401);
  });

  it('opens a stream with the ?token= query token and says "connected"', async () => {
    const conn = await connect(`/api/events?token=${tokenFor(bob)}`);
    await wait(50);
    expect(conn.status).toBe(200);
    expect(conn.contentType).toContain('text/event-stream');
    expect(conn.text).toContain('event: connected');
  });

  it('also accepts a normal Authorization header', async () => {
    const conn = await connect('/api/events', { Authorization: `Bearer ${tokenFor(bob)}` });
    expect(conn.status).toBe(200);
  });

  it('pushes a change to the owner as it happens', async () => {
    const conn = await connect(`/api/events?token=${tokenFor(bob)}`);
    emit({ expenseId: 7, title: 'Taxi', employeeId: 2, createdBy: 2, status: 'COMPLETED' });
    await wait(50);
    expect(conn.text).toContain('event: expense-updated');
    expect(conn.text).toContain('"expenseId":7');
    expect(conn.text).toContain('"status":"COMPLETED"');
  });

  it('sends users only their own events, and admins everything', async () => {
    const adminConn = await connect(`/api/events?token=${tokenFor(admin)}`);
    const carolConn = await connect(`/api/events?token=${tokenFor(carol)}`);
    emit({ expenseId: 8, title: 'Bob expense', employeeId: 2, createdBy: 2, status: 'APPROVAL_REQUIRED' });
    await wait(50);
    expect(adminConn.text).toContain('"expenseId":8');
    expect(carolConn.text).not.toContain('expense-updated');
  });

  it('delivers an event to the creator even if the expense belongs to someone else', async () => {
    const adminConn = await connect(`/api/events?token=${tokenFor(admin)}`);
    const bobConn = await connect(`/api/events?token=${tokenFor(bob)}`);
    emit({ expenseId: 9, title: 'Filed for Carol', employeeId: 3, createdBy: 2, status: 'DRAFT' });
    await wait(50);
    expect(bobConn.text).toContain('"expenseId":9');
    expect(adminConn.text).toContain('"expenseId":9');
  });

  it('stops tracking a client when the browser disconnects', async () => {
    const before = sseService.clientCount();
    await connect(`/api/events?token=${tokenFor(bob)}`);
    await wait(30);
    expect(sseService.clientCount()).toBe(before + 1);

    openConnections.splice(0).forEach((req) => req.destroy());
    await wait(100);
    expect(sseService.clientCount()).toBe(before);
  });
});
