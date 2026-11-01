const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true },
    chosen: { type: String, default: '' },
    correct: { type: Boolean, default: false },
    marks: { type: Number, default: 0 },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true }
);

attemptSchema.index({ userId: 1, createdAt: -1 });
attemptSchema.index({ paperId: 1, userId: 1 });
attemptSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('Attempt', attemptSchema);