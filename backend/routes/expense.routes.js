const express = require('express');
const controller = require('../controllers/expense.controller');
const workflow = require('../controllers/workflow.controller');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const {
  createExpenseBody,
  updateExpenseBody,
  expenseIdParams,
  listExpensesQuery,
  statsQuery,
  approveBody,
  rejectBody,
} = require('../validators/expense.validator');

const router = express.Router();

// Every expense route needs a logged-in user. Who can touch which expense is decided in the service.
router.use(authenticate);

router.get('/', validate(listExpensesQuery, 'query'), controller.list);
router.get('/stats', validate(statsQuery, 'query'), controller.stats); // must stay above '/:id'
router.post('/', validate(createExpenseBody), controller.create);
router.get('/:id', validate(expenseIdParams, 'params'), controller.getById);
router.patch('/:id', validate(expenseIdParams, 'params'), validate(updateExpenseBody), controller.update);
router.delete('/:id', validate(expenseIdParams, 'params'), controller.remove);

router.post('/:id/submit', validate(expenseIdParams, 'params'), workflow.submit);
router.post('/:id/approve', authorize('admin'), validate(expenseIdParams, 'params'), validate(approveBody), workflow.approve);
router.post('/:id/reject', authorize('admin'), validate(expenseIdParams, 'params'), validate(rejectBody), workflow.reject);
router.get('/:id/history', validate(expenseIdParams, 'params'), workflow.history);

module.exports = router;
