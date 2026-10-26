const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    subject: { type: String, trim: true },
    syllabusCode: { type: String, trim: true, index: true },
    description: { type: String },
    cover: {
      publicId: { type: String },
      url: { type: String },
    },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

courseSchema.index({ isPublished: 1, createdAt: -1 });

module.exports = mongoose.model('Course', courseSchema);