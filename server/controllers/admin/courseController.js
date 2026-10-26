const { z } = require('zod');
const Course = require('../../models/admin/Course');
const Topic = require('../../models/admin/Topic');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const paginate = require('../../utils/paginate');
const slugify = require('../../utils/slugify');

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  published: z.enum(['true', 'false']).optional(),
  q: z.string().optional(),
});

const idSchema = z.object({ id: z.string().regex(/^[0-9a-f]{24}$/i) });

const createSchema = z.object({
  title: z.string().min(2).max(150),
  subject: z.string().max(80).optional(),
  syllabusCode: z.string().max(40).optional(),
  description: z.string().max(2000).optional(),
  cover: z.object({ publicId: z.string().optional(), url: z.string().url().optional() }).optional(),
  isPublished: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

async function list(req, res, next) {
  try {
    const q = listQuerySchema.parse(req.query);
    const { page, limit, skip } = paginate.build(q);
    const filter = {};
    if (q.published === 'true') filter.isPublished = true;
    if (q.published === 'false') filter.isPublished = false;
    if (q.q) filter.title = { $regex: q.q, $options: 'i' };
    const [items, total] = await Promise.all([
      Course.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Course.countDocuments(filter),
    ]);
    return ApiResponse.ok(res, items, 'OK', paginate.meta({ page, limit, total }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const course = await Course.findById(id).lean();
    if (!course) throw ApiError.notFound('Course not found');
    const topics = await Topic.find({ courseId: id }).sort({ order: 1 }).lean();
    return ApiResponse.ok(res, { ...course, topics });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const slug = slugify(data.title);
    const existing = await Course.findOne({ slug }).lean();
    if (existing) throw ApiError.conflict('Course with this title already exists', 'SLUG_EXISTS');
    const course = await Course.create({ ...data, slug, ownerId: req.user.id });
    return ApiResponse.created(res, course, 'Course created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    if (patch.title) patch.slug = slugify(patch.title);
    const course = await Course.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!course) throw ApiError.notFound('Course not found');
    return ApiResponse.ok(res, course, 'Course updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const course = await Course.findByIdAndDelete(id);
    if (!course) throw ApiError.notFound('Course not found');
    await Topic.deleteMany({ courseId: id });
    return ApiResponse.ok(res, { id }, 'Course and topics deleted');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };