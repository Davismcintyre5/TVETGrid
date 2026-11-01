const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subject: { type: String, trim: true, default: '' },
    syllabusCode: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    isPublished: { type: Boolean, default: false, index: true },
    subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

courseSchema.index({ isPublished: 1, createdAt: -1 });
courseSchema.index({ title: 'text', subject: 'text', syllabusCode: 'text' });

module.exports = mongoose.model('Course', courseSchema);