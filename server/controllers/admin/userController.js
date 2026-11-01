const User = require('../../models/client/User');
const Meeting = require('../../models/client/Meeting');
const MeetingInvite = require('../../models/client/MeetingInvite');
const Attempt = require('../../models/client/Attempt');
const Progress = require('../../models/client/Progress');
const Bookmark = require('../../models/client/Bookmark');
const AISession = require('../../models/client/AISession');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { ROLES } = require('../../utils/constants');
const emailService = require('../../services/emailService');
const smsService = require('../../services/smsService');
const logger = require('../../utils/logger');

async function findUserOr404(id) {
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid user id', 'VALIDATION_001');
  const user = await User.findById(id);
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = {};

  if (req.query.role && [ROLES.STUDENT, ROLES.TEACHER].includes(req.query.role)) {
    filter.role = req.query.role;
  }
  if (req.query.q && String(req.query.q).trim()) {
    const q = String(req.query.q).trim();
    filter.$or = [
      { name: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { phone: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  items.forEach((u) => {
    delete u.passwordHash;
    delete u.refreshTokenHash;
  });

  return ok(res, items, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const safe = user.toSafeJSON();
  return ok(res, safe);
});

const update = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const { name, phone } = req.body || {};

  if (typeof name === 'string') user.name = name.trim();
  if (typeof phone === 'string') user.phone = phone.trim() || null;

  await user.save();
  return ok(res, user.toSafeJSON(), 'User updated');
});

const changeRole = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  const { role } = req.body || {};

  if (![ROLES.STUDENT, ROLES.TEACHER].includes(role)) {
    throw ApiError.badRequest('Invalid role', 'VALIDATION_001');
  }
  if (String(user._id) === String(req.user.id)) {
    throw ApiError.forbidden('You cannot change your own role', 'SELF_DEMOTE');
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  emailService
    .sendRoleChanged({
      to: user.email,
      name: user.name,
      oldRole,
      newRole: role,
    })
    .catch((e) => logger.warn('userController: roleChanged email failed', { err: e.message }));

  if (user.phone) {
    smsService
      .sendAccountDisabled({ to: user.phone })
      .catch(() => {});
  }

  return ok(res, user.toSafeJSON(), `Role changed to ${role}`);
});

const disable = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  if (String(user._id) === String(req.user.id)) {
    throw ApiError.forbidden('You cannot disable yourself', 'SELF_DISABLE');
  }

  const reason = req.body?.reason ? String(req.body.reason).trim() : null;
  user.isActive = false;
  user.disabledReason = reason;
  user.disabledAt = new Date();
  user.refreshTokenHash = null;
  await user.save();

  emailService
    .sendAccountDisabled({ to: user.email, name: user.name, reason })
    .catch((e) => logger.warn('userController: accountDisabled email failed', { err: e.message }));

  if (user.phone) {
    smsService.sendAccountDisabled({ to: user.phone }).catch(() => {});
  }

  return ok(res, user.toSafeJSON(), 'User disabled');
});

const enable = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  user.isActive = true;
  user.disabledReason = null;
  user.disabledAt = null;
  await user.save();
  return ok(res, user.toSafeJSON(), 'User enabled');
});

const remove = asyncHandler(async (req, res) => {
  const user = await findUserOr404(req.params.id);
  if (String(user._id) === String(req.user.id)) {
    throw ApiError.forbidden('You cannot delete yourself', 'SELF_DELETE');
  }

  const userId = user._id;

  const [attempts, progress, bookmarks, aiSessions, invites] = await Promise.all([
    Attempt.deleteMany({ userId }),
    Progress.deleteMany({ userId }),
    Bookmark.deleteMany({ userId }),
    AISession.deleteMany({ userId }),
    MeetingInvite.deleteMany({ userId }),
  ]);

  let hostedMeetings = { deletedCount: 0 };
  if (user.role === ROLES.TEACHER) {
    const meetings = await Meeting.find({ hostId: userId }).select('_id').lean();
    if (meetings.length) {
      const ids = meetings.map((m) => m._id);
      await MeetingInvite.deleteMany({ meetingId: { $in: ids } });
      hostedMeetings = await Meeting.deleteMany({ _id: { $in: ids } });
    }
  }

  await User.deleteOne({ _id: userId });

  return ok(
    res,
    {
      deleted: {
        attempts: attempts.deletedCount,
        progress: progress.deletedCount,
        bookmarks: bookmarks.deletedCount,
        aiSessions: aiSessions.deletedCount,
        invites: invites.deletedCount,
        hostedMeetings: hostedMeetings.deletedCount,
      },
    },
    'User permanently deleted'
  );
});

module.exports = { list, getOne, update, changeRole, disable, enable, remove };