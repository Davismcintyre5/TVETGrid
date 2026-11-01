const os = require('os');
const mongoose = require('mongoose');
const env = require('../../config/env');
const { getClient } = require('../../config/redis');
const { cloudinary } = require('../../config/cloudinary');
const { roomService } = require('../../config/livekit');
const queueService = require('../../services/queueService');
const User = require('../../models/client/User');
const Admin = require('../../models/admin/Admin');
const Course = require('../../models/admin/Course');
const Subject = require('../../models/admin/Subject');
const Paper = require('../../models/admin/Paper');
const Note = require('../../models/admin/Note');
const Attempt = require('../../models/client/Attempt');
const Meeting = require('../../models/client/Meeting');
const Progress = require('../../models/client/Progress');
const MeetingInvite = require('../../models/client/MeetingInvite');
const { ok } = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

function uptimeHuman(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

async function checkDatabase() {
  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const pingMs = Date.now() - start;
    const db = mongoose.connection.db;
    const stats = await db.stats();
    const collections = await db.listCollections().toArray();
    return {
      status: 'up',
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      collections: collections.length,
      documents: stats.objects || 0,
      pingMs,
    };
  } catch (err) {
    return { status: 'down', message: err.message };
  }
}

async function checkRedis() {
  if (!env.redis.enabled) return { status: 'disabled', enabled: false };
  const client = getClient();
  if (!client) return { status: 'down', enabled: true, message: 'no client' };
  const start = Date.now();
  try {
    await client.ping();
    return {
      status: 'up',
      enabled: true,
      host: client.options.host,
      pingMs: Date.now() - start,
    };
  } catch (err) {
    return { status: 'down', enabled: true, message: err.message };
  }
}

async function checkCloudinary() {
  const start = Date.now();
  try {
    await cloudinary.api.ping();
    return {
      status: 'up',
      cloud: env.cloudinary.cloudName,
      folder: env.cloudinary.folder,
      pingMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: 'down',
      cloud: env.cloudinary.cloudName,
      message: err.message,
    };
  }
}

async function checkLiveKit() {
  const start = Date.now();
  try {
    const rooms = await roomService.listRooms();
    return {
      status: 'up',
      url: env.livekit.url,
      activeRooms: Array.isArray(rooms) ? rooms.length : 0,
      pingMs: Date.now() - start,
    };
  } catch (err) {
    return {
      status: 'down',
      url: env.livekit.url,
      message: err.message,
    };
  }
}

async function checkQueues() {
  try {
    const queue = queueService.getQueue();
    if (!queue) {
      return { status: 'idle', queues: [] };
    }
    const counts = await queue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed'
    );
    return {
      status: 'up',
      queues: [
        {
          name: queueService.QUEUE_NAME,
          waiting: counts.waiting || 0,
          active: counts.active || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
          delayed: counts.delayed || 0,
        },
      ],
    };
  } catch (err) {
    return { status: 'down', queues: [], message: err.message };
  }
}

const detailed = asyncHandler(async (req, res) => {
  const startUptime = process.uptime();
  const mem = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  const [database, redis, cloudinaryStatus, livekit, queues] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkCloudinary(),
    checkLiveKit(),
    checkQueues(),
  ]);

  const since24h = new Date(Date.now() - 86400000);

  const [
    users,
    admins,
    courses,
    subjects,
    papers,
    notes,
    attempts,
    meetings,
    progress,
    invites24h,
    attempts24h,
    meetings24h,
  ] = await Promise.all([
    User.countDocuments(),
    Admin.countDocuments(),
    Course.countDocuments(),
    Subject.countDocuments(),
    Paper.countDocuments(),
    Note.countDocuments(),
    Attempt.countDocuments(),
    Meeting.countDocuments(),
    Progress.countDocuments(),
    MeetingInvite.countDocuments({ createdAt: { $gte: since24h } }),
    Attempt.countDocuments({ submittedAt: { $gte: since24h } }),
    Meeting.countDocuments({ startedAt: { $gte: since24h } }),
  ]);

  const services = [
    database.status,
    redis.status,
    cloudinaryStatus.status,
    livekit.status,
    queues.status,
  ];
  const counted = services.filter((s) => s !== 'disabled' && s !== 'idle');
  const up = counted.filter((s) => s === 'up').length;
  const total = counted.length;
  const overall = { up, total };
  const status = up === total ? 'healthy' : up === 0 ? 'down' : 'degraded';

  return ok(res, {
    status,
    overall,
    timestamp: new Date().toISOString(),
    server: {
      url: env.apiUrl,
      status: 'up',
      appName: env.appName,
      version: process.env.npm_package_version || '1.0.0',
      node: process.version,
      env: env.nodeEnv,
      platformFull: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      uptimeHuman: uptimeHuman(startUptime),
      uptimeSeconds: Math.round(startUptime),
      startedAt: new Date(Date.now() - startUptime * 1000).toISOString(),
      pid: process.pid,
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model,
        loadAvg: os.loadavg(),
      },
      memory: {
        rssMb: Math.round(mem.rss / 1048576),
        heapUsedMb: Math.round(mem.heapUsed / 1048576),
        heapTotalMb: Math.round(mem.heapTotal / 1048576),
        freeSystemMb: Math.round(freeMem / 1048576),
        totalSystemMb: Math.round(totalMem / 1048576),
      },
    },
    database,
    redis,
    cloudinary: cloudinaryStatus,
    livekit,
    hdmBridge: {
      status: 'up',
      fromEmail: env.hdmBridge.fromEmail,
      fromName: env.hdmBridge.fromName,
      smsSender: env.hdmBridge.smsSender,
      smsEnabled: env.hdmBridge.smsEnabled,
    },
    hdmAi: {
      status: 'up',
      model: env.hdmAi.model,
      apiUrl: env.hdmAi.apiUrl,
    },
    queues,
    data: {
      users,
      admins,
      courses,
      subjects,
      papers,
      notes,
      attempts,
      meetings,
      progress,
    },
    activity: {
      attempts24h,
      meetings24h,
      invites24h,
    },
  });
});

const simple = asyncHandler(async (req, res) => {
  return ok(res, { status: 'ok', uptime: Math.round(process.uptime()) });
});

module.exports = { detailed, simple };