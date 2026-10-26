const mongoose = require('mongoose');
const { PAPER_MODE } = require('../../utils/constants');

const answerSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true },
    choice: { type: String },
    correct: { type: Boolean, default: false },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true, index: true },
    mode: { type: String, enum: Object.values(PAPER_MODE), default: PAPER_MODE.EXAM },
    answers: { type: [answerSchema], default: [] },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, index: true },
  },
  { timestamps: true, versionKey: false }
);

attemptSchema.index({ userId: 1, submittedAt: -1 });
attemptSchema.index({ paperId: 1, submittedAt: -1 });

module.exports = mongoose.model('Attempt', attemptSchema);