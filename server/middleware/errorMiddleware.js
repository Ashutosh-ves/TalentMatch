const errorMiddleware = (err, req, res, next) => {
  // Log method, URL and error message/details (strictly never log request bodies)
  console.error(`[${req.method}] ${req.originalUrl || req.url} - Error:`, err.message || err);

  let statusCode = err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Map MongoDB duplicate-key (11000) errors to a 400 Bad Request
  if (err.code === 11000) {
    statusCode = 400;
    const fields = Object.keys(err.keyValue || err.keyPattern || {}).join(', ');
    message = fields
      ? `Duplicate entry error for field(s): ${fields}. A record with this information already exists.`
      : 'Duplicate key error: A record with this information already exists.';
  }

  const response = {
    success: false,
    message,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorMiddleware;
