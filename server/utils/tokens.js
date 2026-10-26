const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signAccess(payload) {
  return jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.accessTtl });
}

function signRefresh(payload, jti) {
  return jwt.sign({ ...payload, jti }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });
}

function verifyAccess(token) {
  return jwt.verify(token, env.jwt.secret);
}

function verifyRefresh(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };