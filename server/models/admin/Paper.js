const mongoose = require('mongoose');
const { DIFFICULTY } = require('../../utils/constants');

const questionSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true },
    order: { type: Number, default: 0 },
    stem: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String },
    solution: { type: String },
    topicIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
    difficulty: { type: String, enum: Object.values(DIFFICULTY), default: DIFFICULTY.MEDIUM },
    linkedLessonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' },
    linkedVideoTs: { type: Number },
    marks: { type: Number, default: 1 },
  },
  { _id: false }
);

const paperSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    year: { type: Number, required: true, index: true },
    subject: { type: String, trim: true },
    paperNo: { type: Number },
    durationMin: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    questions: { type: [questionSchema], default: [] },
    sourcePdf: {
      publicId: { type: String },
      url: { type: String },
    },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

paperSchema.index({ courseId: 1, year: -1 });
paperSchema.index({ courseId: 1, isPublished: 1, year: -1 });

module.exports = mongoose.model('Paper', paperSchema);