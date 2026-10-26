const mongoose = require('mongoose');
const { VISIBILITY } = require('../../utils/constants');

const attachmentSchema = new mongoose.Schema(
  { publicId: { type: String }, url: { type: String, required: true }, name: { type: String } },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', index: true },
    title: { type: String, required: true, trim: true },
    bodyMd: { type: String, required: true },
    attachments: { type: [attachmentSchema], default: [] },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    visibility: { type: String, enum: Object.values(VISIBILITY), default: VISIBILITY.PUBLIC, index: true },
  },
  { timestamps: true, versionKey: false }
);

noteSchema.index({ courseId: 1, topicId: 1, createdAt: -1 });

module.exports = mongoose.model('Note', noteSchema);