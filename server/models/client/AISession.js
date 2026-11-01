const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    content: { type: String, required: true },
    ts: { type: Date, default: Date.now },
    citedPapers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Paper',
      default: [],
    },
  },
  { _id: false }
);

const aiSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    title: { type: String, default: 'New chat' },
    messages: { type: [messageSchema], default: [] },
    tokensUsed: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

aiSessionSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('AISession', aiSessionSchema);