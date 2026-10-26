const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    method: { type: String },
    path: { type: String },
    bodyHash: { type: String },
    status: { type: Number },
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: { createdAt: 'at', updatedAt: false }, versionKey: false }
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ adminId: 1, at: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);