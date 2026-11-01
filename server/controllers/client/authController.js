const crypto = require('crypto');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { signAccess, signRefresh, verifyRefresh } = require('../../utils/tokens');
const password = require('../../utils/password');
const { randomToken, randomNumericOtp } = require('../../utils/generateToken');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const logger = require('../../utils/logger');
const env = require('../../config/env');
const { ROLES } = require('../../utils/constants');

// SMS uses 6-digit code, stored in-memory (short-lived)
const SMS_CODE_TTL_MS = 10 * 60 * 1000;
const smsCodeStore = new Map();

// Email uses long token, stored in DB (24h)
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function issueTokens(user) {
  const accessToken = signAccess({
    sub: String(user._id),
    type: 'user',
    role: user.role,
  });
  const jti = crypto.randomUUID();
  const refreshToken = signRefresh({ sub: String(user._id), type: 'user' }, jti);
  return { accessToken, refreshToken };
}

function pruneSmsCodes() {
  const now = Date.now();
  for (const [key, val] of smsCodeStore.entries()) {
    if (val.expiresAt < now) smsCodeStore.delete(key);
  }
}

// ─── Register ────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password: plain, phone } = req.body || {};

  if (!name || !String(name).trim()) {
    throw ApiError.badRequest('Name required', 'VALIDATION_001');
  }
  if (!email || !String(email).trim()) {
    throw ApiError.badRequest('Email required', 'VALIDATION_001');
  }
  if (!plain || String(plain).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters', 'VALIDATION_001');
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: cleanEmail }).lean();
  if (existing) throw ApiError.conflict('Email already registered', 'CONFLICT');

  // 32-byte token = 64 hex chars — impossible to guess
  const verificationToken = randomToken(32);
  const verificationExpires = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);

  const passwordHash = await password.hash(plain);
  const user = await User.create({
    name: String(name).trim(),
    email: cleanEmail,
    phone: phone ? String(phone).trim() : null,
    passwordHash,
    role: ROLES.STUDENT,
    isActive: false,
    emailVerified: false,
    verificationToken,
    verificationExpires,
  });

  const verifyUrl = `${env.appUrl}/verify?token=${encodeURIComponent(verificationToken)}`;

  // Email → long token link. SMS → short 6-digit code.
  const smsCode = phone ? randomNumericOtp(6) : null;
  if (smsCode) {
    pruneSmsCodes();
    smsCodeStore.set(`verify:${cleanEmail}`, {
      code: smsCode,
      expiresAt: Date.now() + SMS_CODE_TTL_MS,
    });
  }

  Promise.allSettled([
    emailService.sendVerifyEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    }),
    smsCode
      ? smsService.sendVerifyEmail({
          to: user.phone,
          code: smsCode,
          expiresMin: 10,
        })
      : Promise.resolve(),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === 'rejected') {
        logger.warn('client authController: verify send failed', {
          err: r.reason?.message,
        });
      }
    });
  });

  return created(
    res,
    {
      email: cleanEmail,
      verificationSent: true,
      message: 'Check your email for the verification link',
    },
    'Registered — verify your email to activate your account'
  );
});

// ─── Verify by token (email link) ────────────────────
const verifyByToken = asyncHandler(async (req, res) => {
  const { token } = req.body || {};
  if (!token) throw ApiError.badRequest('Token required', 'VALIDATION_001');

  const user = await User.findOne({ verificationToken: String(token).trim() })
    .select('+verificationToken');

  if (!user) throw ApiError.badRequest('Invalid verification link', 'TOKEN_INVALID');
  if (user.verificationExpires && user.verificationExpires < new Date()) {
    throw ApiError.badRequest('Link expired — request a new one', 'TOKEN_EXPIRED');
  }

  if (!user.emailVerified) {
    user.emailVerified = true;
    user.isActive = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    // Also clear the SMS code (whichever channel they used)
    smsCodeStore.delete(`verify:${user.email}`);

    emailService
      .sendWelcome({
        to: user.email,
        name: user.name,
        loginUrl: `${env.appUrl}/login`,
      })
      .catch((e) =>
        logger.warn('client authController: welcome email failed', { err: e.message })
      );
  }

  return ok(
    res,
    { verified: true, email: user.email },
    'Account verified — you can now log in'
  );
});

