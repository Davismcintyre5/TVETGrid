const Settings = require('../../models/admin/Settings');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getSettings, invalidateSettingsCache } = require('../../utils/getSettings');

const get = asyncHandler(async (req, res) => {
  const s = await getSettings({ fresh: req.query.fresh === 'true' });
  return ok(res, s);
});

const update = asyncHandler(async (req, res) => {
  const allowed = ['appName', 'logoUrl', 'supportEmail', 'supportPhone', 'contactAddress', 'socialLinks', 'faq', 'featureFlags'];
  const patch = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) patch[key] = req.body[key];
  }

  const doc = await Settings.findOneAndUpdate(
    { singleton: 'main' },
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  await invalidateSettingsCache();

  return ok(res, doc, 'Settings saved');
});

module.exports = { get, update };