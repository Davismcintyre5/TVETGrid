const ApiError = require('../../utils/ApiError');
const { ROLES } = require('../../utils/constants');

module.exports = (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized());
  if (req.user.role !== ROLES.ADMIN) return next(ApiError.forbidden('Admin access required'));
  next();
};