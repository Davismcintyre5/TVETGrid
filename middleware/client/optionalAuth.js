const { verifyAccess } = require('../../utils/tokens');
const User = require('../../models/client/User');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(); // no token → guest
  }

  try {
    const payload = verifyAccess(token);
    if (payload?.type === 'user' && payload?.sub) {
      const user = await User.findById(payload.sub)
        .select('_id name email avatarUrl role isActive')
        .lean();
      if (user && user.isActive) {
        req.user = {
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        };
      }
    }
  } catch {
    // invalid/expired token → treat as guest
  }

  next();
};