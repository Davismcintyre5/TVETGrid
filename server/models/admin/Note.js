const mongoose = require('mongoose');
const { VISIBILITY } = require('../../utils/constants');

const fileSchema = new mongoose.Schema(
  {
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    fileName: { type: String, default: null },
    size: { type: Number, default: null },
    mimeType: { type: String, default: 'application/octet-stream' },
    resourceType: { type: String, default: 'auto' },
  },
  { _id: false }
);

const generatedQuestionSchema = new mongoose.Schema(
  {
    qid: { type: String, required: true },
    stem: { type: String, required: true },
    options: { type: [String], default: [] },
    answer: { type: String, required: true },
    solution: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    marks: { type: Number, default: 1 },
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
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
    visibility: {
      type: String,
      enum: Object.values(VISIBILITY),
      default: VISIBILITY.PUBLIC,
      index: true,
    },
    bodyMd: { type: String, default: '' },
    files: { type: [fileSchema], default: [] },
    generatedQuestions: { type: [generatedQuestionSchema], default: [] },
    questionsStatus: {
      type: String,
      enum: ['idle', 'queued', 'processing', 'done', 'failed'],
      default: 'idle',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

noteSchema.index({ courseId: 1, subjectId: 1, visibility: 1, createdAt: -1 });
noteSchema.index({ title: 'text', description: 'text', bodyMd: 'text' });

module.exports = mongoose.model('Note', noteSchema);