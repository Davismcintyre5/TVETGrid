const mongoose = require('mongoose');

const backupSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true, immutable: true },
    autoEnabled: { type: Boolean, default: false },
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    hourUtc: { type: Number, default: 3, min: 0, max: 23 },
    dayOfWeek: { type: Number, default: 0, min: 0, max: 6 },
    dayOfMonth: { type: Number, default: 1, min: 1, max: 28 },
    emailOnCompletion: { type: Boolean, default: false },
    notifyEmails: { type: [String], default: [] },
    retentionDays: { type: Number, default: 30, min: 1 },
    lastRunAt: { type: Date, default: null },
    lastRunStatus: { type: String, enum: ['never', 'success', 'failed'], default: 'never' },
    lastBackupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Backup', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BackupSettings', backupSettingsSchema);