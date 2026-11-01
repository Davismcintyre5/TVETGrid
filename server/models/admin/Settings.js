const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  { q: { type: String, required: true }, a: { type: String, required: true } },
  { _id: false }
);

const settingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'main', unique: true, immutable: true },
    appName: { type: String, default: 'TVETGrid' },
    logoUrl: { type: String, default: '' },
    supportEmail: { type: String, default: '' },
    supportPhone: { type: String, default: '' },
    contactAddress: { type: String, default: '' },
    socialLinks: { type: mongoose.Schema.Types.Mixed, default: {} },
    faq: { type: [faqSchema], default: [] },
    featureFlags: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);