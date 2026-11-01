const mongoose = require('mongoose');
const { cloudinary } = require('../config/cloudinary');
const env = require('../config/env');
const Backup = require('../models/admin/Backup');
const { BACKUP_STATUS } = require('../utils/constants');
const logger = require('../utils/logger');

const HEX24 = /^[0-9a-f]{24}$/i;

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function bufferToDataUri(buffer, mime = 'application/json') {
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

async function collectAll() {
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const dump = {
    meta: {
      exportedAt: new Date().toISOString(),
      database: db.databaseName,
      node: process.version,
      mongoose: mongoose.version,
    },
    collections: {},
  };
  let documentsCount = 0;

  for (const c of collections) {
    if (c.name.startsWith('system.')) continue;
    const docs = await db.collection(c.name).find({}).toArray();
    dump.collections[c.name] = docs;
    documentsCount += docs.length;
  }

  return { dump, documentsCount, collections: Object.keys(dump.collections) };
}

function reviveDoc(doc) {
  if (!doc || typeof doc !== 'object') return doc;

  if (doc._id && typeof doc._id === 'string' && HEX24.test(doc._id)) {
    try { doc._id = new mongoose.Types.ObjectId(doc._id); } catch { }
  }

  for (const [k, v] of Object.entries(doc)) {
    if (typeof v === 'string' && HEX24.test(v) && (k.endsWith('Id') || k === 'userId' || k === 'courseId')) {
      try { doc[k] = new mongoose.Types.ObjectId(v); } catch { }
    }
    if (Array.isArray(v) && k.endsWith('Ids')) {
      doc[k] = v.map((id) => (typeof id === 'string' && HEX24.test(id) ? new mongoose.Types.ObjectId(id) : id));
    }
  }

  return doc;
}

async function runBackup({ type = 'manual', createdBy = null } = {}) {
  const start = Date.now();
  const stamp = timestamp();
  const fileName = `tvetgrid-${stamp}.json`;
  const publicId = `tvetgrid/backups/tvetgrid-${stamp}`;

  const record = await Backup.create({
    status: BACKUP_STATUS.RUNNING,
    type,
    fileName,
    createdBy,
  });

  try {
    const { dump, documentsCount, collections } = await collectAll();
    const json = JSON.stringify(dump, null, 2);
    const buffer = Buffer.from(json, 'utf8');

    const upload = await cloudinary.uploader.upload(bufferToDataUri(buffer, 'application/json'), {
      resource_type: 'raw',
      public_id: publicId,
      format: 'json',
    });

    record.status = BACKUP_STATUS.SUCCESS;
    record.publicId = upload.public_id;
    record.url = upload.secure_url;
    record.size = buffer.length;
    record.collections = collections;
    record.documentsCount = documentsCount;
    record.completedAt = new Date();
    await record.save();

    logger.info('backupService: completed', {
      id: String(record._id),
      publicId: upload.public_id,
      secureUrl: upload.secure_url,
      size: buffer.length,
      docs: documentsCount,
      ms: Date.now() - start,
    });
    return record.toObject();
  } catch (err) {
    record.status = BACKUP_STATUS.FAILED;
    record.error = err.message;
    record.completedAt = new Date();
    await record.save();
    logger.error('backupService: failed', { err: err.message, ms: Date.now() - start });
    throw err;
  }
}

async function restore({ publicId }) {
  if (!publicId) throw new Error('publicId required');

  const b = await Backup.findOne({ publicId }).lean();
  if (!b || !b.url) throw new Error('Backup not found');

  const res = await fetch(b.url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const dump = await res.json();
  if (!dump || !dump.collections) throw new Error('Invalid backup file');

  const db = mongoose.connection.db;
  const stats = { restored: {}, errors: [] };

  for (const [name, docs] of Object.entries(dump.collections)) {
    try {
      const col = db.collection(name);
      await col.deleteMany({});
      if (docs.length) {
        const revived = docs.map(reviveDoc);
        await col.insertMany(revived, { ordered: false });
      }
      stats.restored[name] = docs.length;
    } catch (err) {
      stats.errors.push({ collection: name, error: err.message });
    }
  }

  logger.info('backupService: restore complete', stats);
  return stats;
}

async function list({ limit = 50, skip = 0 } = {}) {
  const [items, total] = await Promise.all([
    Backup.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Backup.countDocuments(),
  ]);
  return { items, total };
}

async function getById(id) {
  return Backup.findById(id).lean();
}

async function download({ id }) {
  const b = await Backup.findById(id).lean();
  if (!b || !b.publicId) throw new Error('Backup not found');

  await Backup.updateOne(
    { _id: id },
    { $inc: { downloadCount: 1 }, $set: { downloadedAt: new Date() } }
  );

  const url = `${b.url}?fl_attachment=${encodeURIComponent(b.fileName)}`;

  return { url, fileName: b.fileName, size: b.size };
}

async function markEmailed({ id, emails }) {
  const clean = (emails || []).map((e) => String(e).toLowerCase().trim()).filter(Boolean);
  await Backup.updateOne(
    { _id: id },
    { $addToSet: { emailedTo: { $each: clean } }, $set: { emailedAt: new Date() } }
  );
}

async function remove({ id }) {
  const b = await Backup.findById(id);
  if (!b) return { success: false, reason: 'not-found' };

  if (b.publicId) {
    try {
      await cloudinary.uploader.destroy(b.publicId, { resource_type: 'raw', invalidate: true });
    } catch (err) {
      logger.warn('backupService: cloudinary delete failed', { err: err.message });
    }
  }

  await Backup.deleteOne({ _id: id });
  return { success: true };
}

async function pruneOld({ retentionDays = 30 } = {}) {
  const cutoff = new Date(Date.now() - retentionDays * 86400000);
  const old = await Backup.find({ createdAt: { $lt: cutoff } });
  let removed = 0;

  for (const b of old) {
    if (b.publicId) {
      try {
        await cloudinary.uploader.destroy(b.publicId, { resource_type: 'raw', invalidate: true });
      } catch { }
    }
    await Backup.deleteOne({ _id: b._id });
    removed++;
  }

  logger.info('backupService: pruned', { removed, retentionDays });
  return { removed };
}

module.exports = {
  runBackup,
  restore,
  list,
  getById,
  download,
  markEmailed,
  remove,
  pruneOld,
};