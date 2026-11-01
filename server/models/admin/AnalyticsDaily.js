const mongoose = require('mongoose');

const analyticsDailySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true },
    scope: {
      type: String,
      enum: ['global', 'course', 'paper'],
      required: true,
      index: true,
    },
    scopeId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    attempts: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    activeUsers: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    meetingsScheduled: { type: Number, default: 0 },
    meetingsHeld: { type: Number, default: 0 },
    invitesSent: { type: Number, default: 0 },
    invitesAttended: { type: Number, default: 0 },
    mastery: {
      red: { type: Number, default: 0 },
      amber: { type: Number, default: 0 },
      green: { type: Number, default: 0 },
    },
    invites: {
      total: { type: Number, default: 0 },
      attended: { type: Number, default: 0 },
      byChannel: { type: mongoose.Schema.Types.Mixed, default: {} },
    },
  },
  { timestamps: true }
);

analyticsDailySchema.index({ scope: 1, scopeId: 1, date: 1 }, { unique: true });
analyticsDailySchema.index({ date: -1 });

module.exports = mongoose.model('AnalyticsDaily', analyticsDailySchema);