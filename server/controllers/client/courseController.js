const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { VISIBILITY } = require('../../utils/constants');

// ─── Browse (all published) — used at first-visit course picker ───
const listAll = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = { isPublished: true };

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
      .select('title slug subject syllabusCode description createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  const ids = items.map((c) => c._id);
  const [paperCounts, noteCounts] = await Promise.all([
    Paper.aggregate([
      { $match: { courseId: { $in: ids }, isPublished: true } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]),
    Note.aggregate([
      { $match: { courseId: { $in: ids }, visibility: VISIBILITY.PUBLIC } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]),
  ]);

  const pMap = Object.fromEntries(paperCounts.map((r) => [String(r._id), r.count]));
  const nMap = Object.fromEntries(noteCounts.map((r) => [String(r._id), r.count]));

  const shaped = items.map((c) => ({
    ...c,
    paperCount: pMap[String(c._id)] || 0,
    noteCount: nMap[String(c._id)] || 0,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

// ─── Get one course with subjects ────────────────────
const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  }

  const course = await Course.findOne({ _id: req.params.id, isPublished: true })
    .select('title slug subject syllabusCode description createdAt')
    .lean();
  if (!course) throw ApiError.notFound('Course not found');

  const subjects = await Subject.find({ courseId: course._id })
    .select('name slug code description order')
    .sort({ order: 1 })
    .lean();

  const [paperCount, noteCount] = await Promise.all([
    Paper.countDocuments({ courseId: course._id, isPublished: true }),
    Note.countDocuments({ courseId: course._id, visibility: VISIBILITY.PUBLIC }),
  ]);

  return ok(res, { ...course, subjects, paperCount, noteCount });
});

// ─── List subjects for a course ──────────────────────
const listSubjects = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.courseId)) {
    throw ApiError.badRequest('Invalid courseId', 'VALIDATION_001');
  }
  const course = await Course.findOne({
    _id: req.params.courseId,
    isPublished: true,
  }).lean();
  if (!course) throw ApiError.notFound('Course not found');

  const items = await Subject.find({ courseId: course._id })
    .select('name slug code description order')
    .sort({ order: 1 })
    .lean();
  return ok(res, items);
});

// ─── GET /client/me/courses — user's enrolled + preferred ───
const mine = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('courseIds preferredCourseId')
    .lean();
  if (!user) throw ApiError.unauthorized('User not found');

  const ids = user.courseIds || [];
  const courses = ids.length
    ? await Course.find({ _id: { $in: ids }, isPublished: true })
        .select('title slug subject syllabusCode description createdAt')
        .lean()
    : [];

  return ok(res, {
    courses,
    preferredCourseId: user.preferredCourseId ? String(user.preferredCourseId) : null,
  });
});

// ─── POST /client/me/courses — save chosen course ────
const chooseCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body || {};
  if (!isValidObjectId(courseId)) {
    throw ApiError.badRequest('courseId required', 'VALIDATION_001');
  }

  const course = await Course.findOne({ _id: courseId, isPublished: true }).lean();
  if (!course) throw ApiError.notFound('Course not found');

  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized('User not found');

  const existing = (user.courseIds || []).some((id) => String(id) === String(courseId));
  if (!existing) {
    user.courseIds = [...(user.courseIds || []), courseId];
  }
  user.preferredCourseId = courseId;
  await user.save();

  return ok(
    res,
    {
      courseId: String(courseId),
      course: { _id: course._id, title: course.title, slug: course.slug },
      preferredCourseId: String(courseId),
    },
    'Course selected'
  );
});

// ─── PATCH /client/me/preferred-course — switch default ────
const setPreferredCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.body || {};
  if (!isValidObjectId(courseId)) {
    throw ApiError.badRequest('courseId required', 'VALIDATION_001');
  }

  const course = await Course.findOne({ _id: courseId, isPublished: true }).lean();
  if (!course) throw ApiError.notFound('Course not found');

  const user = await User.findById(req.user.id);
  if (!user) throw ApiError.unauthorized('User not found');

  const existing = (user.courseIds || []).some((id) => String(id) === String(courseId));
  if (!existing) {
    user.courseIds = [...(user.courseIds || []), courseId];
  }
  user.preferredCourseId = courseId;
  await user.save();

  return ok(res, { preferredCourseId: String(courseId) }, 'Preferred course updated');
});

module.exports = {
  listAll,
  getOne,
  listSubjects,
  mine,
  chooseCourse,
  setPreferredCourse,
};