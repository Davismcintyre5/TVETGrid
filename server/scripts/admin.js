require('./dnsSet');
require('dotenv/config');

const readline = require('readline');
const crypto = require('crypto');
const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../config/db');
const env = require('../config/env');
const Admin = require('../models/admin/Admin');
const User = require('../models/client/User');
const { ROLES } = require('../utils/constants');
const password = require('../utils/password');
const emailService = require('../services/emailService');

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const ADMIN_ROLES = ['admin', 'superadmin'];

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
}

function askHidden(question) {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);

    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (char) => {
      char = char.toString();
      if (char === '\n' || char === '\r' || char === '\u0004') {
        if (stdin.isTTY) stdin.setRawMode(wasRaw);
        stdin.removeListener('data', onData);
        stdin.pause();
        stdout.write('\n');
        resolve(input.trim());
      } else if (char === '\u0003') {
        stdout.write('\n');
        process.exit(0);
      } else if (char === '\u007F' || char === '\b') {
        input = input.slice(0, -1);
      } else {
        input += char;
      }
    };
    stdin.on('data', onData);
  });
}

function clear() { process.stdout.write('\x1b[2J\x1b[0f'); }
function line(s = '') { console.log(s); }

function heading(title) {
  line();
  line(`${C.bold}${C.cyan}${title}${C.reset}`);
  line(`${C.dim}${'─'.repeat(title.length)}${C.reset}`);
  line();
}

function ok(msg) { line(`${C.green}✔${C.reset} ${msg}`); }
function warn(msg) { line(`${C.yellow}⚠${C.reset} ${msg}`); }
function err(msg) { line(`${C.red}✖${C.reset} ${msg}`); }

function randomPassword(len = 14) {
  return crypto.randomBytes(len).toString('base64url').slice(0, len);
}

function maskEmail(email) {
  const [user, domain] = String(email).split('@');
  if (!domain) return '[redacted]';
  return `${user.slice(0, 1)}***@${domain}`;
}

function isProduction() {
  return env.nodeEnv === 'production';
}

// ─── Menu ────────────────────────────────────────────

async function menu() {
  clear();
  line();
  line(`${C.bold}${C.cyan}╭─────────────────────────────────────╮${C.reset}`);
  line(`${C.bold}${C.cyan}│   TVETGrid — Admin CLI               │${C.reset}`);
  line(`${C.bold}${C.cyan}╰─────────────────────────────────────╯${C.reset}`);
  line();
  line(`  ${C.bold}1${C.reset}.  List admins`);
  line(`  ${C.bold}2${C.reset}.  Create admin`);
  line(`  ${C.bold}3${C.reset}.  Manage admin`);
  line(`  ${C.bold}4${C.reset}.  List users`);
  line(`  ${C.bold}5${C.reset}.  List database collections`);
  if (!isProduction()) {
    line(`  ${C.bold}6${C.reset}.  Drop a collection`);
    line(`  ${C.bold}7${C.reset}.  Drop entire database`);
  }
  line();
  line(`  ${C.dim}0.  Exit${C.reset}`);
  line();
  return await ask(`${C.cyan}›${C.reset} Select option: `);
}

// ─── List admins ─────────────────────────────────────

