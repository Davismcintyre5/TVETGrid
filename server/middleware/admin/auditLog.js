const crypto = require('crypto');
const AuditLog = require('../../models/admin/AuditLog');
const logger = require('../../utils/logger');

function hashBody(body) {
  try {
    return crypto.createHash('sha256').update(JSON.stringify(body || {})).digest('hex').slice(0, 32);
  } catch {
    return null;
  }
}

module.exports = (action) => (req, res, next) => {
  res.on('finish', () => {
    AuditLog.create({
      adminId: req.user?.id,
      action,
      method: req.method,
      path: req.originalUrl,
      bodyHash: hashBody(req.body),
      status: res.statusCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((err) => logger.error('AuditLog write failed', { err: err.message, action }));
  });
  next();
};