const { z } = require('zod');
const crypto = require('crypto');
const User = require('../../models/client/User');
const Admin = require('../../models/admin/Admin');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const password = require('../../utils/password');
const tokens = require('../../utils/tokens');
const { getClient } = require('../../config/redis');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const emailService = require('../../services/emailService');
const { ROLES } = require('../../utils/constants');

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

function signTokens(user) {
  const payload = { sub: String(user._id), role: user.role };
  const jti = crypto.randomUUID();
  return {
    accessToken: tokens.signAccess(payload),
    refreshToken: tokens.signRefresh(payload, jti),
    jti,
  };
}

async function login(req, res, next) {
  try {
    const { email, password: plain } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
    if (!user.isActive) throw ApiError.forbidden('Account disabled', 'ACCOUNT_DISABLED');
    if (user.role !== ROLES.ADMIN) throw ApiError.forbidden('Admin access required', 'NOT_ADMIN');

    const ok = await password.compare(plain, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

    user.lastLoginAt = new Date();
    await user.save();

    const { accessToken, refreshToken, jti } = signTokens(user);

    const redis = env.redis.enabled ? getClient() : null;
    if (redis) await redis.set(`auth:refresh:${user._id}:${jti}`, '1', 'EX', 7 * 24 * 3600);

    const adminMeta = await Admin.findOne({ userId: user._id }).select('permissions').lean();

    return ApiResponse.ok(res, {
      accessToken,
      refreshToken,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        permissions: adminMeta?.permissions || ['*'],
      },
    }, 'Logged in');
  } catch (err) { next(err); }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    let payload;
    try { payload = tokens.verifyRefresh(refreshToken); }
    catch { throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH'); }

    if (!payload.sub || !payload.jti) throw ApiError.unauthorized('Invalid refresh payload', 'INVALID_REFRESH');
    if (payload.role !== ROLES.ADMIN) throw ApiError.forbidden('Admin access required', 'NOT_ADMIN');

    const redis = env.redis.enabled ? getClient() : null;
    if (redis) {
      const key = `auth:refresh:${payload.sub}:${payload.jti}`;
      const exists = await redis.get(key);
      if (!exists) throw ApiError.unauthorized('Refresh token revoked', 'REFRESH_REVOKED');
      await redis.del(key);
    }

    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) throw ApiError.unauthorized('User inactive', 'USER_INACTIVE');
    if (user.role !== ROLES.ADMIN) throw ApiError.forbidden('Admin access required', 'NOT_ADMIN');

    const next_ = signTokens(user);
    if (redis) await redis.set(`auth:refresh:${user._id}:${next_.jti}`, '1', 'EX', 7 * 24 * 3600);

    return ApiResponse.ok(res, {
      accessToken: next_.accessToken,
      refreshToken: next_.refreshToken,
    }, 'Refreshed');
  } catch (err) { next(err); }
}

async function logout(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      try {
        const payload = tokens.verifyAccess(token);
        const redis = env.redis.enabled ? getClient() : null;
        if (redis && payload.sub) {
          const keys = await redis.keys(`auth:refresh:${payload.sub}:*`);
          if (keys.length) await redis.del(...keys);
        }
      } catch { /* ignore expired token on logout */ }
    }
    return ApiResponse.ok(res, null, 'Logged out');
  } catch (err) { next(err); }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash').lean();
    if (!user) throw ApiError.notFound('User not found');
    const adminMeta = await Admin.findOne({ userId: user._id }).select('permissions').lean();
    return ApiResponse.ok(res, {
      id: String(user._id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatar: user.avatar,
      permissions: adminMeta?.permissions || ['*'],
      lastLoginAt: user.lastLoginAt,
    });
  } catch (err) { next(err); }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user.id).select('+passwordHash');
    if (!user) throw ApiError.notFound('User not found');

    const ok = await password.compare(currentPassword, user.passwordHash);
    if (!ok) throw ApiError.badRequest('Current password is incorrect', 'INVALID_CURRENT');

    user.passwordHash = await password.hash(newPassword);
    await user.save();

    const redis = env.redis.enabled ? getClient() : null;
    if (redis) {
      const keys = await redis.keys(`auth:refresh:${user._id}:*`);
      if (keys.length) await redis.del(...keys);
    }

    emailService.sendPasswordChanged({
      to: user.email,
      name: user.name,
      changedAt: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    }).catch((e) => logger.warn('admin changePassword: email failed', { err: e.message }));

    return ApiResponse.ok(res, null, 'Password changed');
  } catch (err) { next(err); }
}

module.exports = { login, refresh, logout, me, changePassword };