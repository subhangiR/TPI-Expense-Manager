process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

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
const app = require('../../backend/app');

const admin = { id: 1, name: 'Admin', role: 'admin', status: 'active' };
const bob = { id: 2, name: 'Bob', role: 'user', status: 'active' };
const carol = { id: 3, name: 'Carol', role: 'user', status: 'active' };
const people = { 1: admin, 2: bob, 3: carol };

const as = (user) => ({ Authorization: `Bearer ${jwt.sign({ sub: String(user.id) }, 'test-secret')}` });

const makeExpense = (overrides = {}) => ({
  id: 10, title: 'Taxi', employee_id: 2, created_by: 2, department_id: 1, category_id: 1,
  amount: 950, expense_date: '2026-11-11', status: 'DRAFT', priority: 'low', ...overrides,
});

const validBody = {
  title: 'Client Meeting Travel', department_id: 1, category_id: 1,
  amount: 12500, expense_date: '2026-11-10', description: 'Travel expenses', priority: 'high',
};

beforeEach(() => {
  jest.resetAllMocks();
  // No real transaction in unit tests: just run the work with a fake client.
  withTransaction.mockImplementation((work) => work({ fake: 'client' }));
  userModel.findById.mockImplementation(async (id) => people[id]);
  expenseModel.findById.mockResolvedValue(makeExpense());
  expenseModel.findAll.mockResolvedValue({ expenses: [makeExpense()], total: 25 });
  expenseModel.insert.mockResolvedValue(10);
  expenseModel.updateDraft.mockResolvedValue(true);
  expenseModel.removeDraft.mockResolvedValue(true);
});

describe('GET /api/expenses', () => {
  it('limits a normal user to their own expenses', async () => {
    await request(app).get('/api/expenses').set(as(bob));
    expect(expenseModel.findAll.mock.calls[0][0].ownerId).toBe(2);
  });

  it('lets an admin see all expenses (no owner filter)', async () => {
    await request(app).get('/api/expenses').set(as(admin));
    expect(expenseModel.findAll.mock.calls[0][0].ownerId).toBeUndefined();
  });

  it('applies defaults and returns pagination info', async () => {
    const res = await request(app).get('/api/expenses').set(as(admin));
    expect(res.status).toBe(200);
    expect(expenseModel.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 10, sortBy: 'created_at', sortOrder: 'desc' })
    );
    expect(res.body.data.pagination).toEqual({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
  });

  it('passes search, filters, sorting and paging to the model', async () => {
    const query =
      'page=2&pageSize=5&search=taxi&status=DRAFT&department=3&category=2' +
      '&dateFrom=2026-11-01&dateTo=2026-11-30&sortBy=amount&sortOrder=asc';
    await request(app).get(`/api/expenses?${query}`).set(as(admin));
    expect(expenseModel.findAll).toHaveBeenCalledWith({
      ownerId: undefined, excludeDrafts: true, page: 2, pageSize: 5, search: 'taxi', status: 'DRAFT', department: 3,
      category: 2, dateFrom: '2026-11-01', dateTo: '2026-11-30', sortBy: 'amount', sortOrder: 'asc',
    });
  });

  it.each([
    ['unknown sort column', 'sortBy=password_hash'],
    ['bad status', 'status=NOPE'],
    ['pageSize too big', 'pageSize=500'],
    ['page zero', 'page=0'],
    ['bad date', 'dateFrom=yesterday'],
    ['reversed date range', 'dateFrom=2026-12-01&dateTo=2026-11-01'],
  ])('returns 400 for %s', async (name, query) => {
    const res = await request(app).get(`/api/expenses?${query}`).set(as(admin));
    expect(res.status).toBe(400);
    expect(expenseModel.findAll).not.toHaveBeenCalled();
  });

  it('returns 401 without a token', async () => {
    expect((await request(app).get('/api/expenses')).status).toBe(401);
  });
});

