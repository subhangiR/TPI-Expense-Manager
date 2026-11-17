const userService = require('../services/user.service');

async function list(req, res) {
  const users = await userService.list(req.validated.query);
  res.json({ success: true, data: { users } });
}

async function getById(req, res) {
  const user = await userService.getById(req.user, req.validated.params.id);
  res.json({ success: true, data: { user } });
}

async function update(req, res) {
  const user = await userService.update(req.user, req.validated.params.id, req.validated.body);
  res.json({ success: true, data: { user } });
}

module.exports = { list, getById, update };
