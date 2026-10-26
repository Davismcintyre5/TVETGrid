const { z } = require('zod');
const Settings = require('../../models/admin/Settings');
const { getSettings, invalidateSettingsCache } = require('../../utils/getSettings');
const ApiResponse = require('../../utils/ApiResponse');

const updateSchema = z.object({
  appName: z.string().min(1).max(80).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  contactAddress: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    tiktok: z.string().optional(),
    youtube: z.string().optional(),
  }).optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  featureFlags: z.record(z.any()).optional(),
});

async function get(req, res, next) {
  try {
    const settings = await getSettings({ fresh: true });
    return ApiResponse.ok(res, settings);
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const patch = updateSchema.parse(req.body);
    const settings = await Settings.findOneAndUpdate(
      { singleton: 'main' },
      { $set: patch, $setOnInsert: { singleton: 'main' } },
      { new: true, upsert: true }
    ).lean();
    await invalidateSettingsCache();
    return ApiResponse.ok(res, settings, 'Settings updated');
  } catch (err) { next(err); }
}

module.exports = { get, update };