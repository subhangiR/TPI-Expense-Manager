class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors; // optional list, e.g. field-level validation messages
  }
}

module.exports = ApiError;
