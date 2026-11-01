const ApiError = require('../../utils/ApiError');
const { verifyAccess } = require('../../utils/tokens');
const User = require('../../models/client/User');

module.exports = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(ApiError.unauthorized('Missing bearer token'));

    const payload = verifyAccess(token);
    if (!payload?.sub) return next(ApiError.unauthorized('Invalid token payload'));
    if (payload.type !== 'user') {
      return next(ApiError.forbidden('User token required', 'FORBIDDEN'));
    }

    const user = await User.findById(payload.sub)
      .select('_id role name email isActive emailVerified')
      .lean();

    if (!user) return next(ApiError.unauthorized('User not found'));
    if (!user.isActive) return next(ApiError.forbidden('Account disabled'));

    req.user = {
      id: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
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