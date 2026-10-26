const ApiError = require('../../utils/ApiError');
const { verifyAccess } = require('../../utils/tokens');
const { ROLES } = require('../../utils/constants');
const User = require('../../models/client/User');
const Admin = require('../../models/admin/Admin');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(ApiError.unauthorized('Missing bearer token'));

    const payload = verifyAccess(token);
    if (!payload?.sub) return next(ApiError.unauthorized('Invalid token payload'));

    const user = await User.findById(payload.sub).select('_id role name email isActive').lean();
    if (!user) return next(ApiError.unauthorized('User not found'));
    if (!user.isActive) return next(ApiError.forbidden('Account disabled'));
    if (user.role !== ROLES.ADMIN) return next(ApiError.forbidden('Admin access required'));

    const admin = await Admin.findOne({ userId: user._id }).select('permissions').lean();

    req.user = { id: String(user._id), role: user.role, name: user.name, email: user.email };
    req.admin = { permissions: admin?.permissions || ['*'] };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired', 'TOKEN_EXPIRED'));
    if (err.name === 'JsonWebTokenError') return next(ApiError.unauthorized('Invalid token'));
    next(err);
  }
};