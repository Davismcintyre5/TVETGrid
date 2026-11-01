const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', index: true },
    action: { type: String, required: true, index: true },
    method: { type: String },
    path: { type: String },
    bodyHash: { type: String },
    status: { type: Number },
    ip: { type: String },
    userAgent: { type: String },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);