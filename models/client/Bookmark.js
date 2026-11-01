const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paper',
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, paperId: 1 }, { unique: true });
bookmarkSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Bookmark', bookmarkSchema);