// ─── Verify by code (SMS) ────────────────────────────
const verifyByCode = asyncHandler(async (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    throw ApiError.badRequest('Email and code required', 'VALIDATION_001');
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const key = `verify:${cleanEmail}`;
  const entry = smsCodeStore.get(key);

  if (!entry) throw ApiError.badRequest('No pending verification', 'OTP_NOT_FOUND');
  if (entry.expiresAt < Date.now()) {
    smsCodeStore.delete(key);
    throw ApiError.badRequest('Code expired', 'OTP_EXPIRED');
  }
  if (entry.code !== String(code).trim()) {
    throw ApiError.badRequest('Invalid code', 'OTP_INVALID');
  }

  smsCodeStore.delete(key);

  const user = await User.findOne({ email: cleanEmail });
  if (!user) throw ApiError.notFound('User not found');

  if (!user.emailVerified) {
    user.emailVerified = true;
    user.isActive = true;
    user.verificationToken = null;
    user.verificationExpires = null;
    await user.save();

    emailService
      .sendWelcome({
        to: user.email,
        name: user.name,
        loginUrl: `${env.appUrl}/login`,
      })
      .catch((e) =>
        logger.warn('client authController: welcome email failed', { err: e.message })
      );
  }

  return ok(
    res,
    { verified: true, email: user.email },
    'Account verified — you can now log in'
  );
});

// ─── Resend verification ─────────────────────────────
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw ApiError.badRequest('Email required', 'VALIDATION_001');

  const cleanEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail });
  if (!user) throw ApiError.notFound('User not found');
  if (user.emailVerified) throw ApiError.badRequest('Email already verified', 'ALREADY_VERIFIED');

  // New email token
  const verificationToken = randomToken(32);
  const verificationExpires = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
  user.verificationToken = verificationToken;
  user.verificationExpires = verificationExpires;
  await user.save();

  // New SMS code
  const smsCode = user.phone ? randomNumericOtp(6) : null;
  if (smsCode) {
    pruneSmsCodes();
    smsCodeStore.set(`verify:${cleanEmail}`, {
      code: smsCode,
      expiresAt: Date.now() + SMS_CODE_TTL_MS,
    });
  }

  Promise.allSettled([
    emailService.sendVerifyEmail({
      to: user.email,
      name: user.name,
      verifyUrl: `${env.appUrl}/verify?token=${encodeURIComponent(verificationToken)}`,
    }),
    smsCode
      ? smsService.sendVerifyEmail({
          to: user.phone,
          code: smsCode,
          expiresMin: 10,
        })
      : Promise.resolve(),
  ]).catch(() => {});

  return ok(res, { sent: true }, 'Verification email sent');
});

// ─── Login ───────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password: plain } = req.body || {};
  if (!email || !plain) {
    throw ApiError.badRequest('Email and password required', 'VALIDATION_001');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() })
    .select('+passwordHash');

  if (!user) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const matches = await password.compare(plain, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.emailVerified) {
    // Auto-resend a fresh verification link
    const verificationToken = randomToken(32);
    user.verificationToken = verificationToken;
    user.verificationExpires = new Date(Date.now() + EMAIL_TOKEN_TTL_MS);
    await user.save();

    emailService
      .sendVerifyEmail({
        to: user.email,
        name: user.name,
        verifyUrl: `${env.appUrl}/verify?token=${encodeURIComponent(verificationToken)}`,
      })
      .catch(() => {});

    throw ApiError.forbidden(
      'Please verify your email first. A new verification email has been sent.',
      'EMAIL_NOT_VERIFIED'
    );
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Account disabled', 'ACCOUNT_DISABLED');
  }

  const { accessToken, refreshToken } = issueTokens(user);

  user.lastLoginAt = new Date();
  user.refreshTokenHash = hashToken(refreshToken);
  await user.save();

  const safe = user.toSafeJSON();

  emailService
    .sendNewLogin({
      to: user.email,
      name: user.name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      at: new Date().toISOString(),
    })
    .catch((e) =>
      logger.warn('client authController: newLogin email failed', { err: e.message })
    );

  if (user.phone) {
    smsService.sendNewLogin({ to: user.phone, ip: req.ip }).catch(() => {});
  }

  return ok(res, { accessToken, refreshToken, user: safe }, 'Login successful');
});

