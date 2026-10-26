const { z } = require('zod');
const User = require('../../models/client/User');
const Admin = require('../../models/admin/Admin');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const paginate = require('../../utils/paginate');
const emailService = require('../../services/emailService');
const { ROLES } = require('../../utils/constants');

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  role: z.enum(Object.values(ROLES)).optional(),
  q: z.string().optional(),
});

const idSchema = z.object({ id: z.string().regex(/^[0-9a-f]{24}$/i) });

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
});

const roleSchema = z.object({ role: z.enum(Object.values(ROLES)) });

const disableSchema = z.object({ reason: z.string().max(300).optional() });

async function list(req, res, next) {
  try {
    const q = listQuerySchema.parse(req.query);
    const { page, limit, skip } = paginate.build(q);
    const filter = {};
    if (q.role) filter.role = q.role;
    if (q.q) {
      filter.$or = [
        { name: { $regex: q.q, $options: 'i' } },
        { email: { $regex: q.q, $options: 'i' } },
      ];
    }
    const [items, total] = await Promise.all([
      User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      User.countDocuments(filter),
    ]);
    return ApiResponse.ok(res, items, 'OK', paginate.meta({ page, limit, total }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) throw ApiError.notFound('User not found');
    const admin = user.role === ROLES.ADMIN ? await Admin.findOne({ userId: user._id }).lean() : null;
    return ApiResponse.ok(res, { ...user, adminMeta: admin });
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(id, { $set: patch }, { new: true }).select('-passwordHash').lean();
    if (!user) throw ApiError.notFound('User not found');
    return ApiResponse.ok(res, user, 'User updated');
  } catch (err) { next(err); }
}

async function changeRole(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const { role } = roleSchema.parse(req.body);
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user._id.equals(req.user.id) && role !== ROLES.ADMIN) {
      throw ApiError.badRequest('Cannot demote yourself', 'SELF_DEMOTE');
    }
    const oldRole = user.role;
    user.role = role;
    await user.save();

    if (role === ROLES.ADMIN) {
      await Admin.updateOne({ userId: user._id }, { $setOnInsert: { permissions: ['*'] } }, { upsert: true });
    } else {
      await Admin.deleteOne({ userId: user._id });
    }

    emailService.sendRoleChanged({ to: user.email, name: user.name, oldRole, newRole: role })
      .catch(() => {});

    return ApiResponse.ok(res, { id: user._id, role }, 'Role updated');
  } catch (err) { next(err); }
}

async function disable(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const { reason } = disableSchema.parse(req.body || {});
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (user._id.equals(req.user.id)) throw ApiError.badRequest('Cannot disable yourself', 'SELF_DISABLE');
    user.isActive = false;
    await user.save();
    emailService.sendAccountDisabled({ to: user.email, name: user.name, reason }).catch(() => {});
    return ApiResponse.ok(res, { id: user._id, isActive: false }, 'User disabled');
  } catch (err) { next(err); }
}

async function enable(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const user = await User.findByIdAndUpdate(id, { $set: { isActive: true } }, { new: true }).select('-passwordHash').lean();
    if (!user) throw ApiError.notFound('User not found');
    return ApiResponse.ok(res, user, 'User enabled');
  } catch (err) { next(err); }
}

module.exports = { list, getById, update, changeRole, disable, enable };