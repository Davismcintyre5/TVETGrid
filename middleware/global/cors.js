const cors = require('cors');
const env = require('../../config/env');

module.exports = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (env.corsOrigins.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Confirm-Token'],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400,
});