const mongoose = require('mongoose');

const meetingParticipantSchema = new mongoose.Schema(
  {
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    joinedAt: { type: Date, default: Date.now, index: true },
    leftAt: { type: Date, default: null },
    isHost: { type: Boolean, default: false },
    role: {
      type: String,
      enum: ['host', 'cohost', 'participant'],
      default: 'participant',
    },
    isMutedByHost: { type: Boolean, default: false },
    isVideoBlockedByHost: { type: Boolean, default: false },
    removedAt: { type: Date, default: null },
    removedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    socketId: { type: String, default: null },
  },
  { timestamps: true }
);

meetingParticipantSchema.index({ meetingId: 1, userId: 1 }, { unique: true });
meetingParticipantSchema.index({ meetingId: 1, leftAt: 1 });
meetingParticipantSchema.index({ socketId: 1 });

module.exports = mongoose.model('MeetingParticipant', meetingParticipantSchema);