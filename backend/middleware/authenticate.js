const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');

async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new ApiError(401, 'Please log in to continue.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret, { algorithms: ['HS256'] });
  } catch (error) {
    const message = error.name === 'TokenExpiredError' ? 'Your session has expired. Please log in again.' : 'Your session is not valid. Please log in again.';
    throw new ApiError(401, message);
  }

  // Load the user fresh so deactivated users and role changes apply immediately.
  const user = await userModel.findById(payload.sub);
  if (!user || user.status !== 'active') {
    throw new ApiError(401, 'Please log in to continue.');
  }

  req.user = user;
  next();
}

module.exports = authenticate;
