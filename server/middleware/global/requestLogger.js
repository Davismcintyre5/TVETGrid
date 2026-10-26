const logger = require('../../utils/logger');

module.exports = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`, {
      requestId: req.id,
      userId: req.user?.id,
      ip: req.ip,
    });
  });
  next();
};