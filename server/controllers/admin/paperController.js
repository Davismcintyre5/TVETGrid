const Paper = require('../../models/admin/Paper');
const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');
const uploadService = require('../../services/uploadService');

async function loadPaper(id) {
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid id', 'VALIDATION_001');
  const paper = await Paper.findById(id)
    .populate('courseId', 'title slug subject')
    .populate('subjectId', 'name slug code');
  if (!paper) throw ApiError.notFound('Paper not found');
  return paper;
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
  if (req.query.published === 'true') filter.isPublished = true;
  else if (req.query.published === 'false') filter.isPublished = false;
  if (req.query.year) filter.year = Number(req.query.year);
  if (req.query.q && String(req.query.q).trim()) {
    filter.title = { $regex: String(req.query.q).trim(), $options: 'i' };
  }

  const [items, total] = await Promise.all([
    Paper.find(filter)
      .populate('courseId', 'title slug subject')
      .populate('subjectId', 'name slug code')
      .sort({ year: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Paper.countDocuments(filter),
  ]);

  return ok(res, items, 'OK', meta({ page, limit, total }));
});

const getOne = asyncHandler(async (req, res) => {
  const paper = await loadPaper(req.params.id);
  return ok(res, paper.toObject());
});

const sign = asyncHandler(async (req, res) => {
  const { folder = 'tvetgrid/papers', resourceType = 'raw' } = req.body || {};
  const sig = await uploadService.sign({ folder, resourceType });
  return ok(res, sig, 'Signature ready');
});

const confirm = asyncHandler(async (req, res) => {
  const { publicId, resourceType = 'raw' } = req.body || {};
  if (!publicId) throw ApiError.badRequest('publicId required', 'VALIDATION_001');
  const asset = await uploadService.confirm({ publicId, resourceType });
  return ok(res, asset, 'Upload confirmed');
});

const create = asyncHandler(async (req, res) => {
  const { courseId, subjectId, title, year, paperNo, durationMin, isPublished, sourcePdf } = req.body || {};

  if (!isValidObjectId(courseId)) throw ApiError.badRequest('Invalid courseId');
  if (!isValidObjectId(subjectId)) throw ApiError.badRequest('subjectId required');

  const course = await Course.findById(courseId).lean();
  if (!course) throw ApiError.notFound('Course not found');

  const subject = await Subject.findOne({ _id: subjectId, courseId }).lean();
  if (!subject) throw ApiError.badRequest('Subject does not belong to this course', 'VALIDATION_001');

  if (!year) throw ApiError.badRequest('Year is required', 'VALIDATION_001');
  if (!sourcePdf?.url) throw ApiError.badRequest('sourcePdf required', 'VALIDATION_001');

  const paper = await Paper.create({
    title: title || '',
    courseId,
    subjectId,
    year: Number(year),
    paperNo: paperNo ? Number(paperNo) : null,
    durationMin: durationMin ? Number(durationMin) : null,
    isPublished: !!isPublished,
    sourcePdf,
    questions: [],
    createdBy: req.user.id,
  });

  return created(res, paper.toObject(), 'Paper created');
});

const update = asyncHandler(async (req, res) => {
  const paper = await loadPaper(req.params.id);
  const { year, paperNo, durationMin, isPublished, title } = req.body || {};

  if (year !== undefined) paper.year = Number(year);
  if (paperNo !== undefined) paper.paperNo = paperNo ? Number(paperNo) : null;
  if (durationMin !== undefined) paper.durationMin = durationMin ? Number(durationMin) : null;
  if (typeof isPublished === 'boolean') paper.isPublished = isPublished;
  if (typeof title === 'string') paper.title = title.trim();

  await paper.save();
  return ok(res, paper.toObject(), 'Paper updated');
});

const rename = asyncHandler(async (req, res) => {
  const paper = await loadPaper(req.params.id);
  const { title } = req.body || {};
  if (!title || !String(title).trim()) throw ApiError.badRequest('title required', 'VALIDATION_001');
  paper.title = String(title).trim();
  await paper.save();
  return ok(res, paper.toObject(), 'Renamed');
});

const replace = asyncHandler(async (req, res) => {
  const paper = await loadPaper(req.params.id);
  const { publicId, url, fileName, size, mimeType } = req.body || {};
  if (!publicId || !url) throw ApiError.badRequest('publicId and url required', 'VALIDATION_001');

  if (paper.sourcePdf?.publicId && paper.sourcePdf.publicId !== publicId) {
    await uploadService.remove({ publicId: paper.sourcePdf.publicId, resourceType: 'raw' }).catch(() => {});
  }

  paper.sourcePdf = {
    publicId,
    url,
    fileName: fileName || null,
    size: size || null,
    mimeType: mimeType || 'application/pdf',
  };
  await paper.save();
  return ok(res, paper.toObject(), 'PDF replaced');
});

const updateQuestions = asyncHandler(async (req, res) => {
  const paper = await loadPaper(req.params.id);
  const { questions } = req.body || {};
  if (!Array.isArray(questions)) throw ApiError.badRequest('questions array required', 'VALIDATION_001');

  paper.questions = questions;
  await paper.save();
  return ok(res, paper.toObject(), 'Questions updated');
});

const remove = asyncHandler(async (req, res) => {
  const paper = await loadPaper(req.params.id);
  if (paper.sourcePdf?.publicId) {
    await uploadService.remove({ publicId: paper.sourcePdf.publicId, resourceType: 'raw' }).catch(() => {});
  }
  await Paper.deleteOne({ _id: paper._id });
  return ok(res, { success: true }, 'Paper deleted');
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
  updateQuestions,
  remove,
};