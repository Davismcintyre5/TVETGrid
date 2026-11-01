const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    bodyMd: { type: String, required: true },
    effectiveAt: { type: Date, default: null },
    publishedAt: { type: Date, default: Date.now },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { _id: false }
);

const legalDocSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    bodyMd: { type: String, default: '' },
    version: { type: Number, default: 1 },
    isPublished: { type: Boolean, default: false, index: true },
    effectiveAt: { type: Date, default: null },
    versions: { type: [versionSchema], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LegalDoc', legalDocSchema);