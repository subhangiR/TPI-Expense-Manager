const pool = require('../config/db');

async function findDepartments() {
  const { rows } = await pool.query('SELECT id, name FROM departments ORDER BY name');
  return rows;
}

async function findCategories() {
  const { rows } = await pool.query('SELECT id, name FROM categories ORDER BY name');
  return rows;
}

module.exports = { findDepartments, findCategories };
