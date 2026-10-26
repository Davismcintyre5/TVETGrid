const mongoose = require('mongoose');

const backupSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true, index: true },
    autoEnabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily', index: true },
    hourUtc: { type: Number, default: 3, min: 0, max: 23 },
    dayOfWeek: { type: Number, default: 0, min: 0, max: 6 },
    dayOfMonth: { type: Number, default: 1, min: 1, max: 28 },
    emailOnCompletion: { type: Boolean, default: true },
    notifyEmails: [{ type: String, lowercase: true, trim: true }],
    retentionDays: { type: Number, default: 30, min: 1, max: 365 },
    lastRunAt: { type: Date },
    lastRunStatus: { type: String, enum: ['success', 'failed', 'never'], default: 'never' },
    lastBackupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Backup' },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('BackupSettings', backupSettingsSchema);