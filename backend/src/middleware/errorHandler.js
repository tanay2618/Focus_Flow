import { AppError } from '../utils/AppError.js';
import { config } from '../config.js';

export function notFound(req, _res, next) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let errors;

  if (err instanceof AppError) {
    ({ status, message, errors } = err);
  } else if (err.type === 'entity.parse.failed') {
    status = 400; message = 'Request body is not valid JSON.';
  } else if (err.type === 'entity.too.large') {
    status = 413; message = 'Request body is too large.';
  } else if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    // Race between two sign-ups with the same email.
    status = 409; message = 'An account with this email already exists.'; errors = { email: message };
  }

  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err);

  const body = { success: false, message };
  if (errors) body.errors = errors;
  if (status >= 500 && !config.isProd) body.stack = err.stack;
  res.status(status).json(body);
}
