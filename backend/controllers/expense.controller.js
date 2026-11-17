const expenseService = require('../services/expense.service');

async function list(req, res) {
  const data = await expenseService.list(req.user, req.validated.query);
  res.json({ success: true, data });
}

async function stats(req, res) {
  const data = await expenseService.getStats(req.user, req.validated.query);
  res.json({ success: true, data });
}

async function getById(req, res) {
  const expense = await expenseService.getById(req.user, req.validated.params.id);
  res.json({ success: true, data: { expense } });
}

async function create(req, res) {
  const expense = await expenseService.create(req.user, req.validated.body);
  res.status(201).json({ success: true, data: { expense } });
}

async function update(req, res) {
  const expense = await expenseService.update(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, data: { expense } });
}

async function remove(req, res) {
  await expenseService.remove(req.user, req.validated.params.id);
  res.json({ success: true, message: 'Expense deleted' });
}

module.exports = { list, stats, getById, create, update, remove };
