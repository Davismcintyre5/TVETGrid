const crypto = require('crypto');
const Admin = require('../../models/admin/Admin');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { signAccess, signRefresh, verifyRefresh } = require('../../utils/tokens');
const password = require('../../utils/password');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueTokens(admin) {
  const accessToken = signAccess({
    sub: String(admin._id),
    type: 'admin',
    role: admin.role,
  });
  const jti = crypto.randomUUID();
  const refreshToken = signRefresh({ sub: String(admin._id), type: 'admin' }, jti);
  return { accessToken, refreshToken };
}

const login = asyncHandler(async (req, res) => {
  const { email, password: plain } = req.body || {};
  if (!email || !plain) {
    throw ApiError.badRequest('Email and password are required', 'VALIDATION_001');
  }

  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() })
    .select('+passwordHash');

  if (!admin) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  if (!admin.isActive) throw ApiError.forbidden('Account disabled', 'ACCOUNT_DISABLED');

  const matches = await password.compare(plain, admin.passwordHash);
  if (!matches) throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const { accessToken, refreshToken } = issueTokens(admin);

  admin.lastLoginAt = new Date();
  admin.refreshTokenHash = hashToken(refreshToken);
  await admin.save();

  const safe = admin.toSafeJSON();

  emailService
    .sendNewLogin({
      to: admin.email,
      name: admin.name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      at: new Date().toISOString(),
    })
    .catch((e) => logger.warn('authController: newLogin email failed', { err: e.message }));

  return ok(res, { accessToken, refreshToken, user: safe }, 'Login successful');
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw ApiError.badRequest('refreshToken required', 'VALIDATION_001');

  let payload;
  try {
    payload = verifyRefresh(refreshToken);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Refresh token expired', 'TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
  }

  if (payload.type !== 'admin' || !payload.sub) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
  }

  const admin = await Admin.findById(payload.sub).select('+refreshTokenHash');
  if (!admin) throw ApiError.unauthorized('Admin not found', 'INVALID_TOKEN');
  if (!admin.isActive) throw ApiError.forbidden('Account disabled', 'ACCOUNT_DISABLED');

  if (!admin.refreshTokenHash || admin.refreshTokenHash !== hashToken(refreshToken)) {
    throw ApiError.unauthorized('Refresh token no longer valid', 'INVALID_TOKEN');
  }

  const accessToken = signAccess({
    sub: String(admin._id),
    type: 'admin',
    role: admin.role,
  });

  return ok(res, { accessToken }, 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  await Admin.updateOne({ _id: req.user.id }, { $set: { refreshTokenHash: null } });
  return ok(res, { success: true }, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user.id).lean();
  if (!admin) throw ApiError.unauthorized('Admin not found');

  delete admin.passwordHash;
  delete admin.refreshTokenHash;

  return ok(res, admin);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Both passwords are required', 'VALIDATION_001');
  }
  if (String(newPassword).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters', 'VALIDATION_001');
  }

  const admin = await Admin.findById(req.user.id).select('+passwordHash');
  if (!admin) throw ApiError.unauthorized('Admin not found');

  const matches = await password.compare(currentPassword, admin.passwordHash);
  if (!matches) throw ApiError.unauthorized('Current password is incorrect', 'INVALID_PASSWORD');

  admin.passwordHash = await password.hash(newPassword);
  admin.passwordChangedAt = new Date();
  admin.refreshTokenHash = null;
  await admin.save();

  emailService
    .sendPasswordChanged({
      to: admin.email,
      name: admin.name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      changedAt: new Date().toISOString(),
    })
    .catch((e) => logger.warn('authController: passwordChanged email failed', { err: e.message }));

  return ok(res, { success: true }, 'Password updated');
});

module.exports = { login, refresh, logout, me, changePassword };