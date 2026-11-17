// Every error response has the same JSON shape:
//   { "success": false, "message": "...", "errors": [ ... optional ... ] }
const ApiError = require('../utils/ApiError');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express recognises an error handler by its 4 parameters, so keep `next`.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again in a moment.';
  let errors;

  if (err instanceof ApiError) {
    status = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Request body is not valid JSON';
  } else if (err.code === '23505') {
    status = 409; // Postgres: unique constraint violated
    message = 'A record with these details already exists.';
  } else if (err.code === '23503') {
    status = 400; // Postgres: foreign key violated
    message = 'One of the selected values is no longer available. Please refresh and try again.';
  } else {
    console.error(err); // unexpected: log it, but don't leak details to the client
  }

  res.status(status).json({ success: false, message, ...(errors && { errors }) });
}

module.exports = { notFound, errorHandler };
