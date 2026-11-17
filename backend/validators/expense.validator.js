const { z } = require('zod');
const { STATUSES, PRIORITIES } = require('../constants/expense');

const id = (label) =>
  z.coerce.number({ error: `${label} is required` }).int(`${label} is invalid`).positive(`${label} is required`);

// "YYYY-MM-DD" and a real calendar day (rejects 2026-02-31).
const isoDate = (label) =>
  z
    .string({ error: `${label} is required` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} must be in YYYY-MM-DD format`)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, `${label} is not a valid date`);

const fields = {
  title: z
    .string({ error: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(150, 'Title must be 150 characters or fewer'),
  department_id: id('Department'),
  category_id: id('Category'),
  amount: z
    .number({ error: 'Amount is required' })
    .positive('Amount must be greater than zero')
    .multipleOf(0.01, 'Amount can have at most 2 decimal places')
    .max(9999999999.99, 'Amount is too large'),
  expense_date: isoDate('Expense date'),
  description: z
    .string()
    .trim()
    .max(1000, 'Description must be 1000 characters or fewer')
    .transform((value) => value || null), // empty text is stored as NULL
  priority: z.enum(PRIORITIES, { error: 'Priority must be low, medium or high' }),
};

const createExpenseBody = z.object({
  title: fields.title,
  department_id: fields.department_id,
  category_id: fields.category_id,
  amount: fields.amount,
  expense_date: fields.expense_date,
  description: fields.description.optional().default(null),
  priority: fields.priority.default('medium'),
});

const updateExpenseBody = z
  .object({
    title: fields.title.optional(),
      department_id: fields.department_id.optional(),
    category_id: fields.category_id.optional(),
    amount: fields.amount.optional(),
    expense_date: fields.expense_date.optional(),
    description: fields.description.optional(),
    priority: fields.priority.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

const expenseIdParams = z.object({ id: id('Expense id') });

const listExpensesQuery = z
  .object({
    page: z.coerce.number().int().min(1, 'page must be 1 or more').default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, 'pageSize must be 1 or more')
      .max(100, 'pageSize cannot exceed 100')
      .default(10),
    search: z.string().trim().optional(),
    status: z.enum(STATUSES, { error: 'Invalid status' }).optional(),
    department: id('Department').optional(),
    category: id('Category').optional(),
    spend: z.literal('true', { error: 'spend must be true' }).optional(), // only expenses that count as spend
    dateFrom: isoDate('dateFrom').optional(),
    dateTo: isoDate('dateTo').optional(),
    sortBy: z
      .enum(
        ['id', 'title', 'employee_name', 'department', 'category', 'amount', 'status', 'expense_date', 'created_at'],
        { error: 'Invalid sortBy column' }
      )
      .default('created_at'),
    sortOrder: z.enum(['asc', 'desc'], { error: 'sortOrder must be asc or desc' }).default('desc'),
  })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: 'dateFrom must be on or before dateTo',
    path: ['dateFrom'],
  });

const statsQuery = z
  .object({ dateFrom: isoDate('dateFrom').optional(), dateTo: isoDate('dateTo').optional() })
  .refine((query) => !query.dateFrom || !query.dateTo || query.dateFrom <= query.dateTo, {
    message: 'dateFrom must be on or before dateTo',
    path: ['dateFrom'],
  });

// Approving: the comment is optional. Rejecting: the comment is required.
const approveBody = z.object({
  comment: z.string().trim().max(500, 'Comment must be 500 characters or fewer').optional(),
});

const rejectBody = z.object({
  comment: z
    .string({ error: 'A comment is required when rejecting' })
    .trim()
    .min(1, 'A comment is required when rejecting')
    .max(500, 'Comment must be 500 characters or fewer'),
});

module.exports = {
  createExpenseBody, updateExpenseBody, expenseIdParams, listExpensesQuery, statsQuery, approveBody, rejectBody,
};
