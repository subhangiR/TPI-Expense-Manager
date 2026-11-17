const workflowService = require('../services/workflow.service');

async function submit(req, res) {
  const expense = await workflowService.submit(req.user, req.validated.params.id);
  res.json({ success: true, data: { expense } });
}

async function approve(req, res) {
  const expense = await workflowService.approve(req.user, req.validated.params.id, req.validated.body.comment);
  res.json({ success: true, data: { expense } });
}

async function reject(req, res) {
  const expense = await workflowService.reject(req.user, req.validated.params.id, req.validated.body.comment);
  res.json({ success: true, data: { expense } });
}

async function history(req, res) {
  const history = await workflowService.getHistory(req.user, req.validated.params.id);
  res.json({ success: true, data: { history } });
}

module.exports = { submit, approve, reject, history };
