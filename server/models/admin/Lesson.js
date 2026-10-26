const mongoose = require('mongoose');

const transcriptItemSchema = new mongoose.Schema(
  { t: { type: Number, required: true }, text: { type: String, required: true } },
  { _id: false }
);

const resourceSchema = new mongoose.Schema(
  { name: { type: String, required: true }, url: { type: String, required: true } },
  { _id: false }
);

const lessonSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', index: true },
    title: { type: String, required: true, trim: true },
    video: {
      publicId: { type: String },
      url: { type: String },
      duration: { type: Number, default: 0 },
      format: { type: String },
    },
    transcript: { type: [transcriptItemSchema], default: [] },
    resources: { type: [resourceSchema], default: [] },
    order: { type: Number, default: 0, index: true },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

lessonSchema.index({ courseId: 1, topicId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);