describe('GET /api/expenses/stats', () => {
  beforeEach(() => {
    expenseModel.getStatsByStatus.mockResolvedValue([
      { status: 'DRAFT', count: 2, amount: 1000 },
      { status: 'COMPLETED', count: 1, amount: 500 },
    ]);
    expenseModel.getSpendByCategory.mockResolvedValue([{ name: 'Travel', amount: 500, count: 1 }]);
    expenseModel.getSpendByDepartment.mockResolvedValue([{ name: 'Sales', amount: 500, count: 1 }]);
    expenseModel.getSpendByPeriod.mockResolvedValue([]);
  });

  it('returns chart data and fills the last 12 months, even with no spend', async () => {
    const res = await request(app).get('/api/expenses/stats').set(as(bob));
    expect(res.body.data.period_unit).toBe('month');
    expect(res.body.data.by_period).toHaveLength(12);
    expect(res.body.data.by_period.every((m) => m.amount === 0 && m.count === 0)).toBe(true);
    expect(res.body.data.by_category).toEqual([{ name: 'Travel', amount: 500, count: 1 }]);
    expect(res.body.data.by_department).toEqual([{ name: 'Sales', amount: 500, count: 1 }]);
  });

  it('totals the counts, fills missing statuses with 0, and scopes users to their own', async () => {
    const res = await request(app).get('/api/expenses/stats').set(as(bob));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ total_count: 3, total_amount: 1500 });
    expect(res.body.data.by_status).toHaveLength(8);
    expect(res.body.data.by_status.find((s) => s.status === 'FAILED')).toEqual({ status: 'FAILED', count: 0, amount: 0 });
    expect(expenseModel.getStatsByStatus).toHaveBeenCalledWith(2, { dateFrom: undefined, dateTo: undefined, excludeDrafts: false });
  });

  it('gives admins everything (no owner filter)', async () => {
    await request(app).get('/api/expenses/stats').set(as(admin));
    expect(expenseModel.getStatsByStatus).toHaveBeenCalledWith(undefined, { dateFrom: undefined, dateTo: undefined, excludeDrafts: true });
  });

  it('limits every number to a date range and charts a short range per day', async () => {
    expenseModel.getSpendByPeriod.mockResolvedValue([{ period: '2026-11-03', amount: 400, count: 2 }]);
    const res = await request(app).get('/api/expenses/stats?dateFrom=2026-11-01&dateTo=2026-11-05').set(as(bob));
    const range = { dateFrom: '2026-11-01', dateTo: '2026-11-05', excludeDrafts: false };
    expect(expenseModel.getStatsByStatus).toHaveBeenCalledWith(2, range);
    expect(expenseModel.getSpendByCategory).toHaveBeenCalledWith(2, range);
    expect(res.body.data.period_unit).toBe('day');
    expect(res.body.data.by_period.map((p) => p.period)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']);
    expect(res.body.data.by_period[2]).toEqual({ period: '2026-11-03', amount: 400, count: 2 });
  });

  it('charts a longer range per month, including months with no spend', async () => {
    const res = await request(app).get('/api/expenses/stats?dateFrom=2026-01-15&dateTo=2026-04-10').set(as(bob));
    expect(res.body.data.period_unit).toBe('month');
    expect(res.body.data.by_period.map((p) => p.period)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
    expect(expenseModel.getSpendByPeriod).toHaveBeenCalledWith(2, { unit: 'month', periods: expect.any(Array), dateFrom: '2026-01-15', dateTo: '2026-04-10' });
  });

  it('rejects a range that ends before it starts', async () => {
    const res = await request(app).get('/api/expenses/stats?dateFrom=2026-05-01&dateTo=2026-04-01').set(as(bob));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/expenses', () => {
  const post = (user, body) => request(app).post('/api/expenses').set(as(user)).send(body);

  it('creates a DRAFT for the logged-in user and records history', async () => {
    const res = await post(bob, validBody);
    expect(res.status).toBe(201);
    expect(expenseModel.insert).toHaveBeenCalledWith(
      expect.objectContaining({ employee_id: 2, created_by: 2, amount: 12500 }),
      { fake: 'client' }
    );
    expect(historyModel.add).toHaveBeenCalledWith(
      { expense_id: 10, from_status: null, to_status: 'DRAFT', action: 'CREATE', performed_by: 2 },
      { fake: 'client' }
    );
  });

  it('defaults priority to medium and empty description to null', async () => {
    const { priority, description, ...rest } = validBody;
    await post(bob, { ...rest, description: '   ' });
    expect(expenseModel.insert.mock.calls[0][0]).toMatchObject({ priority: 'medium', description: null });
  });

  it('ignores an employee_id sent by the client and uses the logged-in user', async () => {
    await post(bob, { ...validBody, employee_id: 3 });
    expect(expenseModel.insert.mock.calls[0][0]).toMatchObject({ employee_id: 2, created_by: 2 });
  });

  it('stops an admin creating an expense', async () => {
    const res = await post(admin, validBody);
    expect(res.status).toBe(403);
    expect(expenseModel.insert).not.toHaveBeenCalled();
  });

  it.each([
    ['missing title', { title: undefined }, 'title', 'Title is required'],
    ['blank title', { title: '   ' }, 'title', 'Title is required'],
    ['zero amount', { amount: 0 }, 'amount', 'Amount must be greater than zero'],
    ['negative amount', { amount: -5 }, 'amount', 'Amount must be greater than zero'],
    ['3 decimal places', { amount: 10.123 }, 'amount', 'Amount can have at most 2 decimal places'],
    ['text amount', { amount: 'lots' }, 'amount', 'Amount is required'],
    ['missing department', { department_id: undefined }, 'department_id', 'Department is required'],
    ['bad date format', { expense_date: '10-Nov-2026' }, 'expense_date', 'Expense date must be in YYYY-MM-DD format'],
    ['impossible date', { expense_date: '2026-02-31' }, 'expense_date', 'Expense date is not a valid date'],
    ['bad priority', { priority: 'urgent' }, 'priority', 'Priority must be low, medium or high'],
  ])('returns 400 for %s', async (name, change, field, message) => {
    const res = await post(bob, { ...validBody, ...change });
    expect(res.status).toBe(400);
    expect(res.body.errors).toContainEqual({ field, message });
    expect(expenseModel.insert).not.toHaveBeenCalled();
  });
});

describe('GET /api/expenses/:id', () => {
  it('returns the expense to its owner', async () => {
    const res = await request(app).get('/api/expenses/10').set(as(bob));
    expect(res.status).toBe(200);
    expect(res.body.data.expense.id).toBe(10);
  });

  it('returns it to the user who created it for someone else', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ employee_id: 3, created_by: 2 }));
    expect((await request(app).get('/api/expenses/10').set(as(bob))).status).toBe(200);
  });

  it('returns 403 to another user', async () => {
    expect((await request(app).get('/api/expenses/10').set(as(carol))).status).toBe(403);
  });

  it('returns a submitted expense to an admin but keeps drafts private', async () => {
    expect((await request(app).get('/api/expenses/10').set(as(admin))).status).toBe(403);
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'APPROVAL_REQUIRED' }));
    expect((await request(app).get('/api/expenses/10').set(as(admin))).status).toBe(200);
  });

  it('returns 404 when missing and 400 for a bad id', async () => {
    expenseModel.findById.mockResolvedValue(undefined);
    expect((await request(app).get('/api/expenses/99').set(as(admin))).status).toBe(404);
    expect((await request(app).get('/api/expenses/abc').set(as(admin))).status).toBe(400);
  });
});

