const mongoose = require('mongoose');
const { INVITE_RSVP, INVITE_CHANNEL } = require('../../utils/constants');

const meetingInviteSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    name: { type: String, default: '' },
    phone: { type: String, default: null },
    rsvp: {
      type: String,
      enum: Object.values(INVITE_RSVP),
      default: INVITE_RSVP.INVITED,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(INVITE_CHANNEL),
      default: INVITE_CHANNEL.EMAIL,
    },
    token: { type: String, required: true, unique: true, index: true },
    shortCode: { type: String, required: true, index: true },
    joinedAt: { type: Date, default: null },
    leftAt: { type: Date, default: null },
    reminderSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetingInviteSchema.index({ meetingId: 1, email: 1 }, { unique: true });
meetingInviteSchema.index({ meetingId: 1, rsvp: 1 });

module.exports = mongoose.model('MeetingInvite', meetingInviteSchema);