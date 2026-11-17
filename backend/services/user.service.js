const userModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');

function list(filters) {
  return userModel.findAll(filters);
}

async function getById(requester, id) {
  if (requester.role !== 'admin' && String(requester.id) !== String(id)) {
    throw new ApiError(403, 'You can only view your own profile.');
  }

  const user = await userModel.findById(id);
  if (!user) throw new ApiError(404, 'We could not find this user.');
  return user;
}

async function update(requester, id, fields) {
  // Stops an admin from locking themselves out of the system.
  const changesOwnAccess = fields.role !== undefined || fields.status !== undefined;
  if (String(requester.id) === String(id) && changesOwnAccess) {
    throw new ApiError(400, 'You cannot change your own role or status.');
  }

  const user = await userModel.update(id, fields);
  if (!user) throw new ApiError(404, 'We could not find this user.');
  return user;
}

module.exports = { list, getById, update };
