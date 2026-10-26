const { z } = require('zod');
const Paper = require('../../models/admin/Paper');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const paginate = require('../../utils/paginate');
const { DIFFICULTY } = require('../../utils/constants');

const oid = z.string().regex(/^[0-9a-f]{24}$/i);
const idSchema = z.object({ id: oid });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  courseId: oid.optional(),
  year: z.coerce.number().int().optional(),
  published: z.enum(['true', 'false']).optional(),
});

const questionSchema = z.object({
  qid: z.string().min(1),
  order: z.coerce.number().int().min(0).optional(),
  stem: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().optional(),
  solution: z.string().optional(),
  topicIds: z.array(oid).optional(),
  difficulty: z.enum(Object.values(DIFFICULTY)).optional(),
  linkedLessonId: oid.optional(),
  linkedVideoTs: z.coerce.number().optional(),
  marks: z.coerce.number().min(0).optional(),
});

const createSchema = z.object({
  courseId: oid,
  year: z.coerce.number().int().min(1900).max(2100),
  subject: z.string().optional(),
  paperNo: z.coerce.number().int().optional(),
  durationMin: z.coerce.number().int().min(0).optional(),
  totalMarks: z.coerce.number().min(0).optional(),
  questions: z.array(questionSchema).optional(),
  sourcePdf: z.object({ publicId: z.string().optional(), url: z.string().url().optional() }).optional(),
  isPublished: z.boolean().optional(),
});

const updateSchema = createSchema.partial();
const questionsSchema = z.object({ questions: z.array(questionSchema) });

async function list(req, res, next) {
  try {
    const q = listQuerySchema.parse(req.query);
    const { page, limit, skip } = paginate.build(q);
    const filter = {};
    if (q.courseId) filter.courseId = q.courseId;
    if (q.year) filter.year = q.year;
    if (q.published === 'true') filter.isPublished = true;
    if (q.published === 'false') filter.isPublished = false;
    const [items, total] = await Promise.all([
      Paper.find(filter).sort({ year: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Paper.countDocuments(filter),
    ]);
    return ApiResponse.ok(res, items, 'OK', paginate.meta({ page, limit, total }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const paper = await Paper.findById(id).lean();
    if (!paper) throw ApiError.notFound('Paper not found');
    return ApiResponse.ok(res, paper);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = createSchema.parse(req.body);
    const paper = await Paper.create(data);
    return ApiResponse.created(res, paper, 'Paper created');
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const patch = updateSchema.parse(req.body);
    const paper = await Paper.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true }).lean();
    if (!paper) throw ApiError.notFound('Paper not found');
    return ApiResponse.ok(res, paper, 'Paper updated');
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const paper = await Paper.findByIdAndDelete(id);
    if (!paper) throw ApiError.notFound('Paper not found');
    return ApiResponse.ok(res, { id }, 'Paper deleted');
  } catch (err) { next(err); }
}

async function saveQuestions(req, res, next) {
  try {
    const { id } = idSchema.parse(req.params);
    const { questions } = questionsSchema.parse(req.body);
    const totalMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
    const paper = await Paper.findByIdAndUpdate(id, { $set: { questions, totalMarks } }, { new: true }).lean();
    if (!paper) throw ApiError.notFound('Paper not found');
    return ApiResponse.ok(res, paper, 'Questions saved');
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, saveQuestions };