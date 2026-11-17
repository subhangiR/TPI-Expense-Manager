// A tiny in-process "message board". The workflow service announces that an
// expense changed; the real-time (SSE) module listens and pushes it to browsers.
// Keeping them apart means the workflow code knows nothing about SSE.
const { EventEmitter } = require('events');

const EXPENSE_CHANGED = 'expense:changed';

module.exports = new EventEmitter();
module.exports.EXPENSE_CHANGED = EXPENSE_CHANGED;
