const { z } = require('zod');
const LegalDoc = require('../../models/admin/LegalDoc');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');

const slugSchema = z.object({ slug: z.string().min(2).max(60) });

const createSchema = z.object({
  slug: z.string().min(2).max(60),
  title: z.string().min(2).max(120),
  bodyMd: z.string().min(1),
  effectiveAt: z.coerce.date().optional(),
  isPublished: z.boolean().optional(),
});

const updateSchema = createSchema.partial().omit({ slug: true });

async function list(req, res, next) {
  try {
    const items = await LegalDoc.find().sort({ slug: 1 }).lean();
    return ApiResponse.ok(res, items);
  } catch (err) { next(err); }
}

async function getBySlug(req, res, next) {
  try {
    const { slug } = slugSchema.parse(req.params);
    const doc = await LegalDoc.findOne({ slug }).lean();
    if (!doc) throw ApiError.notFound('Legal document not found');
    return ApiResponse.ok(res, doc);
  } catch (err) { next(err); }
}

async function versions(req, res, next) {
  try {
    const { slug } = slugSchema.parse(req.params);
    const doc = await LegalDoc.findOne({ slug }).lean();
    if (!doc) throw ApiError.notFound('Legal document not found');
    return ApiResponse.ok(res, { slug, version: doc.version, updatedAt: doc.updatedAt });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const existing = await LegalDoc.findOne({ slug: data.slug }).lean();
    if (existing) throw ApiError.conflict('Legal document with this slug exists', 'SLUG_EXISTS');
    const doc = await LegalDoc.create(data);
    return ApiResponse.created(res, doc, 'Legal document created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { slug } = slugSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const doc = await LegalDoc.findOneAndUpdate({ slug }, { $set: patch }, { new: true }).lean();
    if (!doc) throw ApiError.notFound('Legal document not found');
    return ApiResponse.ok(res, doc, 'Legal document updated');
  } catch (err) { next(err); }
}

async function publish(req, res, next) {
  try {
    const { slug } = slugSchema.parse(req.params);
    const doc = await LegalDoc.findOne({ slug });
    if (!doc) throw ApiError.notFound('Legal document not found');
    doc.isPublished = true;
    doc.publishedAt = new Date();
    doc.version = (doc.version || 0) + 1;
    doc.effectiveAt = doc.effectiveAt || new Date();
    await doc.save();
    return ApiResponse.ok(res, doc.toObject(), 'Legal document published');
  } catch (err) { next(err); }
}

module.exports = { list, getBySlug, versions, create, update, publish };