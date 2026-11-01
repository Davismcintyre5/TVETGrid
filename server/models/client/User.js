const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String, trim: true, default: null, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: [ROLES.STUDENT, ROLES.TEACHER],
      default: ROLES.STUDENT,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    emailVerified: { type: Boolean, default: false },

    avatarUrl: { type: String, default: null },
    avatarPublicId: { type: String, default: null, select: false },

    courseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    preferredCourseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
      index: true,
    },

    verificationToken: { type: String, select: false, default: null, index: true },
    verificationExpires: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    refreshTokenHash: { type: String, select: false, default: null },
    disabledReason: { type: String, default: null },
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = function (plain) {
  return bcrypt.hash(plain, 12);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.refreshTokenHash;
  delete obj.verificationToken;
  delete obj.verificationExpires;
  delete obj.avatarPublicId;
  return obj;
};

userSchema.index({ name: 'text', email: 'text', phone: 'text' });

module.exports = mongoose.model('User', userSchema);