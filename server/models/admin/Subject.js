const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    code: { type: String, trim: true, default: null },
    description: { type: String, default: '' },
    order: { type: Number, default: 0, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

subjectSchema.index({ courseId: 1, slug: 1 }, { unique: true });
subjectSchema.index({ courseId: 1, order: 1 });
subjectSchema.index({ name: 'text', code: 'text' });

module.exports = mongoose.model('Subject', subjectSchema);