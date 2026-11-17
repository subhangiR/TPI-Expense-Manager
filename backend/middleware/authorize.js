const ApiError = require('../utils/ApiError');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, 'This action is available to administrators only.');
  }
  next();
};

module.exports = authorize;
