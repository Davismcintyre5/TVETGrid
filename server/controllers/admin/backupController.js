const Backup = require('../../models/admin/Backup');
const BackupSettings = require('../../models/admin/BackupSettings');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const backupService = require('../../services/backupService');
const emailService = require('../../services/emailService');
const logger = require('../../utils/logger');

async function findBackupOr404(id) {
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const b = await Backup.findById(id).lean();
  if (!b) throw ApiError.notFound('Backup not found');
  return b;
}

const getSettings = asyncHandler(async (req, res) => {
  const s = await BackupSettings.findOne({ singleton: 'main' }).lean();
  return ok(res, s || {});
});

const updateSettings = asyncHandler(async (req, res) => {
  const allowed = ['autoEnabled', 'frequency', 'hourUtc', 'dayOfWeek', 'dayOfMonth', 'emailOnCompletion', 'notifyEmails', 'retentionDays'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const s = await BackupSettings.findOneAndUpdate(
    { singleton: 'main' },
    { $set: patch },
    { new: true, upsert: true }
  ).lean();

  return ok(res, s, 'Backup settings saved');
});

const create = asyncHandler(async (req, res) => {
  const record = await backupService.runBackup({
    type: 'manual',
    createdBy: req.user.id,
  });
  return created(res, record, 'Backup created');
});

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const { items, total } = await backupService.list({ skip, limit });
  return ok(res, items, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const b = await findBackupOr404(req.params.id);
  return ok(res, b);
});

const download = asyncHandler(async (req, res) => {
  await findBackupOr404(req.params.id);
  const result = await backupService.download({ id: req.params.id });
  return ok(res, result);
});

const email = asyncHandler(async (req, res) => {
  await findBackupOr404(req.params.id);
  const { emails, note } = req.body || {};
  if (!Array.isArray(emails) || !emails.length) {
    throw ApiError.badRequest('emails array required', 'VALIDATION_001');
  }

  const dl = await backupService.download({ id: req.params.id, ttlSeconds: 600 });

  const results = await Promise.all(
    emails.map((to) =>
      emailService
        .sendBackupSent({
          to,
          fileName: dl.fileName,
          size: dl.size,
          downloadUrl: dl.url,
          note,
        })
        .catch((e) => {
          logger.warn('backupController: email failed', { to, err: e.message });
          return { success: false, error: e.message };
        })
    )
  );

  await backupService.markEmailed({ id: req.params.id, emails });

  return ok(res, { sent: results.filter((r) => r.success).length, results });
});

const restore = asyncHandler(async (req, res) => {
  const b = await findBackupOr404(req.params.id);
  if (!b.publicId) throw ApiError.badRequest('Backup has no publicId', 'VALIDATION_001');

  const result = await backupService.restore({ publicId: b.publicId });
  return ok(res, { restored: result.restored, errors: result.errors }, 'Restore complete');
});

const remove = asyncHandler(async (req, res) => {
  await findBackupOr404(req.params.id);
  const result = await backupService.remove({ id: req.params.id });
  return ok(res, result, 'Backup deleted');
});

module.exports = { getSettings, updateSettings, create, list, getOne, download, email, restore, remove };