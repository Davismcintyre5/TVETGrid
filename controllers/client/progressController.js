const Progress = require('../../models/client/Progress');
const Course = require('../../models/admin/Course');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

// ─── Overview: per-course mastery breakdown ──────────
const overview = asyncHandler(async (req, res) => {
  const all = await Progress.find({ userId: req.user.id }).lean();

  const byCourse = {};
  for (const p of all) {
    const key = String(p.courseId || 'null');
    if (!byCourse[key]) {
      byCourse[key] = { total: 0, red: 0, amber: 0, green: 0, sumMastery: 0 };
    }
    const b = byCourse[key];
    b.total += 1;
    b.sumMastery += p.mastery || 0;
    if ((p.mastery || 0) < 40) b.red += 1;
    else if ((p.mastery || 0) < 70) b.amber += 1;
    else b.green += 1;
  }

  const courseIds = Object.keys(byCourse).filter((k) => k !== 'null');
  const courses = await Course.find({ _id: { $in: courseIds } })
    .select('title slug')
    .lean();
  const cMap = new Map(courses.map((c) => [String(c._id), c]));

  const items = Object.entries(byCourse).map(([key, b]) => {
    const course = key !== 'null' ? cMap.get(key) : null;
    return {
      courseId: key !== 'null' ? key : null,
      courseTitle: course?.title || 'General',
      courseSlug: course?.slug || null,
      totalQuestions: b.total,
      red: b.red,
      amber: b.amber,
      green: b.green,
      avgMastery: Math.round(b.sumMastery / b.total),
    };
  });

  return ok(res, items);
});

// ─── Revision queue: questions due for review ────────
const revisionQueue = asyncHandler(async (req, res) => {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const items = await Progress.find({
    userId: req.user.id,
    nextReviewAt: { $lte: new Date() },
  })
    .sort({ nextReviewAt: 1, mastery: 1 })
    .limit(limit)
    .populate('paperId', 'title year paperNo questions')
    .populate('courseId', 'title slug')
    .lean();

  const shaped = items.map((p) => {
    const q = p.paperId?.questions?.find((x) => x.qid === p.questionId);
    return {
      questionId: p.questionId,
      stem: q?.stem || '',
      paperId: p.paperId?._id ? String(p.paperId._id) : null,
      paperTitle: p.paperId?.title || null,
      courseTitle: p.courseId?.title || null,
      mastery: p.mastery,
      lastAttemptAt: p.lastAttemptAt,
      nextReviewAt: p.nextReviewAt,
    };
  });

  return ok(res, shaped);
});

module.exports = { overview, revisionQueue };