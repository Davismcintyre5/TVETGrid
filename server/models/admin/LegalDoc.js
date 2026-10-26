const mongoose = require('mongoose');

const legalDocSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    bodyMd: { type: String, required: true },
    version: { type: Number, default: 1 },
    effectiveAt: { type: Date },
    publishedAt: { type: Date, index: true },
    isPublished: { type: Boolean, default: false, index: true },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('LegalDoc', legalDocSchema);