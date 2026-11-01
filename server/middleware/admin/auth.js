const ApiError = require('../../utils/ApiError');
const { verifyAccess } = require('../../utils/tokens');
const Admin = require('../../models/admin/Admin');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(ApiError.unauthorized('Missing bearer token'));

    const payload = verifyAccess(token);
    if (!payload?.sub) return next(ApiError.unauthorized('Invalid token payload'));
    if (payload.type !== 'admin') {
      return next(ApiError.forbidden('Admin token required', 'FORBIDDEN'));
    }

    const admin = await Admin.findById(payload.sub)
      .select('_id role name email isActive permissions')
      .lean();

    if (!admin) return next(ApiError.unauthorized('Admin not found'));
    if (!admin.isActive) return next(ApiError.forbidden('Account disabled'));

    req.user = {
      id: String(admin._id),
      role: admin.role,
      name: admin.name,
      email: admin.email,
      permissions: admin.permissions || ['*'],
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED'));
    }
    if (err.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(err);
  }
};