// ─── Refresh ─────────────────────────────────────────
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

  if (payload.type !== 'user' || !payload.sub) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user) throw ApiError.unauthorized('User not found', 'INVALID_TOKEN');
  if (!user.isActive) throw ApiError.forbidden('Account disabled', 'ACCOUNT_DISABLED');

  if (!user.refreshTokenHash || user.refreshTokenHash !== hashToken(refreshToken)) {
    throw ApiError.unauthorized('Refresh token no longer valid', 'INVALID_TOKEN');
  }

  const accessToken = signAccess({
    sub: String(user._id),
    type: 'user',
    role: user.role,
  });

  return ok(res, { accessToken }, 'Token refreshed');
});

// ─── Logout ──────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $set: { refreshTokenHash: null } });
  return ok(res, { success: true }, 'Logged out');
});

// ─── Me ──────────────────────────────────────────────
const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) throw ApiError.unauthorized('User not found');
  delete user.passwordHash;
  delete user.refreshTokenHash;
  delete user.verificationToken;
  delete user.verificationExpires;
  return ok(res, user);
});

// ─── Change password ─────────────────────────────────
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Both passwords required', 'VALIDATION_001');
  }
  if (String(newPassword).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters', 'VALIDATION_001');
  }

  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('User not found');

  const matches = await password.compare(currentPassword, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized('Current password incorrect', 'INVALID_PASSWORD');
  }

  user.passwordHash = await password.hash(newPassword);
  user.passwordChangedAt = new Date();
  user.refreshTokenHash = null;
  await user.save();

  emailService
    .sendPasswordChanged({
      to: user.email,
      name: user.name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      changedAt: new Date().toISOString(),
    })
    .catch((e) =>
      logger.warn('client authController: passwordChanged email failed', {
        err: e.message,
      })
    );

  return ok(res, { success: true }, 'Password updated');
});

// ─── Forgot password ─────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (!email) throw ApiError.badRequest('Email required', 'VALIDATION_001');

  const cleanEmail = String(email).toLowerCase().trim();
  const user = await User.findOne({ email: cleanEmail }).lean();

  if (!user) {
    return ok(res, { sent: true }, 'If that email exists, a reset link was sent');
  }

  // Reuse the same pattern for password reset (kept simple for now)
  const resetCode = randomNumericOtp(6);
  pruneSmsCodes();
  smsCodeStore.set(`reset:${cleanEmail}`, {
    code: resetCode,
    expiresAt: Date.now() + SMS_CODE_TTL_MS,
  });

  const resetUrl = `${env.appUrl}/reset?email=${encodeURIComponent(cleanEmail)}&code=${resetCode}`;

  Promise.allSettled([
    emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl,
      expiresMin: 10,
    }),
    user.phone
      ? smsService.sendPasswordReset({
          to: user.phone,
          code: resetCode,
          expiresMin: 10,
        })
      : Promise.resolve(),
  ]).then((results) => {
    results.forEach((r) => {
      if (r.status === 'rejected') {
        logger.warn('client authController: reset send failed', {
          err: r.reason?.message,
        });
      }
    });
  });

  return ok(res, { sent: true }, 'If that email exists, a reset link was sent');
});

// ─── Reset password ──────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body || {};
  if (!email || !code || !newPassword) {
    throw ApiError.badRequest('Email, code, and new password required', 'VALIDATION_001');
  }
  if (String(newPassword).length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters', 'VALIDATION_001');
  }

  const cleanEmail = String(email).toLowerCase().trim();
  const key = `reset:${cleanEmail}`;
  const entry = smsCodeStore.get(key);

  if (!entry) throw ApiError.badRequest('No pending reset', 'OTP_NOT_FOUND');
  if (entry.expiresAt < Date.now()) {
    smsCodeStore.delete(key);
    throw ApiError.badRequest('Code expired', 'OTP_EXPIRED');
  }
  if (entry.code !== String(code).trim()) {
    throw ApiError.badRequest('Invalid code', 'OTP_INVALID');
  }

  smsCodeStore.delete(key);

  const user = await User.findOne({ email: cleanEmail });
  if (!user) throw ApiError.notFound('User not found');

  user.passwordHash = await password.hash(newPassword);
  user.passwordChangedAt = new Date();
  user.refreshTokenHash = null;
  await user.save();

  emailService
    .sendPasswordChanged({
      to: user.email,
      name: user.name,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      changedAt: new Date().toISOString(),
    })
    .catch(() => {});

  return ok(res, { success: true }, 'Password reset — please log in');
});

module.exports = {
  register,
  verifyByToken,
  verifyByCode,
  resendVerification,
  login,
  refresh,
  logout,
  me,
  changePassword,
  forgotPassword,
  resetPassword,
};