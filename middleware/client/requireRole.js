const ApiError = require('../../utils/ApiError');

module.exports = (...allowed) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (!allowed.includes(req.user.role)) return next(ApiError.forbidden(`Requires role: ${allowed.join('|')}`));
  next();
};