const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const slugify = require('../../utils/slugify');
const uploadService = require('../../services/uploadService');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = {};

  if (req.query.published === 'true') filter.isPublished = true;
  else if (req.query.published === 'false') filter.isPublished = false;

  if (req.query.q && String(req.query.q).trim()) {
    const q = String(req.query.q).trim();
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { subject: { $regex: q, $options: 'i' } },
      { syllabusCode: { $regex: q, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Course.find(filter)
      .populate('subjects', 'name slug code order')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  const shaped = items.map((c) => ({
    ...c,
    subjectCount: Array.isArray(c.subjects) ? c.subjects.length : 0,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const course = await Course.findById(req.params.id)
    .populate('subjects', 'name slug code description order')
    .lean();
  if (!course) throw ApiError.notFound('Course not found');
  return ok(res, course);
});

const create = asyncHandler(async (req, res) => {
  const { title, subject, syllabusCode, description, isPublished } = req.body || {};
  if (!title || !String(title).trim()) {
    throw ApiError.badRequest('Title is required', 'VALIDATION_001');
  }

  const slug = slugify(title);
  if (!slug) throw ApiError.badRequest('Title produces an empty slug', 'VALIDATION_001');

  const existing = await Course.findOne({ slug }).lean();
  if (existing) throw ApiError.conflict('A course with this title already exists', 'CONFLICT');

  const course = await Course.create({
    title: String(title).trim(),
    slug,
    subject: subject || '',
    syllabusCode: syllabusCode || '',
    description: description || '',
    isPublished: !!isPublished,
    subjects: [],
    createdBy: req.user.id,
  });

  return created(res, course.toObject(), 'Course created');
});

const update = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  const { title, subject, syllabusCode, description, isPublished } = req.body || {};

  if (typeof title === 'string' && title.trim() && title.trim() !== course.title) {
    const slug = slugify(title);
    const clash = await Course.findOne({ slug, _id: { $ne: course._id } }).lean();
    if (clash) throw ApiError.conflict('Slug already in use', 'CONFLICT');
    course.title = title.trim();
    course.slug = slug;
  }
  if (typeof subject === 'string') course.subject = subject;
  if (typeof syllabusCode === 'string') course.syllabusCode = syllabusCode;
  if (typeof description === 'string') course.description = description;
  if (typeof isPublished === 'boolean') course.isPublished = isPublished;

  await course.save();
  return ok(res, course.toObject(), 'Course updated');
});

const remove = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const course = await Course.findById(req.params.id);
  if (!course) throw ApiError.notFound('Course not found');

  const [papers, notes] = await Promise.all([
    Paper.find({ courseId: course._id }),
    Note.find({ courseId: course._id }),
  ]);

  for (const p of papers) {
    if (p.sourcePdf?.publicId) {
      await uploadService.remove({ publicId: p.sourcePdf.publicId, resourceType: 'raw' }).catch(() => {});
    }
  }
  for (const n of notes) {
    for (const f of n.files || []) {
      await uploadService.remove({ publicId: f.publicId, resourceType: f.resourceType || 'auto' }).catch(() => {});
    }
  }

  await Paper.deleteMany({ courseId: course._id });
  await Note.deleteMany({ courseId: course._id });
  await Subject.deleteMany({ courseId: course._id });
  await Course.deleteOne({ _id: course._id });

  return ok(res, { success: true }, 'Course deleted');
});

module.exports = { list, getOne, create, update, remove };