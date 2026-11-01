const LegalDoc = require('../../models/admin/LegalDoc');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const items = await LegalDoc.find().sort({ slug: 1 }).lean();
  return ok(res, items);
});

const getOne = asyncHandler(async (req, res) => {
  const doc = await LegalDoc.findOne({ slug: req.params.slug }).lean();
  if (!doc) throw ApiError.notFound('Legal doc not found');
  return ok(res, doc);
});

const getVersions = asyncHandler(async (req, res) => {
  const doc = await LegalDoc.findOne({ slug: req.params.slug }).select('slug title versions').lean();
  if (!doc) throw ApiError.notFound('Legal doc not found');
  return ok(res, doc);
});

const create = asyncHandler(async (req, res) => {
  const { slug, title, bodyMd, isPublished, effectiveAt } = req.body || {};
  if (!slug || !title) throw ApiError.badRequest('slug and title required', 'VALIDATION_001');

  const existing = await LegalDoc.findOne({ slug: String(slug).toLowerCase() }).lean();
  if (existing) throw ApiError.conflict('A doc with this slug already exists', 'CONFLICT');

  const doc = await LegalDoc.create({
    slug: String(slug).toLowerCase(),
    title,
    bodyMd: bodyMd || '',
    isPublished: !!isPublished,
    effectiveAt: effectiveAt || null,
    version: 1,
    createdBy: req.user.id,
  });

  return created(res, doc.toObject(), 'Legal doc created');
});

const update = asyncHandler(async (req, res) => {
  const doc = await LegalDoc.findOne({ slug: req.params.slug });
  if (!doc) throw ApiError.notFound('Legal doc not found');

  const { title, bodyMd, effectiveAt, isPublished } = req.body || {};
  if (typeof title === 'string') doc.title = title;
  if (typeof bodyMd === 'string') doc.bodyMd = bodyMd;
  if (effectiveAt !== undefined) doc.effectiveAt = effectiveAt || null;
  if (typeof isPublished === 'boolean') doc.isPublished = isPublished;

  await doc.save();
  return ok(res, doc.toObject(), 'Legal doc updated');
});

const publish = asyncHandler(async (req, res) => {
  const doc = await LegalDoc.findOne({ slug: req.params.slug });
  if (!doc) throw ApiError.notFound('Legal doc not found');

  doc.versions.push({
    version: doc.version,
    bodyMd: doc.bodyMd,
    effectiveAt: doc.effectiveAt,
    publishedAt: new Date(),
    publishedBy: req.user.id,
  });
  doc.version += 1;
  doc.isPublished = true;
  await doc.save();

  return ok(res, doc.toObject(), `Published (v${doc.version})`);
});

module.exports = { list, getOne, getVersions, create, update, publish };