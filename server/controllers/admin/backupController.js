const { z } = require('zod');
const backupService = require('../../services/backupService');
const Backup = require('../../models/admin/Backup');
const BackupSettings = require('../../models/admin/BackupSettings');
const emailService = require('../../services/emailService');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');

const oid = z.string().regex(/^[0-9a-f]{24}$/i);
const idSchema = z.object({ id: oid });

const settingsSchema = z.object({
  autoEnabled: z.boolean().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  hourUtc: z.coerce.number().int().min(0).max(23).optional(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional(),
  emailOnCompletion: z.boolean().optional(),
  notifyEmails: z.array(z.string().email()).optional(),
  retentionDays: z.coerce.number().int().min(1).max(365).optional(),
});

const emailSchema = z.object({
  emails: z.array(z.string().email()).min(1),
  note: z.string().max(500).optional(),
});

async function createNow(req, res, next) {
  try {
    const backup = await backupService.runBackup({ type: 'manual', createdBy: req.user.id });
    return ApiResponse.created(res, backup, 'Backup created');
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { items, total } = await backupService.list({ limit, skip: (page - 1) * limit });
    return ApiResponse.ok(res, items, 'OK', { page, limit, total, pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const b = await backupService.getById(id);
    if (!b) throw ApiError.notFound('Backup not found');
    return ApiResponse.ok(res, b);
  } catch (err) { next(err); }
}

async function download(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const result = await backupService.download({ id });
    return ApiResponse.ok(res, result, 'Download link');
  } catch (err) { next(err); }
}

async function emailTo(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const { emails, note } = emailSchema.parse(req.body);
    const b = await Backup.findById(id).lean();
    if (!b) throw ApiError.notFound('Backup not found');
    const { url } = await backupService.download({ id });
    for (const to of emails) {
      await emailService.sendBackupSent({
        to, fileName: b.fileName, size: b.size, downloadUrl: url, note,
        unsubscribeUrl: null,
      }).catch(() => {});
    }
    await backupService.markEmailed({ id, emails });
    return ApiResponse.ok(res, { sent: emails.length }, 'Backup emailed');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const result = await backupService.remove({ id });
    if (!result.success) throw ApiError.notFound('Backup not found');
    return ApiResponse.ok(res, { id }, 'Backup deleted');
  } catch (err) { next(err); }
}

async function restore(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const b = await Backup.findById(id).lean();
    if (!b || !b.publicId) throw ApiError.notFound('Backup not found');
    const stats = await backupService.restore({ publicId: b.publicId });
    emailService.sendRestoreCompleted({
      to: req.user.email, backupFileName: b.fileName, restoreStatus: 'success',
    }).catch(() => {});
    return ApiResponse.ok(res, stats, 'Restore complete');
  } catch (err) { next(err); }
}

async function getSettings(req, res, next) {
  try {
    const settings = await BackupSettings.findOne({ singleton: 'main' }).lean();
    return ApiResponse.ok(res, settings || { singleton: 'main' });
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const patch = settingsSchema.parse(req.body);
    const settings = await BackupSettings.findOneAndUpdate(
      { singleton: 'main' },
      { $set: patch, $setOnInsert: { singleton: 'main' } },
      { new: true, upsert: true }
    ).lean();
    return ApiResponse.ok(res, settings, 'Backup settings updated');
  } catch (err) { next(err); }
}

module.exports = { createNow, list, getById, download, emailTo, remove, restore, getSettings, updateSettings };