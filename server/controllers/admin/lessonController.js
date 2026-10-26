const { z } = require('zod');
const Lesson = require('../../models/admin/Lesson');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const paginate = require('../../utils/paginate');
const uploadService = require('../../services/uploadService');
const aiService = require('../../services/aiService');

const oid = z.string().regex(/^[0-9a-f]{24}$/i);
const idSchema = z.object({ id: oid });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  courseId: oid.optional(),
  topicId: oid.optional(),
  published: z.enum(['true', 'false']).optional(),
});

const createSchema = z.object({
  courseId: oid,
  topicId: oid.optional(),
  title: z.string().min(2).max(150),
  video: z.object({ publicId: z.string().optional(), url: z.string().url().optional(), duration: z.number().optional(), format: z.string().optional() }).optional(),
  transcript: z.array(z.object({ t: z.number(), text: z.string() })).optional(),
  resources: z.array(z.object({ name: z.string(), url: z.string().url() })).optional(),
  order: z.coerce.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

const uploadSignSchema = z.object({
  folder: z.string().optional(),
  resourceType: z.enum(['auto', 'video', 'image', 'raw']).optional(),
});

const confirmUploadSchema = z.object({
  publicId: z.string(),
  resourceType: z.enum(['auto', 'video', 'image', 'raw']).default('video'),
});

async function list(req, res, next) {
  try {
    const q = listQuerySchema.parse(req.query);
    const { page, limit, skip } = paginate.build(q);
    const filter = {};
    if (q.courseId) filter.courseId = q.courseId;
    if (q.topicId) filter.topicId = q.topicId;
    if (q.published === 'true') filter.isPublished = true;
    if (q.published === 'false') filter.isPublished = false;
    const [items, total] = await Promise.all([
      Lesson.find(filter).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Lesson.countDocuments(filter),
    ]);
    return ApiResponse.ok(res, items, 'OK', paginate.meta({ page, limit, total }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const lesson = await Lesson.findById(id).lean();
    if (!lesson) throw ApiError.notFound('Lesson not found');
    return ApiResponse.ok(res, lesson);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const lesson = await Lesson.create(data);
    return ApiResponse.created(res, lesson, 'Lesson created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const lesson = await Lesson.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!lesson) throw ApiError.notFound('Lesson not found');
    return ApiResponse.ok(res, lesson, 'Lesson updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const lesson = await Lesson.findByIdAndDelete(id);
    if (!lesson) throw ApiError.notFound('Lesson not found');
    if (lesson.video?.publicId) uploadService.remove({ publicId: lesson.video.publicId, resourceType: 'video' }).catch(() => {});
    return ApiResponse.ok(res, { id }, 'Lesson deleted');
  } catch (err) { next(err); }
}

async function uploadSign(req, res, next) {
  try {
    const data = uploadSignSchema.parse(req.body || {});
    const sig = await uploadService.sign({ folder: data.folder || 'lessons', resourceType: data.resourceType || 'video', userId: req.user.id });
    return ApiResponse.ok(res, sig, 'Upload signature');
  } catch (err) { next(err); }
}

async function confirmUpload(req, res, next) {
  try {
    const data = confirmUploadSchema.parse(req.body);
    const asset = await uploadService.confirm({ publicId: data.publicId, resourceType: data.resourceType });
    return ApiResponse.ok(res, asset, 'Upload confirmed');
  } catch (err) { next(err); }
}

async function summarizeTranscript(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const job = await aiService.enqueueSummarizeTranscript({ lessonId: id, userId: req.user.id });
    return ApiResponse.ok(res, job, 'Summary queued');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, uploadSign, confirmUpload, summarizeTranscript };