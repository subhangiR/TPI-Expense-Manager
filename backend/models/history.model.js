const pool = require('../config/db');

// `db` is the shared pool by default, or a transaction client when called inside withTransaction.
async function add({ expense_id, from_status, to_status, action, comments = null, performed_by }, db = pool) {
  await db.query(
    `INSERT INTO expense_history (expense_id, from_status, to_status, action, comments, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [expense_id, from_status, to_status, action, comments, performed_by]
  );
}

// Oldest first, so the timeline reads top to bottom.
async function findByExpenseId(expenseId) {
  const { rows } = await pool.query(
    `SELECT h.id, h.expense_id, h.from_status, h.to_status, h.action, h.comments,
            h.performed_by, u.name AS performed_by_name, h.created_at
     FROM expense_history h
     JOIN users u ON u.id = h.performed_by
     WHERE h.expense_id = $1
     ORDER BY h.created_at, h.id`,
    [expenseId]
  );
  return rows;
}

module.exports = { add, findByExpenseId };