async function listAdmins() {
  heading('Admins');
  const admins = await Admin.find().sort({ createdAt: 1 }).lean();

  if (!admins.length) {
    warn('No admins found');
  } else {
    for (const a of admins) {
      line(`  ${C.bold}${a.name}${C.reset} ${C.dim}<${maskEmail(a.email)}>${C.reset}`);
      line(`     ${C.dim}id:${C.reset}          ${a._id}`);
      line(`     ${C.dim}role:${C.reset}        ${a.role}`);
      line(`     ${C.dim}active:${C.reset}      ${a.isActive}`);
      line(`     ${C.dim}permissions:${C.reset} ${(a.permissions || ['*']).join(', ')}`);
      line(`     ${C.dim}last login:${C.reset}  ${a.lastLoginAt ? a.lastLoginAt.toISOString() : 'never'}`);
      line();
    }
  }
  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

// ─── Create admin ────────────────────────────────────

async function createAdmin() {
  heading('Create admin');

  const name = await ask('Full name: ');
  const email = (await ask('Email: ')).toLowerCase();
  const phone = await ask('Phone (optional): ');

  line(`  Roles: ${ADMIN_ROLES.map((r, i) => `${i + 1}. ${r}`).join('  ')}`);
  const roleChoice = await ask(`Role [1-${ADMIN_ROLES.length}] (default 1): `);
  const role = ADMIN_ROLES[parseInt(roleChoice, 10) - 1] || ADMIN_ROLES[0];

  const passwordInput = await askHidden('Password (leave blank to generate): ');

  if (!name || !email) {
    err('Name and email are required');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  const existing = await Admin.findOne({ email }).lean();
  if (existing) {
    err(`Admin with email ${email} already exists`);
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  const plain = passwordInput || randomPassword(14);
  const passwordHash = await password.hash(plain);

  const admin = await Admin.create({
    name,
    email,
    phone: phone || null,
    passwordHash,
    role,
    permissions: ['*'],
    isActive: true,
  });

  ok(`Created admin ${admin.name} <${admin.email}> (role: ${admin.role})`);

  if (!passwordInput) {
    line();
    line(`  ${C.bold}Temporary password:${C.reset} ${C.yellow}${plain}${C.reset}`);
    line(`  ${C.dim}Store this securely — it will not be shown again.${C.reset}`);
    line();
  }

  line(`${C.dim}Sending welcome email...${C.reset}`);
  try {
    const res = await emailService.sendAdminWelcome({
      to: admin.email,
      name: admin.name,
      email: admin.email,
      temporaryPassword: passwordInput ? null : plain,
      loginUrl: `${env.adminUrl}/login`,
      inline: true,
    });
    if (res.success) ok(`Welcome email sent to ${maskEmail(admin.email)}`);
    else warn(`Welcome email not sent: ${res.reason || res.error || 'unknown'}`);
  } catch (e) {
    warn(`Welcome email failed: ${e.message}`);
  }

  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

// ─── Manage admin ────────────────────────────────────

async function manageAdmin() {
  heading('Manage admins');
  const admins = await Admin.find().sort({ createdAt: 1 }).lean();

  if (!admins.length) {
    warn('No admins found');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  admins.forEach((a, i) => {
    line(`  ${C.bold}${i + 1}.${C.reset} ${a.name} ${C.dim}<${maskEmail(a.email)}>${C.reset} — ${a.role} — ${a.isActive ? 'active' : 'suspended'}`);
  });
  line();
  line(`  ${C.dim}0.  Back${C.reset}`);
  line();

  const choice = await ask(`${C.cyan}›${C.reset} Select admin: `);
  const index = parseInt(choice, 10) - 1;
  if (isNaN(index) || index < 0 || index >= admins.length) return;

  const admin = admins[index];
  clear();
  heading(`Manage: ${admin.name}`);

  line(`  ${C.bold}1${C.reset}.  Reset password`);
  line(`  ${C.bold}2${C.reset}.  Change role`);
  line(`  ${C.bold}3${C.reset}.  Activate`);
  line(`  ${C.bold}4${C.reset}.  Suspend`);
  line(`  ${C.bold}5${C.reset}.  Delete`);
  line();
  line(`  ${C.dim}0.  Back${C.reset}`);
  line();

  const action = await ask(`${C.cyan}›${C.reset} Action: `);

  if (action === '1') {
    const newPassword = await askHidden('New password (leave blank to generate): ');
    const plain = newPassword || randomPassword(14);
    const hash = await password.hash(plain);

    await Admin.updateOne(
      { _id: admin._id },
      { $set: { passwordHash: hash, passwordChangedAt: new Date(), refreshTokenHash: null } }
    );

    ok(`Password reset for ${admin.email}`);
    if (!newPassword) {
      line();
      line(`  ${C.bold}New password:${C.reset} ${C.yellow}${plain}${C.reset}`);
      line();
    }

    try {
      const res = await emailService.sendPasswordChanged({
        to: admin.email,
        name: admin.name,
        changedAt: new Date().toISOString(),
        ip: 'CLI',
        userAgent: 'scripts/admin.js',
        inline: true,
      });
      if (res.success) ok('Notification email sent');
      else warn(`Email not sent: ${res.reason || res.error || 'unknown'}`);
    } catch (e) {
      warn(`Email failed: ${e.message}`);
    }
  } else if (action === '2') {
    line(`  Roles: ${ADMIN_ROLES.map((r, i) => `${i + 1}. ${r}`).join('  ')}`);
    const roleChoice = await ask(`New role [1-${ADMIN_ROLES.length}]: `);
    const newRole = ADMIN_ROLES[parseInt(roleChoice, 10) - 1];
    if (!newRole) {
      warn('Invalid role');
    } else if (newRole === admin.role) {
      warn('Role unchanged');
    } else {
      await Admin.updateOne({ _id: admin._id }, { $set: { role: newRole } });
      ok(`Role changed to ${newRole}`);
    }
  } else if (action === '3') {
    await Admin.updateOne({ _id: admin._id }, { $set: { isActive: true, disabledReason: null, disabledAt: null } });
    ok(`${admin.email} activated`);
  } else if (action === '4') {
    const count = await Admin.countDocuments({ isActive: true });
    if (admin.isActive && count <= 1) {
      err('Cannot suspend the last active admin');
    } else {
      const reason = await ask('Reason (optional): ');
      await Admin.updateOne(
        { _id: admin._id },
        { $set: { isActive: false, disabledReason: reason || null, disabledAt: new Date() } }
      );
      ok(`${admin.email} suspended`);
    }
  } else if (action === '5') {
    const confirm = await ask(`${C.red}Type DELETE to confirm:${C.reset} `);
    if (confirm === 'DELETE') {
      const count = await Admin.countDocuments({ isActive: true });
      if (admin.isActive && count <= 1) {
        err('Cannot delete the last active admin');
      } else {
        await Admin.deleteOne({ _id: admin._id });
        ok(`${admin.email} deleted`);
      }
    } else {
      warn('Cancelled');
    }
  }

  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

// ─── List users ──────────────────────────────────────

async function listUsers() {
  heading('Users');
  const users = await User.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  if (!users.length) {
    warn('No users found');
  } else {
    line(`  ${C.dim}Showing latest 50${C.reset}`);
    line();
    for (const u of users) {
      line(`  ${C.bold}${u.name}${C.reset} ${C.dim}<${maskEmail(u.email)}>${C.reset} — ${u.role} — ${u.isActive ? 'active' : 'disabled'}`);
    }
  }
  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

// ─── Collections ─────────────────────────────────────

async function listCollections() {
  heading('Database collections');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (!collections.length) {
    warn('No collections found');
  } else {
    for (const c of collections) {
      const count = await db.collection(c.name).countDocuments();
      line(`  ${C.bold}${c.name.padEnd(28)}${C.reset} ${C.dim}${String(count).padStart(8)}${C.reset} docs`);
    }
  }
  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

async function dropCollection() {
  if (isProduction()) {
    err('Disabled in production');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  heading('Drop a collection');
  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();

  if (!collections.length) {
    warn('No collections found');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  collections.forEach((c, i) => line(`  ${C.bold}${i + 1}.${C.reset} ${c.name}`));
  line();
  line(`  ${C.dim}0.  Back${C.reset}`);
  line();

  const choice = await ask(`${C.cyan}›${C.reset} Select collection: `);
  const index = parseInt(choice, 10) - 1;
  if (isNaN(index) || index < 0 || index >= collections.length) return;

  const name = collections[index].name;
  const confirm = await ask(`${C.red}Type ${name} to confirm drop:${C.reset} `);

  if (confirm === name) {
    await db.collection(name).drop().catch(() => {});
    ok(`Collection "${name}" dropped`);
  } else {
    warn('Cancelled');
  }
  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

async function dropDatabase() {
  if (isProduction()) {
    err('Disabled in production');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  heading('Drop entire database');
  const db = mongoose.connection.db;
  const dbName = db.databaseName;

  warn(`This will permanently delete ALL data in "${dbName}".`);
  line();

  const confirm = await ask(`${C.red}Type ${dbName} to confirm:${C.reset} `);
  if (confirm !== dbName) {
    warn('Cancelled');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  const second = await ask(`${C.red}Type DROP DATABASE to confirm again:${C.reset} `);
  if (second !== 'DROP DATABASE') {
    warn('Cancelled');
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    return;
  }

  await db.dropDatabase();
  ok(`Database "${dbName}" dropped`);
  await ask(`${C.dim}Press Enter to continue...${C.reset}`);
}

// ─── Main ────────────────────────────────────────────

async function main() {
  clear();
  line(`${C.dim}Connecting to MongoDB...${C.reset}`);

  try {
    await connectDB();
    ok('Connected');
  } catch (e) {
    err(`Connection failed: ${e.message}`);
    process.exit(1);
  }

  while (true) {
    const choice = await menu();
    try {
      if (choice === '1') await listAdmins();
      else if (choice === '2') await createAdmin();
      else if (choice === '3') await manageAdmin();
      else if (choice === '4') await listUsers();
      else if (choice === '5') await listCollections();
      else if (choice === '6' && !isProduction()) await dropCollection();
      else if (choice === '7' && !isProduction()) await dropDatabase();
      else if (choice === '0') break;
    } catch (e) {
      err(e.message);
      await ask(`${C.dim}Press Enter to continue...${C.reset}`);
    }
  }

  rl.close();
  await disconnectDB();
  line();
  ok('Bye');
  process.exit(0);
}

main();