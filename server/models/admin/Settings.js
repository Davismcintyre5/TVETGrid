const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({ q: { type: String, required: true }, a: { type: String, required: true } }, { _id: false });

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true, index: true },
    appName: { type: String, default: 'TVETGrid' },
    logoUrl: { type: String },
    supportEmail: { type: String },
    supportPhone: { type: String },
    contactAddress: { type: String },
    socialLinks: {
      facebook: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      tiktok: { type: String },
      youtube: { type: String },
    },
    faq: { type: [faqSchema], default: [] },
    featureFlags: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Settings', settingsSchema);