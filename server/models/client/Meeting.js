const mongoose = require('mongoose');
const { MEETING_STATUS } = require('../../utils/constants');

const meetingSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', index: true },
    title: { type: String, required: true, trim: true },
    roomId: { type: String, required: true, unique: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMin: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(MEETING_STATUS), default: MEETING_STATUS.SCHEDULED, index: true },
    recordingUrl: { type: String },
    startedAt: { type: Date },
    endedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

meetingSchema.index({ hostId: 1, scheduledAt: -1 });
meetingSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);