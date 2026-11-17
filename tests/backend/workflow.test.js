process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.APPROVAL_THRESHOLD = '5000';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../backend/models/user.model');
jest.mock('../../backend/models/expense.model');
jest.mock('../../backend/models/history.model');
jest.mock('../../backend/utils/transaction');

const withTransaction = require('../../backend/utils/transaction');
const userModel = require('../../backend/models/user.model');
const expenseModel = require('../../backend/models/expense.model');
const historyModel = require('../../backend/models/history.model');
const eventBus = require('../../backend/utils/eventBus');
const { canTransition } = require('../../backend/constants/workflow');
const app = require('../../backend/app');

const admin = { id: 1, name: 'Admin', role: 'admin', status: 'active' };
const bob = { id: 2, name: 'Bob', role: 'user', status: 'active' };
const carol = { id: 3, name: 'Carol', role: 'user', status: 'active' };
const people = { 1: admin, 2: bob, 3: carol };
const as = (user) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(user.id) }, 'test-secret')}` });

const makeExpense = (overrides = {}) => ({
  id: 10, title: 'Taxi', employee_id: 2, created_by: 2, amount: 950, status: 'DRAFT', ...overrides,
});

// What happened, in order: ["DRAFT>SUBMITTED", ...] and the history actions.
const moves = () => expenseModel.changeStatus.mock.calls.map(([, from, to]) => `${from}>${to}`);
const actions = () => historyModel.add.mock.calls.map(([entry]) => entry.action);

beforeEach(() => {
  jest.resetAllMocks();
  withTransaction.mockImplementation((work) => work({ fake: 'client' }));
  userModel.findById.mockImplementation(async (id) => people[id]);
  expenseModel.findById.mockResolvedValue(makeExpense());
  expenseModel.changeStatus.mockResolvedValue(true);
  historyModel.findByExpenseId.mockResolvedValue([{ id: 1, action: 'CREATE' }]);
});

describe('transition table', () => {
  it.each([
    ['DRAFT', 'SUBMITTED'], ['SUBMITTED', 'PROCESSING'], ['PROCESSING', 'APPROVAL_REQUIRED'],
    ['PROCESSING', 'APPROVED'], ['PROCESSING', 'FAILED'], ['APPROVAL_REQUIRED', 'APPROVED'],
    ['APPROVAL_REQUIRED', 'REJECTED'], ['APPROVED', 'COMPLETED'],
  ])('allows %s -> %s', (from, to) => expect(canTransition(from, to)).toBe(true));

  it.each([
    ['DRAFT', 'APPROVED'], ['DRAFT', 'COMPLETED'], ['SUBMITTED', 'APPROVED'],
    ['APPROVAL_REQUIRED', 'COMPLETED'], ['COMPLETED', 'DRAFT'], ['REJECTED', 'DRAFT'],
    ['REJECTED', 'APPROVED'], ['FAILED', 'SUBMITTED'],
  ])('blocks %s -> %s', (from, to) => expect(canTransition(from, to)).toBe(false));
});

describe('POST /api/expenses/:id/submit', () => {
  const submit = (user = bob) => request(app).post('/api/expenses/10/submit').set(as(user));

  it('auto-approves and completes an expense below the threshold', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ amount: 4999.99 }));
    const res = await submit();
    expect(res.status).toBe(200);
    expect(moves()).toEqual([
      'DRAFT>SUBMITTED', 'SUBMITTED>PROCESSING', 'PROCESSING>APPROVED', 'APPROVED>COMPLETED',
    ]);
    expect(actions()).toEqual(['SUBMIT', 'PROCESS', 'AUTO_APPROVE', 'COMPLETE']);
  });

  it('stops at APPROVAL_REQUIRED when the amount equals the threshold', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ amount: 5000 }));
    await submit();
    expect(moves()).toEqual(['DRAFT>SUBMITTED', 'SUBMITTED>PROCESSING', 'PROCESSING>APPROVAL_REQUIRED']);
    expect(actions()).toEqual(['SUBMIT', 'PROCESS', 'REQUEST_APPROVAL']);
  });

  it('stops at APPROVAL_REQUIRED for a large amount', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ amount: 12500 }));
    await submit();
    expect(moves().at(-1)).toBe('PROCESSING>APPROVAL_REQUIRED');
  });

  it('records the acting user on every history row', async () => {
    await submit();
    historyModel.add.mock.calls.forEach(([entry]) => expect(entry.performed_by).toBe(2));
  });

  it('ends in FAILED when processing throws, and records it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expenseModel.changeStatus.mockImplementation(async (id, from, to) => {
      if (from === 'PROCESSING' && to === 'APPROVED') throw new Error('boom');
      return true;
    });

    const res = await submit();
    expect(res.status).toBe(200);
    expect(moves().at(-1)).toBe('PROCESSING>FAILED');
    expect(actions().at(-1)).toBe('FAIL');
  });

  it('announces each committed change on the event bus', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ amount: 12500 }));
    const seen = [];
    const listener = (event) => seen.push(event.status);
    eventBus.on(eventBus.EXPENSE_CHANGED, listener);
    await submit();
    eventBus.off(eventBus.EXPENSE_CHANGED, listener);
    expect(seen).toEqual(['PROCESSING', 'APPROVAL_REQUIRED']);
  });

  it('returns 409 for an expense that is not a draft', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'COMPLETED' }));
    const res = await submit();
    expect(res.status).toBe(409);
    expect(expenseModel.changeStatus).not.toHaveBeenCalled();
  });

  it('returns 403 for someone else\'s expense (admins included) and 404 when missing', async () => {
    expect((await submit(carol)).status).toBe(403);
    expect((await submit(admin)).status).toBe(403);
    expenseModel.findById.mockResolvedValue(undefined);
    expect((await submit(admin)).status).toBe(404);
  });

  it('returns 409 if the status changed underneath us (race)', async () => {
    expenseModel.changeStatus.mockResolvedValue(false);
    const res = await submit();
    expect(res.status).toBe(409);
    expect(historyModel.add).not.toHaveBeenCalled();
  });
});

describe('POST /api/expenses/:id/approve', () => {
  const awaiting = () => expenseModel.findById.mockResolvedValue(makeExpense({ amount: 12500, status: 'APPROVAL_REQUIRED' }));
  const approve = (user, body) => {
    const req = request(app).post('/api/expenses/10/approve').set(as(user));
    return body ? req.send(body) : req; // also works with no body at all
  };

  it('lets an admin approve, completes it, and records both steps', async () => {
    awaiting();
    const res = await approve(admin, { comment: 'Looks fine' });
    expect(res.status).toBe(200);
    expect(moves()).toEqual(['APPROVAL_REQUIRED>APPROVED', 'APPROVED>COMPLETED']);
    expect(historyModel.add.mock.calls[0][0]).toMatchObject({ action: 'APPROVE', comments: 'Looks fine', performed_by: 1 });
    expect(historyModel.add.mock.calls[1][0]).toMatchObject({ action: 'COMPLETE', performed_by: 1 });
  });

  it('works without a comment', async () => {
    awaiting();
    expect((await approve(admin)).status).toBe(200);
  });

  it('returns 403 for a normal user and changes nothing', async () => {
    awaiting();
    const res = await approve(bob);
    expect(res.status).toBe(403);
    expect(expenseModel.changeStatus).not.toHaveBeenCalled();
  });

  it('returns 409 when the expense is not awaiting approval', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'DRAFT' }));
    expect((await approve(admin)).status).toBe(409);
  });

  it('returns 404 for an unknown expense', async () => {
    expenseModel.findById.mockResolvedValue(undefined);
    expect((await approve(admin)).status).toBe(404);
  });

  it('returns 409 when two admins act at once (race)', async () => {
    awaiting();
    expenseModel.changeStatus.mockResolvedValue(false);
    expect((await approve(admin)).status).toBe(409);
  });
});

describe('POST /api/expenses/:id/reject', () => {
  const awaiting = () => expenseModel.findById.mockResolvedValue(makeExpense({ amount: 12500, status: 'APPROVAL_REQUIRED' }));
  const reject = (user, body) => request(app).post('/api/expenses/10/reject').set(as(user)).send(body);

  it('lets an admin reject with a comment', async () => {
    awaiting();
    const res = await reject(admin, { comment: '  Missing receipt  ' });
    expect(res.status).toBe(200);
    expect(moves()).toEqual(['APPROVAL_REQUIRED>REJECTED']);
    expect(historyModel.add.mock.calls[0][0]).toMatchObject({ action: 'REJECT', comments: 'Missing receipt' });
  });

  it.each([
    ['no comment', {}],
    ['a blank comment', { comment: '   ' }],
  ])('returns 400 for %s', async (name, body) => {
    awaiting();
    const res = await reject(admin, body);
    expect(res.status).toBe(400);
    expect(res.body.errors[0].message).toBe('A comment is required when rejecting');
    expect(expenseModel.changeStatus).not.toHaveBeenCalled();
  });

  it('returns 403 for a normal user', async () => {
    awaiting();
    expect((await reject(bob, { comment: 'nope' })).status).toBe(403);
    expect(expenseModel.changeStatus).not.toHaveBeenCalled();
  });

  it('returns 409 when the expense is not awaiting approval', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'COMPLETED' }));
    expect((await reject(admin, { comment: 'late' })).status).toBe(409);
  });
});

describe('GET /api/expenses/:id/history', () => {
  const history = (user) => request(app).get('/api/expenses/10/history').set(as(user));

  it('returns the timeline to the owner and to an admin', async () => {
    const res = await history(bob);
    expect(res.status).toBe(200);
    expect(res.body.data.history).toHaveLength(1);
    expect((await history(admin)).status).toBe(403); // drafts are private to their owner
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'APPROVAL_REQUIRED' }));
    expect((await history(admin)).status).toBe(200);
  });

  it('returns 403 to another user', async () => {
    expect((await history(carol)).status).toBe(403);
    expect(historyModel.findByExpenseId).not.toHaveBeenCalled();
  });
});
