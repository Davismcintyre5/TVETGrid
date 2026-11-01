const Note = require('../../models/admin/Note');
const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const uploadService = require('../../services/uploadService');
const aiService = require('../../services/aiService');

async function loadNote(id) {
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const note = await Note.findById(id)
    .populate('courseId', 'title slug subject')
    .populate('subjectId', 'name slug code');
  if (!note) throw ApiError.notFound('Note not found');
  return note;
}

const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = {};

  if (req.query.courseId) {
    if (!isValidObjectId(req.query.courseId)) throw ApiError.badRequest('Invalid courseId');
    filter.courseId = req.query.courseId;
  }
  if (req.query.subjectId) {
    if (!isValidObjectId(req.query.subjectId)) throw ApiError.badRequest('Invalid subjectId');
    filter.subjectId = req.query.subjectId;
  }
  if (req.query.visibility) filter.visibility = req.query.visibility;
  if (req.query.q && String(req.query.q).trim()) {
    filter.title = { $regex: String(req.query.q).trim(), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Note.find(filter)
      .populate('courseId', 'title slug subject')
      .populate('subjectId', 'name slug code')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Note.countDocuments(filter),
  ]);

  return ok(res, items, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const note = await loadNote(req.params.id);
  return ok(res, note.toObject());
});

const sign = asyncHandler(async (req, res) => {
  const { folder = 'tvetgrid/notes', resourceType = 'auto' } = req.body || {};
  const sig = await uploadService.sign({ folder, resourceType });
  return ok(res, sig, 'Signature ready');
});

const confirm = asyncHandler(async (req, res) => {
  const { publicId, resourceType = 'auto' } = req.body || {};
  if (!publicId) throw ApiError.badRequest('publicId required', 'VALIDATION_001');
  const asset = await uploadService.confirm({ publicId, resourceType });
  return ok(res, asset, 'Upload confirmed');
});

const create = asyncHandler(async (req, res) => {
  const {
    courseId,
    subjectId,
    title,
    description,
    visibility = 'public',
    files = [],
    bodyMd = '',
  } = req.body || {};

  if (!isValidObjectId(courseId)) throw ApiError.badRequest('Invalid courseId');
  if (!isValidObjectId(subjectId)) throw ApiError.badRequest('subjectId required');
  if (!title || !String(title).trim()) throw ApiError.badRequest('Title required', 'VALIDATION_001');

  const course = await Course.findById(courseId).lean();
  if (!course) throw ApiError.notFound('Course not found');

  const subject = await Subject.findOne({ _id: subjectId, courseId }).lean();
  if (!subject) throw ApiError.badRequest('Subject does not belong to this course', 'VALIDATION_001');

  if ((!files || files.length === 0) && !bodyMd.trim()) {
    throw ApiError.badRequest('Provide at least one file or bodyMd content', 'VALIDATION_001');
  }

  const note = await Note.create({
    title: String(title).trim(),
    description: description || '',
    courseId,
    subjectId,
    visibility,
    bodyMd: bodyMd || '',
    files: files || [],
    createdBy: req.user.id,
  });

  return created(res, note.toObject(), 'Note created');
});

const update = asyncHandler(async (req, res) => {
  const note = await loadNote(req.params.id);
  const { title, description, visibility, bodyMd } = req.body || {};

  if (typeof title === 'string' && title.trim()) note.title = title.trim();
  if (typeof description === 'string') note.description = description;
  if (typeof visibility === 'string') note.visibility = visibility;
  if (typeof bodyMd === 'string') note.bodyMd = bodyMd;

  await note.save();
  return ok(res, note.toObject(), 'Note updated');
});

const rename = asyncHandler(async (req, res) => {
  const note = await loadNote(req.params.id);
  const { title } = req.body || {};
  if (!title || !String(title).trim()) throw ApiError.badRequest('title required', 'VALIDATION_001');
  note.title = String(title).trim();
  await note.save();
  return ok(res, note.toObject(), 'Renamed');
});

const replace = asyncHandler(async (req, res) => {
  const note = await loadNote(req.params.id);
  const { files } = req.body || {};
  if (!Array.isArray(files)) throw ApiError.badRequest('files array required', 'VALIDATION_001');

  const oldIds = (note.files || []).map((f) => f.publicId).filter(Boolean);
  const newIds = files.map((f) => f.publicId).filter(Boolean);
  const removed = oldIds.filter((id) => !newIds.includes(id));

  for (const publicId of removed) {
    await uploadService.remove({ publicId, resourceType: 'auto' }).catch(() => {});
  }

  note.files = files;
  await note.save();
  return ok(res, note.toObject(), 'Files replaced');
});

const remove = asyncHandler(async (req, res) => {
  const note = await loadNote(req.params.id);
  for (const f of note.files || []) {
    await uploadService.remove({ publicId: f.publicId, resourceType: f.resourceType || 'auto' }).catch(() => {});
  }
  await Note.deleteOne({ _id: note._id });
  return ok(res, { success: true }, 'Note deleted');
});

const generateQuestions = asyncHandler(async (req, res) => {
  const note = await loadNote(req.params.id);
  if (!note.bodyMd || !note.bodyMd.trim()) {
    throw ApiError.badRequest('Note has no bodyMd content to generate questions from', 'VALIDATION_001');
  }
  const count = Math.min(20, Math.max(1, Number(req.body?.count) || 5));
  const result = await aiService.enqueueGenerateQuestions({
    noteId: String(note._id),
    count,
    userId: req.user.id,
  });
  return ok(res, result, 'Question generation queued');
});

module.exports = {
  list,
  getOne,
  sign,
  confirm,
  create,
  update,
  rename,
  replace,
  remove,
  generateQuestions,
};