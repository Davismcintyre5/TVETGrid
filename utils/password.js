const bcrypt = require('bcryptjs');

const ROUNDS = 12;

async function hash(plain) {
  return bcrypt.hash(plain, ROUNDS);
}

async function compare(plain, hashStr) {
  return bcrypt.compare(plain, hashStr);
}

module.exports = { hash, compare };