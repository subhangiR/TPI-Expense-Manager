const expenseModel = require('../models/expense.model');
const historyModel = require('../models/history.model');
const withTransaction = require('../utils/transaction');
const ApiError = require('../utils/ApiError');
const describeChanges = require('../utils/describeChanges');
const { STATUS, STATUS_LABEL } = require('../constants/expense');

const isAdmin = (user) => user.role === 'admin';

// Drafts are private to their owner. An admin sees every submitted expense; a normal user only their own.
const canAccess = (user, expense) =>
  (isAdmin(user) && expense.status !== STATUS.DRAFT) ||
  String(expense.employee_id) === String(user.id) ||
  String(expense.created_by) === String(user.id);

async function getAccessibleExpense(user, id, deniedMessage) {
  const expense = await expenseModel.findById(id);
  if (!expense) throw new ApiError(404, 'We could not find this expense. It may have been deleted.');
  if (!canAccess(user, expense)) throw new ApiError(403, deniedMessage);
  return expense;
}

// Creating, editing, deleting and submitting belong to the employee who owns the expense. Admins only review.
async function getOwnExpense(user, id, deniedMessage) {
  const expense = await getAccessibleExpense(user, id, deniedMessage);
  if (String(expense.employee_id) !== String(user.id)) throw new ApiError(403, deniedMessage);
  return expense;
}

async function list(requester, query) {
  const { expenses, total } = await expenseModel.findAll({
    ...query,
    ownerId: isAdmin(requester) ? undefined : requester.id,
    excludeDrafts: isAdmin(requester),
  });

  return {
    expenses,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    },
  };
}

// Dashboard numbers. Admins see everything, users their own. Every status is listed, even with 0.
// An optional date range (by expense date) limits every number and chart.
const DEFAULT_TREND_MONTHS = 12; // with no range: the last 12 months
const MAX_TREND_MONTHS = 24; // a very long range is trimmed to its last 24 months
const MAX_DAILY_RANGE = 31; // a range up to a month is charted per day, longer ones per month

const pad = (n) => String(n).padStart(2, '0');
const toIso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromIso = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// The list of days or months the trend chart should show (so empty ones still appear as 0),
// plus the dates to query between.
function buildTrend({ dateFrom, dateTo }) {
  const periods = [];

  if (dateFrom && dateTo) {
    const from = fromIso(dateFrom);
    const to = fromIso(dateTo);
    const days = Math.round((to - from) / 86400000) + 1;

    if (days <= MAX_DAILY_RANGE) {
      for (let i = 0; i < days; i += 1) periods.push(toIso(new Date(from.getFullYear(), from.getMonth(), from.getDate() + i)));
      return { unit: 'day', periods, dateFrom, dateTo };
    }

    const last = new Date(to.getFullYear(), to.getMonth(), 1);
    for (let m = new Date(from.getFullYear(), from.getMonth(), 1); m <= last; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      periods.push(toIso(m).slice(0, 7));
    }
    const kept = periods.slice(-MAX_TREND_MONTHS);
    const firstDay = `${kept[0]}-01`;
    return { unit: 'month', periods: kept, dateFrom: firstDay > dateFrom ? firstDay : dateFrom, dateTo };
  }

  const now = new Date();
  for (let i = DEFAULT_TREND_MONTHS - 1; i >= 0; i -= 1) {
    periods.push(toIso(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  }
  // Only one end given: still respect it.
  const firstDay = `${periods[0]}-01`;
  return { unit: 'month', periods, dateFrom: dateFrom && dateFrom > firstDay ? dateFrom : firstDay, dateTo };
}

async function getStats(requester, query = {}) {
  const ownerId = isAdmin(requester) ? undefined : requester.id;
  const range = { dateFrom: query.dateFrom, dateTo: query.dateTo, excludeDrafts: isAdmin(requester) };
  const trend = buildTrend(range);

  const [rows, byCategory, byDepartment, periodRows] = await Promise.all([
    expenseModel.getStatsByStatus(ownerId, range),
    expenseModel.getSpendByCategory(ownerId, range),
    expenseModel.getSpendByDepartment(ownerId, range),
    expenseModel.getSpendByPeriod(ownerId, trend),
  ]);
  const byStatus = Object.values(STATUS).map((status) => {
    const row = rows.find((r) => r.status === status);
    return { status, count: row ? row.count : 0, amount: row ? row.amount : 0 };
  });
  const byPeriod = trend.periods.map((period) => {
    const row = periodRows.find((r) => r.period === period);
    return { period, amount: row ? row.amount : 0, count: row ? row.count : 0 };
  });
  return {
    total_count: byStatus.reduce((sum, s) => sum + s.count, 0),
    total_amount: byStatus.reduce((sum, s) => sum + s.amount, 0),
    by_status: byStatus,
    by_category: byCategory,
    by_department: byDepartment,
    period_unit: trend.unit, // 'day' or 'month': what each entry of by_period stands for
    by_period: byPeriod,
  };
}

function getById(requester, id) {
  return getAccessibleExpense(requester, id, 'You do not have permission to view this expense');
}

async function create(requester, data) {
  if (isAdmin(requester)) throw new ApiError(403, 'Administrators review expenses. Only employees can create them.');

  // Expense + its first history row are saved together or not at all.
  const id = await withTransaction(async (client) => {
    const newId = await expenseModel.insert(
      { ...data, employee_id: requester.id, created_by: requester.id },
      client
    );
    await historyModel.add(
      { expense_id: newId, from_status: null, to_status: STATUS.DRAFT, action: 'CREATE', performed_by: requester.id },
      client
    );
    return newId;
  });

  return expenseModel.findById(id);
}

async function update(requester, id, fields) {
  const expense = await getOwnExpense(requester, id, 'You can only edit your own expenses.');

  if (expense.status !== STATUS.DRAFT) {
    throw new ApiError(409, `This expense is ${STATUS_LABEL[expense.status]} and can no longer be edited. Only drafts can be edited.`);
  }

  // The edit and its audit row are saved together or not at all.
  return withTransaction(async (client) => {
    const updated = await expenseModel.updateDraft(id, fields, client);
    if (!updated) throw new ApiError(409, 'This expense was just updated by someone else and can no longer be edited. Please refresh.');

    const after = await expenseModel.findById(id, client);
    const changes = describeChanges(expense, after);
    if (changes) {
      await historyModel.add(
        { expense_id: id, from_status: STATUS.DRAFT, to_status: STATUS.DRAFT, action: 'UPDATE', comments: changes, performed_by: requester.id },
        client
      );
    }
    return after;
  });
}

async function remove(requester, id) {
  const expense = await getOwnExpense(requester, id, 'You can only delete your own expenses.');

  if (expense.status !== STATUS.DRAFT) {
    throw new ApiError(409, `This expense is ${STATUS_LABEL[expense.status]} and cannot be deleted. Only drafts can be deleted.`);
  }

  const removed = await expenseModel.removeDraft(id);
  if (!removed) throw new ApiError(409, 'This expense was just updated by someone else and cannot be deleted. Please refresh.');
}

module.exports = { list, getStats, getById, create, update, remove, getAccessibleExpense, getOwnExpense };
