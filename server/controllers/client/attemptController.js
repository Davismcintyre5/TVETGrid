const Attempt = require('../../models/client/Attempt');
const Progress = require('../../models/client/Progress');
const Paper = require('../../models/admin/Paper');
const ApiError = require('../../utils/ApiError');
const { ok, created } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { build, meta } = require('../../utils/paginate');
const { isValidObjectId } = require('../../utils/validateObjectId');

// ─── Submit an attempt ───────────────────────────────
const submit = asyncHandler(async (req, res) => {
  const { paperId, answers } = req.body || {};
  if (!isValidObjectId(paperId)) throw ApiError.badRequest('paperId required');
  if (!Array.isArray(answers)) throw ApiError.badRequest('answers array required');

  const paper = await Paper.findOne({ _id: paperId, isPublished: true }).lean();
  if (!paper) throw ApiError.notFound('Paper not found');

  // Grade against paper.questions
  const qMap = new Map((paper.questions || []).map((q) => [q.qid, q]));
  let score = 0;
  let totalMarks = 0;
  const perQuestion = [];

  for (const q of paper.questions || []) {
    totalMarks += q.marks || 1;
  }

  for (const a of answers) {
    const q = qMap.get(a.qid);
    if (!q) continue;
    const correct = String(a.chosen || '').trim() === String(q.answer || '').trim();
    const marks = correct ? q.marks || 1 : 0;
    score += marks;
    perQuestion.push({
      qid: a.qid,
      chosen: String(a.chosen || ''),
      correct,
      marks,
    });
  }

  const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

  const attempt = await Attempt.create({
    userId: req.user.id,
    paperId,
    courseId: paper.courseId || null,
    answers: perQuestion.map((p) => ({
      qid: p.qid,
      chosen: p.chosen,
      correct: p.correct,
      marks: p.marks,
    })),
    score,
    totalMarks,
    percentage,
    startedAt: new Date(),
    submittedAt: new Date(),
  });

  // Update Progress per question (simple mastery update)
  for (const pq of perQuestion) {
    const key = { userId: req.user.id, courseId: paper.courseId, questionId: pq.qid };
    const existing = await Progress.findOne(key);

    if (existing) {
      existing.attemptsCount = (existing.attemptsCount || 0) + 1;
      existing.correctCount = (existing.correctCount || 0) + (pq.correct ? 1 : 0);
      // mastery: start 0 → +20 per correct, -10 per wrong, clamp 0-100
      const delta = pq.correct ? 20 : -10;
      existing.mastery = Math.max(0, Math.min(100, (existing.mastery || 0) + delta));
      existing.lastAttemptAt = new Date();
      const days = existing.mastery >= 70 ? 7 : existing.mastery >= 40 ? 3 : 1;
      existing.nextReviewAt = new Date(Date.now() + days * 86400 * 1000);
      await existing.save();
    } else {
      await Progress.create({
        userId: req.user.id,
        courseId: paper.courseId || null,
        paperId,
        questionId: pq.qid,
        mastery: pq.correct ? 20 : 0,
        attemptsCount: 1,
        correctCount: pq.correct ? 1 : 0,
        lastAttemptAt: new Date(),
        nextReviewAt: new Date(Date.now() + 86400 * 1000),
      });
    }
  }

  return created(
    res,
    {
      attemptId: String(attempt._id),
      score,
      totalMarks,
      percentage,
      perQuestion,
      progressUpdated: true,
    },
    'Attempt submitted'
  );
});

// ─── List user's attempts ────────────────────────────
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = build(req.query);
  const filter = { userId: req.user.id };
  if (req.query.paperId && isValidObjectId(req.query.paperId)) {
    filter.paperId = req.query.paperId;
  }

  const [items, total] = await Promise.all([
    Attempt.find(filter)
      .populate('paperId', 'title year paperNo totalMarks sourcePdf')
      .populate('courseId', 'title slug')
      .sort({ submittedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attempt.countDocuments(filter),
  ]);

  const shaped = items.map((a) => ({
    _id: a._id,
    paper: a.paperId
      ? {
          _id: a.paperId._id,
          title: a.paperId.title,
          year: a.paperId.year,
          paperNo: a.paperId.paperNo,
        }
      : null,
    course: a.courseId ? { _id: a.courseId._id, title: a.courseId.title } : null,
    score: a.score,
    totalMarks: a.totalMarks,
    percentage: a.percentage,
    submittedAt: a.submittedAt || a.createdAt,
  }));

  return ok(res, shaped, 'OK', meta({ page, limit, total }));
});

// ─── Get one attempt ─────────────────────────────────
const getOne = asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) throw ApiError.badRequest('Invalid id');
  const attempt = await Attempt.findOne({
    _id: req.params.id,
    userId: req.user.id,
  })
    .populate('paperId', 'title year paperNo totalMarks questions')
    .populate('courseId', 'title slug')
    .lean();
  if (!attempt) throw ApiError.notFound('Attempt not found');

  // Attach question stems to answers
  const qMap = new Map((attempt.paperId?.questions || []).map((q) => [q.qid, q]));
  const detailed = (attempt.answers || []).map((a) => {
    const q = qMap.get(a.qid);
    return {
      qid: a.qid,
      stem: q?.stem || '',
      chosen: a.chosen,
      correctAnswer: q?.answer || '',
      correct: a.correct,
      marks: a.marks,
    };
  });

  return ok(res, {
    _id: attempt._id,
    paper: attempt.paperId
      ? {
          _id: attempt.paperId._id,
          title: attempt.paperId.title,
          year: attempt.paperId.year,
          paperNo: attempt.paperId.paperNo,
        }
      : null,
    course: attempt.courseId
      ? { _id: attempt.courseId._id, title: attempt.courseId.title }
      : null,
    score: attempt.score,
    totalMarks: attempt.totalMarks,
    percentage: attempt.percentage,
    submittedAt: attempt.submittedAt || attempt.createdAt,
    answers: detailed,
  });
});

module.exports = { submit, list, getOne };