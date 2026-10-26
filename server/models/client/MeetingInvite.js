const mongoose = require('mongoose');
const { INVITE_RSVP, INVITE_CHANNEL } = require('../../utils/constants');

const meetingInviteSchema = new mongoose.Schema(
  {
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    name: { type: String, trim: true },
    token: { type: String, required: true, unique: true, index: true },
    shortCode: { type: String, unique: true, sparse: true, index: true },
    channels: [{ type: String, enum: Object.values(INVITE_CHANNEL) }],
    rsvp: { type: String, enum: Object.values(INVITE_RSVP), default: INVITE_RSVP.INVITED, index: true },
    messageId: { type: String },
    reminderSentAt: { type: Date },
    joinedAt: { type: Date },
    leftAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

meetingInviteSchema.index({ meetingId: 1, rsvp: 1 });

module.exports = mongoose.model('MeetingInvite', meetingInviteSchema);