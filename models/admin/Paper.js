const mongoose = require('mongoose');
const { DIFFICULTY } = require('../../utils/constants');

const questionSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true },
    order: { type: Number, default: 0 },
    stem: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    solution: { type: String, default: '' },
    difficulty: {
      type: String,
      enum: Object.values(DIFFICULTY),
      default: DIFFICULTY.MEDIUM,
    },
    marks: { type: Number, default: 1, min: 1 },
    linkedVideoTs: { type: Number, default: null },
  },
  { _id: false }
);

const pdfSchema = new mongoose.Schema(
  {
    publicId: { type: String, default: null },
    url: { type: String, default: null },
    fileName: { type: String, default: null },
    size: { type: Number, default: null },
    mimeType: { type: String, default: 'application/pdf' },
  },
  { _id: false }
);

const paperSchema = new mongoose.Schema(
  {
    title: { type: String, default: '' },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
      index: true,
    },
    year: { type: Number, required: true, index: true },
    paperNo: { type: Number, default: null },
    durationMin: { type: Number, default: null },
    totalMarks: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false, index: true },
    sourcePdf: { type: pdfSchema, default: () => ({}) },
    questions: { type: [questionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

paperSchema.index({ courseId: 1, subjectId: 1, year: -1 });
paperSchema.index({ isPublished: 1, year: -1 });
paperSchema.index({ title: 'text' });

paperSchema.pre('save', function (next) {
  if (Array.isArray(this.questions)) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }
  next();
});

paperSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update && Array.isArray(update.questions)) {
    update.totalMarks = update.questions.reduce((s, q) => s + (q.marks || 0), 0);
  } else if (update && update.$set && Array.isArray(update.$set.questions)) {
    update.$set.totalMarks = update.$set.questions.reduce(
      (s, q) => s + (q.marks || 0),
      0
    );
  }
  next();
});

module.exports = mongoose.model('Paper', paperSchema);