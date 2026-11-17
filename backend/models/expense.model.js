const pool = require('../config/db');

const FROM_CLAUSE = `
  FROM expenses e
  JOIN users emp     ON emp.id = e.employee_id
  JOIN users creator ON creator.id = e.created_by
  JOIN departments d ON d.id = e.department_id
  JOIN categories c  ON c.id = e.category_id`;

// The readable expense ID: the id padded to 3 digits (1 -> 001). It is worked out from the id, so nothing extra is stored.
const DISPLAY_ID = `LPAD(e.id::text, 3, '0')`;

const SELECT_COLUMNS = `
  SELECT e.id, ${DISPLAY_ID} AS display_id, e.title,
         e.employee_id, emp.name AS employee_name,
         e.department_id, d.name AS department,
         e.category_id, c.name AS category,
         e.amount, e.expense_date, e.description, e.priority, e.status,
         e.created_by, creator.name AS created_by_name,
         e.created_at, e.updated_at`;

// sortBy value from the API -> real SQL column. Only these can be sorted on,
// so user input is never placed into the SQL text.
const SORT_COLUMNS = {
  id: 'e.id',
  title: 'e.title',
  employee_name: 'emp.name',
  department: 'd.name',
  category: 'c.name',
  amount: 'e.amount',
  status: 'e.status',
  expense_date: 'e.expense_date',
  created_at: 'e.created_at',
};

const EDITABLE_COLUMNS = [
  'title', 'department_id', 'category_id',
  'amount', 'expense_date', 'description', 'priority',
];

function buildWhere({ ownerId, excludeDrafts, search, status, department, category, spend, dateFrom, dateTo }) {
  const conditions = [];
  const values = [];
  const param = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (ownerId) {
    const p = param(ownerId);
    conditions.push(`(e.employee_id = ${p} OR e.created_by = ${p})`);
  }
  if (excludeDrafts) conditions.push(`e.status <> 'DRAFT'`);
  if (search) {
    // Escape LIKE wildcards so a typed "%" or "_" is searched literally.
    const p = param(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
    conditions.push(`(e.title ILIKE ${p} OR e.description ILIKE ${p} OR emp.name ILIKE ${p} OR ${DISPLAY_ID} ILIKE ${p})`); // the ID can be searched too
  }
  if (status) conditions.push(`e.status = ${param(status)}`);
  if (spend) conditions.push(SPEND_FILTER); // same rule as the dashboard's total spend
  if (department) conditions.push(`e.department_id = ${param(department)}`);
  if (category) conditions.push(`e.category_id = ${param(category)}`);
  if (dateFrom) conditions.push(`e.expense_date >= ${param(dateFrom)}`);
  if (dateTo) conditions.push(`e.expense_date <= ${param(dateTo)}`);

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    values,
  };
}

async function findAll({ sortBy, sortOrder, page, pageSize, ...filters }) {
  const { where, values } = buildWhere(filters);

  const { rows: countRows } = await pool.query(`SELECT COUNT(*) AS total ${FROM_CLAUSE} ${where}`, values);

  const orderColumn = SORT_COLUMNS[sortBy];
  const direction = sortOrder === 'asc' ? 'ASC' : 'DESC';
  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;

  const { rows } = await pool.query(
    `${SELECT_COLUMNS} ${FROM_CLAUSE} ${where}
     ORDER BY ${orderColumn} ${direction}, e.id DESC
     LIMIT ${limitParam} OFFSET ${offsetParam}`,
    [...values, pageSize, (page - 1) * pageSize]
  );

  return { expenses: rows, total: countRows[0].total };
}

// Spend charts count real claims only: drafts, rejected and failed expenses are left out.
const SPEND_FILTER = `e.status NOT IN ('DRAFT', 'REJECTED', 'FAILED')`;

