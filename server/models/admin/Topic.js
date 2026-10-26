const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', default: null, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    syllabusRef: { type: String, trim: true },
    order: { type: Number, default: 0, index: true },
  },
  { timestamps: true, versionKey: false }
);

topicSchema.index({ courseId: 1, slug: 1 }, { unique: true });
topicSchema.index({ courseId: 1, parentId: 1, order: 1 });

module.exports = mongoose.model('Topic', topicSchema);