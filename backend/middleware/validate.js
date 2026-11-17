const ApiError = require('../utils/ApiError');

const validate = (schema, source = 'body') => (req, res, next) => {
  // Express 5 leaves req.body undefined when no body was sent, so treat that as {}.
  const result = schema.safeParse(req[source] ?? {});

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new ApiError(400, 'Validation failed', errors));
  }

  // Controllers read the cleaned data from req.validated.
  // (Express 5 makes req.query read-only, so we don't overwrite it.)
  req.validated = { ...req.validated, [source]: result.data };
  next();
};

module.exports = validate;