function statsWhere({ ownerId, excludeDrafts, dateFrom, dateTo, spendOnly }) {
  const conditions = [];
  const values = [];
  const param = (value) => {
    values.push(value);
    return `$${values.length}`;
  };

  if (ownerId) {
    const p = param(ownerId);
    conditions.push(`(e.employee_id = ${p} OR e.created_by = ${p})`);
  }
  if (excludeDrafts) conditions.push(`e.status <> 'DRAFT'`);
  if (spendOnly) conditions.push(SPEND_FILTER);
  if (dateFrom) conditions.push(`e.expense_date >= ${param(dateFrom)}`);
  if (dateTo) conditions.push(`e.expense_date <= ${param(dateTo)}`);

  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', values, param };
}

async function getStatsByStatus(ownerId, range = {}) {
  const { where, values } = statsWhere({ ownerId, ...range });
  const { rows } = await pool.query(
    `SELECT e.status, COUNT(*) AS count, COALESCE(SUM(e.amount), 0) AS amount
     FROM expenses e ${where}
     GROUP BY e.status`,
    values
  );
  return rows;
}

async function getSpendByCategory(ownerId, range = {}) {
  const { where, values } = statsWhere({ ownerId, ...range, spendOnly: true });
  const { rows } = await pool.query(
    `SELECT c.name, SUM(e.amount) AS amount, COUNT(*) AS count
     FROM expenses e JOIN categories c ON c.id = e.category_id ${where}
     GROUP BY c.name ORDER BY amount DESC`,
    values
  );
  return rows;
}

async function getSpendByDepartment(ownerId, range = {}) {
  const { where, values } = statsWhere({ ownerId, ...range, spendOnly: true });
  const { rows } = await pool.query(
    `SELECT d.name, SUM(e.amount) AS amount, COUNT(*) AS count
     FROM expenses e JOIN departments d ON d.id = e.department_id ${where}
     GROUP BY d.name ORDER BY amount DESC`,
    values
  );
  return rows;
}

async function getSpendByPeriod(ownerId, { unit, dateFrom, dateTo }) {
  const { where, values, param } = statsWhere({ ownerId, dateFrom, dateTo, spendOnly: true });
  const format = param(unit === 'day' ? 'YYYY-MM-DD' : 'YYYY-MM');
  const { rows } = await pool.query(
    `SELECT to_char(e.expense_date, ${format}) AS period, SUM(e.amount) AS amount, COUNT(*) AS count
     FROM expenses e ${where}
     GROUP BY period ORDER BY period`,
    values
  );
  return rows;
}

// `db` is the shared pool by default, or a transaction client when passed in.
async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_COLUMNS} ${FROM_CLAUSE} WHERE e.id = $1`, [id]);
  return rows[0];
}

async function insert(data, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO expenses
       (title, employee_id, department_id, category_id, amount, expense_date, description, priority, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      data.title, data.employee_id, data.department_id, data.category_id,
      data.amount, data.expense_date, data.description, data.priority, data.created_by,
    ]
  );
  return rows[0].id;
}

// Only drafts can be edited. The status check is inside the UPDATE itself, so even
// if two requests race, a submitted expense can never be changed. Returns false if no row matched.
async function updateDraft(id, fields, db = pool) {
  const columns = Object.keys(fields).filter((key) => EDITABLE_COLUMNS.includes(key));
  const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
  const values = columns.map((column) => fields[column]);
  values.push(id);

  const { rowCount } = await db.query(
    `UPDATE expenses SET ${assignments.join(', ')}
     WHERE id = $${values.length} AND status = 'DRAFT'`,
    values
  );
  return rowCount === 1;
}

// Same idea: only drafts can be deleted. History rows go with it (ON DELETE CASCADE).
async function removeDraft(id) {
  const { rowCount } = await pool.query(`DELETE FROM expenses WHERE id = $1 AND status = 'DRAFT'`, [id]);
  return rowCount === 1;
}

// Moves an expense to a new status, but only if it is still in the status we expect.
// If another request changed it first, nothing updates and we return false.
async function changeStatus(id, fromStatus, toStatus, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE expenses SET status = $1 WHERE id = $2 AND status = $3',
    [toStatus, id, fromStatus]
  );
  return rowCount === 1;
}

module.exports = { findAll, getStatsByStatus, getSpendByCategory, getSpendByDepartment, getSpendByPeriod, findById, insert, updateDraft, removeDraft, changeStatus };
