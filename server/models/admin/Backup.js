const mongoose = require('mongoose');
const { BACKUP_STATUS } = require('../../utils/constants');

const backupSchema = new mongoose.Schema(
  {
    publicId: { type: String, index: true },
    url: { type: String },
    fileName: { type: String },
    size: { type: Number, default: 0 },
    status: { type: String, enum: Object.values(BACKUP_STATUS), default: BACKUP_STATUS.RUNNING, index: true },
    type: { type: String, enum: ['manual', 'scheduled', 'uploaded'], default: 'manual', index: true },
    collections: { type: [String], default: [] },
    documentsCount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    error: { type: String },
    completedAt: { type: Date },
    downloadedAt: { type: Date },
    downloadCount: { type: Number, default: 0 },
    emailedTo: [{ type: String, lowercase: true, trim: true }],
    emailedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

backupSchema.index({ createdAt: -1 });
backupSchema.index({ status: 1, createdAt: -1 });
backupSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);