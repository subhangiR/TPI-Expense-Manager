const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');

async function login(email, password) {
  const user = await userModel.findByEmail(email);

  // Same message for "no such user" and "wrong password" so attackers
  // can't discover which emails are registered.
  const passwordMatches = user && (await bcrypt.compare(password, user.password_hash));
  if (!passwordMatches) {
    throw new ApiError(401, 'Incorrect email or password. Please try again.');
  }

  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account is inactive. Please contact your administrator.');
  }

  // The token only carries the user id; role is re-read from the DB on each request.
  const token = jwt.sign({ sub: String(user.id) }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
    algorithm: 'HS256',
  });

  const { password_hash, ...safeUser } = user;
  return { token, user: safeUser };
}

module.exports = { login };
