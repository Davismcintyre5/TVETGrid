const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { VISIBILITY } = require('../../utils/constants');

const list = asyncHandler(async (req, res) => {
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
      .select('title slug subject syllabusCode description isPublished createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Course.countDocuments(filter),
  ]);

  const courseIds = items.map((c) => c._id);
  const [paperCounts, noteCounts] = await Promise.all([
    Paper.aggregate([
      { $match: { courseId: { $in: courseIds }, isPublished: true } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]),
    Note.aggregate([
      { $match: { courseId: { $in: courseIds }, visibility: VISIBILITY.PUBLIC } },
      { $group: { _id: '$courseId', count: { $sum: 1 } } },
    ]),
  ]);

  const paperMap = Object.fromEntries(paperCounts.map((r) => [String(r._id), r.count]));
  const noteMap = Object.fromEntries(noteCounts.map((r) => [String(r._id), r.count]));

  const shaped = items.map((c) => ({
    ...c,
    paperCount: paperMap[String(c._id)] || 0,
    noteCount: noteMap[String(c._id)] || 0,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');

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

  return ok(res, {
    ...course,
    subjects,
    paperCount,
    noteCount,
  });
});

const listSubjects = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.courseId)) {
    throw ApiError.badRequest('Invalid courseId', 'VALIDATION_001');
  }
  const items = await Subject.find({ courseId: req.params.courseId })
    .select('name slug code description order')
    .sort({ order: 1 })
    .lean();
  return ok(res, items);
});

module.exports = { list, getOne, listSubjects };