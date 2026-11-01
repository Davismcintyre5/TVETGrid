const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      default: null,
      index: true,
    },
    questionId: { type: String, required: true, index: true },
    mastery: { type: Number, default: 0, min: 0, max: 100, index: true },
    attemptsCount: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    lastAttemptAt: { type: Date, default: null },
    nextReviewAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

progressSchema.index({ userId: 1, courseId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema);