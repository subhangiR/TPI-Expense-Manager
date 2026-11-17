const authService = require('../services/auth.service');

async function login(req, res) {
  const { email, password } = req.validated.body;
  const result = await authService.login(email, password);
  res.json({ success: true, data: result });
}

// authenticate middleware already loaded req.user.
function me(req, res) {
  res.json({ success: true, data: { user: req.user } });
}

module.exports = { login, me };
