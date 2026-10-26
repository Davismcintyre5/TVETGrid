const { z } = require('zod');
const Note = require('../../models/admin/Note');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const paginate = require('../../utils/paginate');
const uploadService = require('../../services/uploadService');
const aiService = require('../../services/aiService');
const { VISIBILITY } = require('../../utils/constants');

const oid = z.string().regex(/^[0-9a-f]{24}$/i);
const idSchema = z.object({ id: oid });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  courseId: oid.optional(),
  topicId: oid.optional(),
  visibility: z.enum(Object.values(VISIBILITY)).optional(),
});

const createSchema = z.object({
  courseId: oid,
  topicId: oid.optional(),
  title: z.string().min(2).max(200),
  bodyMd: z.string().min(1).max(50000),
  attachments: z.array(z.object({ publicId: z.string().optional(), url: z.string().url(), name: z.string().optional() })).optional(),
  visibility: z.enum(Object.values(VISIBILITY)).optional(),
});

const updateSchema = createSchema.partial().omit({ courseId: true });

async function list(req, res, next) {
  try {
    const q = listQuerySchema.parse(req.query);
    const { page, limit, skip } = paginate.build(q);
    const filter = {};
    if (q.courseId) filter.courseId = q.courseId;
    if (q.topicId) filter.topicId = q.topicId;
    if (q.visibility) filter.visibility = q.visibility;
    const [items, total] = await Promise.all([
      Note.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Note.countDocuments(filter),
    ]);
    return ApiResponse.ok(res, items, 'OK', paginate.meta({ page, limit, total }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const note = await Note.findById(id).lean();
    if (!note) throw ApiError.notFound('Note not found');
    return ApiResponse.ok(res, note);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const note = await Note.create({ ...data, authorId: req.user.id });
    return ApiResponse.created(res, note, 'Note created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const note = await Note.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!note) throw ApiError.notFound('Note not found');
    return ApiResponse.ok(res, note, 'Note updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const note = await Note.findByIdAndDelete(id);
    if (!note) throw ApiError.notFound('Note not found');
    for (const a of note.attachments || []) {
      if (a.publicId) uploadService.remove({ publicId: a.publicId, resourceType: 'raw' }).catch(() => {});
    }
    return ApiResponse.ok(res, { id }, 'Note deleted');
  } catch (err) { next(err); }
}

async function generateQuestions(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const count = z.coerce.number().int().min(1).max(20).optional().parse(req.body?.count);
    const job = await aiService.enqueueGenerateQuestions({ noteId: id, count, userId: req.user.id });
    return ApiResponse.ok(res, job, 'Question generation queued');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, generateQuestions };