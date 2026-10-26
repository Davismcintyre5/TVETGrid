const { z } = require('zod');
const Topic = require('../../models/admin/Topic');
const asyncHandler = require('../../utils/asyncHandler');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const slugify = require('../../utils/slugify');

const idSchema = z.object({ id: z.string().regex(/^[0-9a-f]{24}$/i) });

const createSchema = z.object({
  courseId: z.string().regex(/^[0-9a-f]{24}$/i),
  parentId: z.string().regex(/^[0-9a-f]{24}$/i).nullable().optional(),
  name: z.string().min(1).max(120),
  syllabusRef: z.string().max(80).optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  syllabusRef: z.string().max(80).optional(),
  parentId: z.string().regex(/^[0-9a-f]{24}$/i).nullable().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string().regex(/^[0-9a-f]{24}$/i), order: z.coerce.number().int().min(0) })),
});

async function listByCourse(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const items = await Topic.find({ courseId: id }).sort({ parentId: 1, order: 1 }).lean();
    return ApiResponse.ok(res, items);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const slug = slugify(data.name);
    const existing = await Topic.findOne({ courseId: data.courseId, slug }).lean();
    if (existing) throw ApiError.conflict('Topic with this name already exists in course', 'SLUG_EXISTS');
    const topic = await Topic.create({ ...data, slug });
    return ApiResponse.created(res, topic, 'Topic created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    if (patch.name) patch.slug = slugify(patch.name);
    const topic = await Topic.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!topic) throw ApiError.notFound('Topic not found');
    return ApiResponse.ok(res, topic, 'Topic updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const topic = await Topic.findByIdAndDelete(id);
    if (!topic) throw ApiError.notFound('Topic not found');
    await Topic.deleteMany({ parentId: id });
    return ApiResponse.ok(res, { id }, 'Topic deleted');
  } catch (err) { next(err); }
}

async function reorder(req, res, next) {
  try {
    const { items } = reorderSchema.parse(req.body);
    await Promise.all(items.map((i) => Topic.updateOne({ _id: i.id }, { $set: { order: i.order } })));
    return ApiResponse.ok(res, { count: items.length }, 'Topics reordered');
  } catch (err) { next(err); }
}

module.exports = { listByCourse, create, update, remove, reorder };