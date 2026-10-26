const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    permissions: { type: [String], default: ['*'] },
    lastAuditAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Admin', adminSchema);