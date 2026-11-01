const Bookmark = require('../../models/client/Bookmark');
const Paper = require('../../models/admin/Paper');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');

// ─── List user's bookmarks ───────────────────────────
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);

  const [items, total] = await Promise.all([
    Bookmark.find({ userId: req.user.id })
      .populate({
        path: 'paperId',
        select: 'title year paperNo durationMin totalMarks sourcePdf courseId subjectId',
        populate: [
          { path: 'courseId', select: 'title slug' },
          { path: 'subjectId', select: 'name slug' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Bookmark.countDocuments({ userId: req.user.id }),
  ]);

  const shaped = items
    .filter((b) => b.paperId)
    .map((b) => ({
      _id: b._id,
      paperId: b.paperId._id,
      paper: {
        _id: b.paperId._id,
        title: b.paperId.title,
        year: b.paperId.year,
        paperNo: b.paperId.paperNo,
        durationMin: b.paperId.durationMin,
        totalMarks: b.paperId.totalMarks,
        downloadUrl: b.paperId.sourcePdf?.url || null,
        fileName: b.paperId.sourcePdf?.fileName || null,
        course: b.paperId.courseId
          ? { _id: b.paperId.courseId._id, title: b.paperId.courseId.title }
          : null,
        subject: b.paperId.subjectId
          ? { _id: b.paperId.subjectId._id, name: b.paperId.subjectId.name }
          : null,
      },
      createdAt: b.createdAt,
    }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

// ─── Add bookmark ────────────────────────────────────
const add = asyncHandler(async (req, res) => {
  const { paperId } = req.body || {};
  if (!isValidObjectId(paperId)) throw ApiError.badRequest('paperId required');

  const paper = await Paper.findOne({ _id: paperId, isPublished: true }).lean();
  if (!paper) throw ApiError.notFound('Paper not found');

  const existing = await Bookmark.findOne({ userId: req.user.id, paperId }).lean();
  if (existing) return ok(res, { bookmarked: true }, 'Already bookmarked');

  const bookmark = await Bookmark.create({ userId: req.user.id, paperId });
  return created(res, { _id: bookmark._id, paperId }, 'Bookmarked');
});

// ─── Remove bookmark ─────────────────────────────────
const remove = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  if (!isValidObjectId(paperId)) throw ApiError.badRequest('Invalid paperId');

  await Bookmark.deleteOne({ userId: req.user.id, paperId });
  return ok(res, { bookmarked: false }, 'Bookmark removed');
});

module.exports = { list, add, remove };