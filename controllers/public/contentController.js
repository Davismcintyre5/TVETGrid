const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const ApiError = require('../../utils/ApiError');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const { VISIBILITY } = require('../../utils/constants');

const listPapers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = { isPublished: true, 'sourcePdf.url': { $ne: null } };

  if (req.query.courseId) {
    if (!isValidObjectId(req.query.courseId)) throw ApiError.badRequest('Invalid courseId');
    filter.courseId = req.query.courseId;
  }
  if (req.query.subjectId) {
    if (!isValidObjectId(req.query.subjectId)) throw ApiError.badRequest('Invalid subjectId');
    filter.subjectId = req.query.subjectId;
  }
  if (req.query.year) filter.year = Number(req.query.year);

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .populate('courseId', 'title slug')
      .populate('subjectId', 'name slug')
      .select('title courseId subjectId year paperNo durationMin totalMarks sourcePdf createdAt')
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
    downloadUrl: p.sourcePdf?.url || null,
    fileName: p.sourcePdf?.fileName || null,
    createdAt: p.createdAt,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

const getPaper = asyncHandler(async (req, res) => {
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

const listNotes = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = { visibility: VISIBILITY.PUBLIC };

  if (req.query.courseId) {
    if (!isValidObjectId(req.query.courseId)) throw ApiError.badRequest('Invalid courseId');
    filter.courseId = req.query.courseId;
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

const getNote = asyncHandler(async (req, res) => {
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

module.exports = { listPapers, getPaper, listNotes, getNote };