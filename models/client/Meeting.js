const mongoose = require('mongoose');
const { MEETING_STATUS } = require('../../utils/constants');

const meetingSettingsSchema = new mongoose.Schema(
  {
    muteAll: { type: Boolean, default: false },
    videoOffAll: { type: Boolean, default: false },
    chatDisabled: { type: Boolean, default: false },
    reactionsDisabled: { type: Boolean, default: false },
    locked: { type: Boolean, default: false },
    allowGuestJoin: { type: Boolean, default: false },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    scheduledAt: { type: Date, required: true, index: true },
    durationMin: { type: Number, default: 60 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    status: {
      type: String,
      enum: Object.values(MEETING_STATUS),
      default: MEETING_STATUS.SCHEDULED,
      index: true,
    },
    roomName: { type: String, required: true, unique: true, index: true },
    recordingUrl: { type: String, default: null },
    recordingPublicId: { type: String, default: null },
    settings: { type: meetingSettingsSchema, default: () => ({}) },
    removedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

meetingSchema.index({ scheduledAt: -1, status: 1 });
meetingSchema.index({ hostId: 1, status: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);