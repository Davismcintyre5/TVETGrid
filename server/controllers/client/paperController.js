const Paper = require('../../models/admin/Paper');
const Course = require('../../models/admin/Course');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = { isPublished: true, 'sourcePdf.url': { $ne: null } };

  // courseId: explicit query param > user's preferred course (no "all")
  let courseId = req.query.courseId;
  if (!courseId) {
    const user = await User.findById(req.user.id).select('preferredCourseId').lean();
    if (user?.preferredCourseId) courseId = String(user.preferredCourseId);
  }

  if (courseId) {
    if (!isValidObjectId(courseId)) throw ApiError.badRequest('Invalid courseId');
    filter.courseId = courseId;
  }
  if (req.query.subjectId) {
    if (!isValidObjectId(req.query.subjectId)) throw ApiError.badRequest('Invalid subjectId');
    filter.subjectId = req.query.subjectId;
  }
  if (req.query.year) filter.year = Number(req.query.year);
  if (req.query.q && String(req.query.q).trim()) {
    filter.title = { $regex: String(req.query.q).trim(), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .populate('courseId', 'title slug')
      .populate('subjectId', 'name slug')
      .select('title courseId subjectId year paperNo durationMin totalMarks sourcePdf createdAt questions')
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Paper.countDocuments(filter),
  ]);

  const shaped = items.map((p) => ({
    _id: p._id,
    title: p.title,
    course: p.courseId ? { _id: p.courseId._id, title: p.courseId.title, slug: p.courseId.slug } : null,
    subject: p.subjectId ? { _id: p.subjectId._id, name: p.subjectId.name, slug: p.subjectId.slug } : null,
    year: p.year,
    paperNo: p.paperNo,
    durationMin: p.durationMin,
    totalMarks: p.totalMarks,
    questionCount: Array.isArray(p.questions) ? p.questions.length : 0,
    downloadUrl: p.sourcePdf?.url || null,
    fileName: p.sourcePdf?.fileName || null,
    createdAt: p.createdAt,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const p = await Paper.findOne({ _id: req.params.id, isPublished: true })
    .populate('courseId', 'title slug')
    .populate('subjectId', 'name slug')
    .lean();
  if (!p) throw ApiError.notFound('Paper not found');

  return ok(res, {
    _id: p._id,
    title: p.title,
    course: p.courseId ? { _id: p.courseId._id, title: p.courseId.title, slug: p.courseId.slug } : null,
    subject: p.subjectId ? { _id: p.subjectId._id, name: p.subjectId.name, slug: p.subjectId.slug } : null,
    year: p.year,
    paperNo: p.paperNo,
    durationMin: p.durationMin,
    totalMarks: p.totalMarks,
    questionCount: Array.isArray(p.questions) ? p.questions.length : 0,
    downloadUrl: p.sourcePdf?.url || null,
    fileName: p.sourcePdf?.fileName || null,
    createdAt: p.createdAt,
  });
});

module.exports = { list, getOne };