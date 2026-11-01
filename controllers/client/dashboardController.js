const User = require('../../models/client/User');
const Course = require('../../models/admin/Course');
const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const Bookmark = require('../../models/client/Bookmark');
const Attempt = require('../../models/client/Attempt');
const Progress = require('../../models/client/Progress');
const Meeting = require('../../models/client/Meeting');
const MeetingInvite = require('../../models/client/MeetingInvite');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { VISIBILITY } = require('../../utils/constants');

const overview = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('name email courseIds preferredCourseId emailVerified')
    .lean();

  const preferredCourseId = user?.preferredCourseId || null;

  const [bookmarksCount, attemptsCount, dueRevisionCount, upcomingMeetings, preferredCourse] =
    await Promise.all([
      Bookmark.countDocuments({ userId: req.user.id }),
      Attempt.countDocuments({ userId: req.user.id }),
      Progress.countDocuments({
        userId: req.user.id,
        nextReviewAt: { $lte: new Date() },
      }),
      MeetingInvite.find({ userId: req.user.id, rsvp: { $in: ['invited', 'accepted'] } })
        .populate({
          path: 'meetingId',
          select: 'title scheduledAt status courseId',
          populate: { path: 'courseId', select: 'title' },
        })
        .sort({ 'meetingId.scheduledAt': 1 })
        .limit(3)
        .lean(),
      preferredCourseId
        ? Course.findOne({ _id: preferredCourseId, isPublished: true })
            .select('title slug subject syllabusCode')
            .lean()
        : null,
    ]);

  let courseStats = null;
  if (preferredCourse) {
    const [paperCount, noteCount] = await Promise.all([
      Paper.countDocuments({ courseId: preferredCourse._id, isPublished: true }),
      Note.countDocuments({ courseId: preferredCourse._id, visibility: VISIBILITY.PUBLIC }),
    ]);
    courseStats = { paperCount, noteCount };
  }

  const meetings = upcomingMeetings
    .map((i) => i.meetingId)
    .filter(Boolean)
    .map((m) => ({
      _id: m._id,
      title: m.title,
      scheduledAt: m.scheduledAt,
      status: m.status,
      course: m.courseId?.title || null,
    }));

  return ok(res, {
    user: {
      name: user?.name,
      email: user?.email,
      emailVerified: user?.emailVerified,
    },
    preferredCourse: preferredCourse
      ? {
          _id: preferredCourse._id,
          title: preferredCourse.title,
          slug: preferredCourse.slug,
          subject: preferredCourse.subject,
          syllabusCode: preferredCourse.syllabusCode,
          paperCount: courseStats?.paperCount || 0,
          noteCount: courseStats?.noteCount || 0,
        }
      : null,
    stats: {
      bookmarks: bookmarksCount,
      attempts: attemptsCount,
      dueRevision: dueRevisionCount,
    },
    upcomingMeetings: meetings,
  });
});

module.exports = { overview };