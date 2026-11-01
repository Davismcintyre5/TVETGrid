const Subject = require('../../models/admin/Subject');
const Course = require('../../models/admin/Course');
const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { isValidObjectId } = require('../../utils/validateObjectId');
const slugify = require('../../utils/slugify');

const listForCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  if (!isValidObjectId(courseId)) throw ApiError.badRequest('Invalid courseId', 'VALIDATION_001');

  const items = await Subject.find({ courseId }).sort({ order: 1, createdAt: 1 }).lean();
  return ok(res, items);
});

const create = asyncHandler(async (req, res) => {
  const { courseId, name, code, description, order } = req.body || {};
  if (!isValidObjectId(courseId)) throw ApiError.badRequest('Invalid courseId', 'VALIDATION_001');
  if (!name || !String(name).trim()) throw ApiError.badRequest('Name required', 'VALIDATION_001');

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');

  const slug = slugify(name);
  if (!slug) throw ApiError.badRequest('Name produces empty slug', 'VALIDATION_001');

  const clash = await Subject.findOne({ courseId, slug }).lean();
  if (clash) throw ApiError.conflict('Subject with this name already exists in course', 'CONFLICT');

  const subject = await Subject.create({
    courseId,
    name: String(name).trim(),
    slug,
    code: code || null,
    description: description || '',
    order: Number(order) || 0,
    createdBy: req.user.id,
  });

  course.subjects = [...(course.subjects || []), subject._id];
  await course.save();

  return created(res, subject.toObject(), 'Subject created');
});

const update = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  const { name, code, description, order } = req.body || {};

  if (typeof name === 'string' && name.trim() && name.trim() !== subject.name) {
    const slug = slugify(name);
    const clash = await Subject.findOne({
      courseId: subject.courseId,
      slug,
      _id: { $ne: subject._id },
    }).lean();
    if (clash) throw ApiError.conflict('Subject name already used', 'CONFLICT');
    subject.name = name.trim();
    subject.slug = slug;
  }
  if (code !== undefined) subject.code = code || null;
  if (description !== undefined) subject.description = description || '';
  if (order !== undefined) subject.order = Number(order) || 0;

  await subject.save();
  return ok(res, subject.toObject(), 'Subject updated');
});

const reorder = asyncHandler(async (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items)) throw ApiError.badRequest('items array required', 'VALIDATION_001');

  await Promise.all(
    items.map(({ id, order }) =>
      isValidObjectId(id)
        ? Subject.updateOne({ _id: id }, { $set: { order: Number(order) || 0 } })
        : Promise.resolve()
    )
  );

  return ok(res, { success: true }, 'Reordered');
});

const remove = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const subject = await Subject.findById(req.params.id);
  if (!subject) throw ApiError.notFound('Subject not found');

  const remaining = await Subject.countDocuments({
    courseId: subject.courseId,
    _id: { $ne: subject._id },
  });
  if (remaining === 0) {
    throw ApiError.badRequest('A course must have at least one subject', 'LAST_SUBJECT');
  }

  const papers = await Paper.find({ subjectId: subject._id }).select('_id').lean();
  const paperIds = papers.map((p) => p._id);

  await Note.deleteMany({ subjectId: subject._id });
  await Paper.updateMany(
    { _id: { $in: paperIds } },
    { $set: { isPublished: false } }
  );

  await Course.updateOne(
    { _id: subject.courseId },
    { $pull: { subjects: subject._id } }
  );
  await Subject.deleteOne({ _id: subject._id });

  return ok(res, { success: true }, 'Subject deleted');
});

module.exports = { listForCourse, create, update, reorder, remove };