const pool = require('../config/db');

// Columns that are safe to send to the client (never password_hash).
// The department name comes from a join, so every read goes through USERS_WITH_DEPARTMENT.
const PUBLIC_COLUMNS =
  'u.id, u.name, u.email, u.role, u.status, u.department_id, d.name AS department, u.created_at, u.updated_at';
const USERS_WITH_DEPARTMENT = 'users u LEFT JOIN departments d ON d.id = u.department_id';

async function findByEmail(email) {
  const { rows } = await pool.query(
    `SELECT u.*, d.name AS department FROM ${USERS_WITH_DEPARTMENT} WHERE LOWER(u.email) = LOWER($1)`,
    [email]
  );
  return rows[0]; // includes password_hash, only used for login
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM ${USERS_WITH_DEPARTMENT} WHERE u.id = $1`,
    [id]
  );
  return rows[0];
}

async function findAll({ search, role, status } = {}) {
  const conditions = [];
  const values = [];

  // Each filter adds a "$n" placeholder, so user input never goes into the SQL text.
  if (search) {
    values.push(`%${search}%`);
    conditions.push(`(u.name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
  }
  if (role) {
    values.push(role);
    conditions.push(`u.role = $${values.length}`);
  }
  if (status) {
    values.push(status);
    conditions.push(`u.status = $${values.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} FROM ${USERS_WITH_DEPARTMENT} ${where} ORDER BY u.name`,
    values
  );
  return rows;
}

async function update(id, fields) {
  const allowed = ['name', 'role', 'status'];
  const columns = Object.keys(fields).filter((key) => allowed.includes(key));

  const assignments = columns.map((column, index) => `${column} = $${index + 1}`);
  const values = columns.map((column) => fields[column]);
  values.push(id);

  await pool.query(`UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length}`, values);
  return findById(id); // read again so the department name is included
}

module.exports = { findByEmail, findById, findAll, update };
