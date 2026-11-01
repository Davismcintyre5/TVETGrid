const User = require('../../models/client/User');
const Bookmark = require('../../models/client/Bookmark');
const Attempt = require('../../models/client/Attempt');
const Progress = require('../../models/client/Progress');
const AISession = require('../../models/client/AISession');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const uploadService = require('../../services/uploadService');
const logger = require('../../utils/logger');

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  if (!user) throw ApiError.unauthorized('User not found');

  delete user.passwordHash;
  delete user.refreshTokenHash;
  delete user.verificationToken;
  delete user.verificationExpires;
  delete user.avatarPublicId;

  const [bookmarks, attempts, progress, aiSessions] = await Promise.all([
    Bookmark.countDocuments({ userId: req.user.id }),
    Attempt.countDocuments({ userId: req.user.id }),
    Progress.countDocuments({ userId: req.user.id }),
    AISession.countDocuments({ userId: req.user.id }),
  ]);

  return ok(res, {
    user,
    counts: { bookmarks, attempts, progress, aiSessions },
  });
});

const update = asyncHandler(async (req, res) => {
  const { name, phone } = req.body || {};
  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized('User not found');

  if (typeof name === 'string' && name.trim()) user.name = name.trim();
  if (typeof phone === 'string') user.phone = phone.trim() || null;

  await user.save();
  return ok(res, user.toSafeJSON(), 'Profile updated');
});

// ─── Avatar: sign upload ─────────────────────────────
const signAvatarUpload = asyncHandler(async (req, res) => {
  const sig = await uploadService.sign({
    folder: 'tvetgrid/avatars',
    resourceType: 'image',
  });
  return ok(res, sig, 'Signature ready');
});

// ─── Avatar: confirm upload & save ───────────────────
const confirmAvatarUpload = asyncHandler(async (req, res) => {
  const { publicId, resourceType = 'image' } = req.body || {};
  if (!publicId) throw ApiError.badRequest('publicId required', 'VALIDATION_001');

  // Verify asset exists on Cloudinary
  const asset = await uploadService.confirm({ publicId, resourceType });

  const user = await User.findById(req.user.id).select('+avatarPublicId');
  if (!user) throw ApiError.unauthorized('User not found');

  // Delete previous avatar asset if any
  if (user.avatarPublicId && user.avatarPublicId !== publicId) {
    await uploadService
      .remove({ publicId: user.avatarPublicId, resourceType: 'image' })
      .catch((err) =>
        logger.warn('profileController: old avatar delete failed', { err: err.message })
      );
  }

  user.avatarUrl = asset.url;
  user.avatarPublicId = publicId;
  await user.save();

  return ok(
    res,
    { avatarUrl: user.avatarUrl },
    'Avatar updated'
  );
});

// ─── Avatar: remove ──────────────────────────────────
const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+avatarPublicId');
  if (!user) throw ApiError.unauthorized('User not found');

  if (user.avatarPublicId) {
    await uploadService
      .remove({ publicId: user.avatarPublicId, resourceType: 'image' })
      .catch((err) =>
        logger.warn('profileController: avatar delete failed', { err: err.message })
      );
  }

  user.avatarUrl = null;
  user.avatarPublicId = null;
  await user.save();

  return ok(res, { avatarUrl: null }, 'Avatar removed');
});

module.exports = {
  me,
  update,
  signAvatarUpload,
  confirmAvatarUpload,
  removeAvatar,
};