const logger = require('../../utils/logger');
const env = require('../../config/env');

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR');
  const message = err.isOperational || statusCode < 500
    ? err.message
    : 'Internal server error';

  if (statusCode >= 500) {
    logger.error(err.message, {
      requestId: req.id,
      stack: err.stack,
      path: req.originalUrl,
    });
  } else {
    logger.warn(err.message, { requestId: req.id, code, path: req.originalUrl });
  }

  const body = { success: false, error: message, code };
  if (err.details) body.details = err.details;
  if (!env.isProd && statusCode >= 500) body.stack = err.stack;

  res.status(statusCode).json(body);
};