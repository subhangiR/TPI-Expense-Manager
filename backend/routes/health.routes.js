const express = require('express');
const pool = require('../config/db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

// Is the database reachable? (Express 5 sends a rejected promise to the error handler.)
router.get('/db', async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ success: true, status: 'ok', database: 'up' });
});

module.exports = router;