describe('PATCH /api/expenses/:id', () => {
  const patch = (user, body) => request(app).patch('/api/expenses/10').set(as(user)).send(body);

  it('lets the owner edit a draft', async () => {
    const res = await patch(bob, { title: 'Airport taxi', amount: 1100 });
    expect(res.status).toBe(200);
    expect(expenseModel.updateDraft).toHaveBeenCalledWith(10, { title: 'Airport taxi', amount: 1100 }, { fake: 'client' });
  });

  it('records what changed in the history, with old and new values', async () => {
    expenseModel.findById
      .mockResolvedValueOnce(makeExpense({ title: 'Taxi', amount: 950 }))
      .mockResolvedValueOnce(makeExpense({ title: 'Airport taxi', amount: 1100 }));
    await patch(bob, { title: 'Airport taxi', amount: 1100 });
    expect(historyModel.add).toHaveBeenCalledWith(
      expect.objectContaining({ expense_id: 10, action: 'UPDATE', comments: 'Title: Taxi → Airport taxi\nAmount: 950 → 1100', performed_by: 2 }),
      { fake: 'client' }
    );
  });

  it('writes no history row when nothing actually changed', async () => {
    await patch(bob, { title: 'Taxi' });
    expect(historyModel.add).not.toHaveBeenCalled();
  });

  it('returns 409 when the expense is no longer a draft', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'SUBMITTED' }));
    const res = await patch(bob, { title: 'Too late' });
    expect(res.status).toBe(409);
    expect(expenseModel.updateDraft).not.toHaveBeenCalled();
  });

  it('returns 409 if the status changed between the check and the update', async () => {
    expenseModel.updateDraft.mockResolvedValue(false);
    expect((await patch(bob, { title: 'Race' })).status).toBe(409);
  });

  it('returns 403 for someone else\'s expense', async () => {
    expect((await patch(carol, { title: 'Mine now' })).status).toBe(403);
  });

  it('stops an admin editing an expense', async () => {
    expect((await patch(admin, { title: 'Admin edit' })).status).toBe(403);
    expect(expenseModel.updateDraft).not.toHaveBeenCalled();
  });

  it('returns 400 for an empty body or an invalid field', async () => {
    expect((await patch(bob, {})).status).toBe(400);
    expect((await patch(bob, { amount: 0 })).status).toBe(400);
  });

  it('ignores fields that are not editable, such as status', async () => {
    await patch(bob, { title: 'Sneaky', status: 'APPROVED' });
    expect(expenseModel.updateDraft).toHaveBeenCalledWith(10, { title: 'Sneaky' }, { fake: 'client' });
  });
});

describe('DELETE /api/expenses/:id', () => {
  const del = (user) => request(app).delete('/api/expenses/10').set(as(user));

  it('lets the owner delete a draft', async () => {
    const res = await del(bob);
    expect(res.status).toBe(200);
    expect(expenseModel.removeDraft).toHaveBeenCalledWith(10);
  });

  it('returns 409 for a non-draft expense', async () => {
    expenseModel.findById.mockResolvedValue(makeExpense({ status: 'COMPLETED' }));
    expect((await del(bob)).status).toBe(409);
    expect(expenseModel.removeDraft).not.toHaveBeenCalled();
  });

  it('returns 403 for someone else\'s expense (admins included) and 404 when missing', async () => {
    expect((await del(carol)).status).toBe(403);
    expect((await del(admin)).status).toBe(403);
    expenseModel.findById.mockResolvedValue(undefined);
    expect((await del(admin)).status).toBe(404);
  });
});
