const mongoose = require('mongoose');
const { BACKUP_STATUS } = require('../../utils/constants');

const backupSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(BACKUP_STATUS),
      default: BACKUP_STATUS.RUNNING,
      index: true,
    },
    type: { type: String, enum: ['manual', 'scheduled'], default: 'manual' },
    fileName: { type: String, required: true },
    publicId: { type: String, default: null },
    url: { type: String, default: null },
    size: { type: Number, default: 0 },
    collections: { type: [String], default: [] },
    documentsCount: { type: Number, default: 0 },
    error: { type: String, default: null },
    completedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    downloadCount: { type: Number, default: 0 },
    downloadedAt: { type: Date, default: null },
    emailedTo: { type: [String], default: [] },
    emailedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

backupSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Backup', backupSchema);