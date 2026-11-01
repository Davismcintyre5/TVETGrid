const Note = require('../../models/admin/Note');
const User = require('../../models/client/User');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { VISIBILITY } = require('../../utils/constants');

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = { visibility: VISIBILITY.PUBLIC };

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
  if (req.query.q && String(req.query.q).trim()) {
    filter.title = { $regex: String(req.query.q).trim(), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Note.find(filter)
      .populate('courseId', 'title slug')
      .populate('subjectId', 'name slug')
      .select('title description courseId subjectId files bodyMd createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Note.countDocuments(filter),
  ]);

  const shaped = items.map((n) => ({
    _id: n._id,
    title: n.title,
    description: n.description,
    course: n.courseId ? { _id: n.courseId._id, title: n.courseId.title, slug: n.courseId.slug } : null,
    subject: n.subjectId ? { _id: n.subjectId._id, name: n.subjectId.name, slug: n.subjectId.slug } : null,
    fileCount: Array.isArray(n.files) ? n.files.length : 0,
    hasContent: !!(n.bodyMd && n.bodyMd.trim()),
    createdAt: n.createdAt,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const n = await Note.findOne({ _id: req.params.id, visibility: VISIBILITY.PUBLIC })
    .populate('courseId', 'title slug')
    .populate('subjectId', 'name slug')
    .lean();
  if (!n) throw ApiError.notFound('Note not found');

  return ok(res, {
    _id: n._id,
    title: n.title,
    description: n.description,
    course: n.courseId ? { _id: n.courseId._id, title: n.courseId.title, slug: n.courseId.slug } : null,
    subject: n.subjectId ? { _id: n.subjectId._id, name: n.subjectId.name, slug: n.subjectId.slug } : null,
    bodyMd: n.bodyMd || '',
    files: (n.files || []).map((f) => ({
      publicId: f.publicId,
      url: f.url,
      fileName: f.fileName,
      size: f.size,
      mimeType: f.mimeType,
    })),
    createdAt: n.createdAt,
  });
});

module.exports = { list, getOne };