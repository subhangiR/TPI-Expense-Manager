const { Pool, types } = require('pg');
const { db } = require('./env');

// By default pg returns BIGINT and NUMERIC as strings and DATE as a JS Date
// (which shifts with the server's timezone). These three lines make the JSON
// the frontend receives simple: ids and amounts are numbers, dates are "YYYY-MM-DD".
types.setTypeParser(20, Number); // BIGINT  (ids, COUNT)
types.setTypeParser(1700, parseFloat); // NUMERIC (amount)
types.setTypeParser(1082, (value) => value); // DATE    (expense_date)

const pool = new Pool(db);

// An idle connection can break (DB restart). Without this listener Node would crash.
pool.on('error', (error) => console.error(`Idle DB connection error: ${error.message}`));

module.exports = pool;
