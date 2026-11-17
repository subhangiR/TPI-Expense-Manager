const express = require('express');

const router = express.Router();

router.use('/health', require('./health.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/expenses', require('./expense.routes'));
router.use('/events', require('./events.routes'));
router.use('/', require('./lookup.routes')); // /api/departments and /api/categories

module.exports = router;
