const Settings = require('../../models/admin/Settings');
const LegalDoc = require('../../models/admin/LegalDoc');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { getSettings } = require('../../utils/getSettings');

const getPublicSettings = asyncHandler(async (req, res) => {
  const s = await getSettings();

  return ok(res, {
    appName: s.appName,
    logoUrl: s.logoUrl,
    supportEmail: s.supportEmail,
    supportPhone: s.supportPhone,
    contactAddress: s.contactAddress,
    socialLinks: s.socialLinks || {},
    faq: Array.isArray(s.faq) ? s.faq : [],
  });
});

const listLegal = asyncHandler(async (req, res) => {
  const items = await LegalDoc.find({ isPublished: true })
    .select('slug title version effectiveAt updatedAt')
    .sort({ title: 1 })
    .lean();
  return ok(res, items);
});

const getLegal = asyncHandler(async (req, res) => {
  const doc = await LegalDoc.findOne({ slug: req.params.slug, isPublished: true }).lean();
  if (!doc) throw ApiError.notFound('Legal doc not found');
  return ok(res, {
    slug: doc.slug,
    title: doc.title,
    bodyMd: doc.bodyMd,
    version: doc.version,
    effectiveAt: doc.effectiveAt,
    updatedAt: doc.updatedAt,
  });
});

module.exports = { getPublicSettings, listLegal, getLegal };