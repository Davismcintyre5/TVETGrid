require('./dnsSet');
require('dotenv/config');

const readline = require('readline');

const { connectDB, disconnectDB } = require('../config/db');
const env = require('../config/env');
const Admin = require('../models/admin/Admin');
const User = require('../models/client/User');
const Course = require('../models/admin/Course');
const Subject = require('../models/admin/Subject');
const Paper = require('../models/admin/Paper');
const Note = require('../models/admin/Note');
const Settings = require('../models/admin/Settings');
const BackupSettings = require('../models/admin/BackupSettings');
const LegalDoc = require('../models/admin/LegalDoc');
const { ROLES, VISIBILITY, DIFFICULTY } = require('../utils/constants');
const password = require('../utils/password');
const slugify = require('../utils/slugify');

const C = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(q) {
  return new Promise((resolve) => rl.question(q, (a) => resolve(a.trim())));
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

function isProduction() {
  return env.nodeEnv === 'production';
}

const SEED_PASSWORD = 'Password123!';

const SEED_ADMINS = [
  { name: 'Root Admin', email: 'admin@tvetgrid.local', role: 'superadmin' },
];

const SEED_USERS = [
  { name: 'John Teacher',  email: 'teacher1@tvetgrid.local', role: ROLES.TEACHER },
  { name: 'Mary Teacher',  email: 'teacher2@tvetgrid.local', role: ROLES.TEACHER },
  { name: 'Student One',   email: 'student1@tvetgrid.local', role: ROLES.STUDENT },
  { name: 'Student Two',   email: 'student2@tvetgrid.local', role: ROLES.STUDENT },
  { name: 'Student Three', email: 'student3@tvetgrid.local', role: ROLES.STUDENT },
];

const SEED_COURSES = [
  {
    title: 'Basic Electricity',
    subject: 'Electrical',
    syllabusCode: 'ELEC-101',
    description: 'Fundamentals of electricity: voltage, current, resistance, Ohm law, AC/DC basics.',
    subjects: [
      'Introduction to Electricity',
      'Ohm Law & Power',
      'Series & Parallel Circuits',
      'AC Fundamentals',
    ],
  },
  {
    title: 'Welding & Fabrication',
    subject: 'Mechanical',
    syllabusCode: 'MECH-201',
    description: 'Arc welding, MIG, TIG, safety, and fabrication techniques for trade certification.',
    subjects: [
      'Safety & PPE',
      'Arc Welding Basics',
      'Joint Types',
      'Metal Fabrication',
    ],
  },
  {
    title: 'ICT Fundamentals',
    subject: 'ICT',
    syllabusCode: 'ICT-301',
    description: 'Computer basics, operating systems, networking, and office productivity.',
    subjects: [
      'Computer Hardware',
      'Operating Systems',
      'Networking Basics',
      'Office Applications',
    ],
  },
];

async function seedSettings() {
  const main = {
    singleton: 'main',
    appName: env.appName || 'TVETGrid',
    logoUrl: '',
    supportEmail: env.hdmBridge?.fromEmail || 'support@tvetgrid.co.ke',
    supportPhone: '+254700000000',
    contactAddress: 'Nairobi, Kenya',
    socialLinks: { facebook: '', twitter: '', instagram: '', tiktok: '', youtube: '' },
    faq: [
      { q: 'What is TVETGrid?', a: 'A learning platform for TVET students — past papers, notes and live sessions.' },
      { q: 'Is it free?', a: 'Most content is free. Live sessions may be scheduled by teachers.' },
    ],
    featureFlags: {},
  };
  await Settings.updateOne({ singleton: 'main' }, { $setOnInsert: main }, { upsert: true });
  ok('Settings seeded');

  const backup = {
    singleton: 'main',
    autoEnabled: false,
    frequency: 'daily',
    hourUtc: 3,
    dayOfWeek: 0,
    dayOfMonth: 1,
    emailOnCompletion: true,
    notifyEmails: [],
    retentionDays: 30,
  };
  await BackupSettings.updateOne({ singleton: 'main' }, { $setOnInsert: backup }, { upsert: true });
  ok('BackupSettings seeded');

  const legal = [
    { slug: 'terms',   title: 'Terms of Service', bodyMd: '# Terms of Service\n\nDraft content — edit from admin.', version: 1, isPublished: false },
    { slug: 'privacy', title: 'Privacy Policy',   bodyMd: '# Privacy Policy\n\nDraft content — edit from admin.',   version: 1, isPublished: false },
    { slug: 'cookies', title: 'Cookie Policy',    bodyMd: '# Cookie Policy\n\nDraft content — edit from admin.',    version: 1, isPublished: false },
  ];
  for (const d of legal) {
    await LegalDoc.updateOne({ slug: d.slug }, { $setOnInsert: d }, { upsert: true });
  }
  ok(`LegalDocs: ${legal.length} upserted`);
}

async function seedAdmins() {
  let count = 0;
  const passwordHash = await password.hash(SEED_PASSWORD);

  for (const a of SEED_ADMINS) {
    const existing = await Admin.findOne({ email: a.email }).lean();
    if (existing) continue;

    await Admin.create({
      name: a.name,
      email: a.email,
      phone: null,
      passwordHash,
      role: a.role,
      permissions: ['*'],
      isActive: true,
    });
    count++;
  }
  ok(`Admins: ${count} created (password: ${SEED_PASSWORD})`);
}

async function seedUsers() {
  let count = 0;
  const passwordHash = await password.hash(SEED_PASSWORD);

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email }).lean();
    if (existing) continue;

    await User.create({
      name: u.name,
      email: u.email,
      phone: '254700000000',
      passwordHash,
      role: u.role,
      isActive: true,
      emailVerified: true,
    });
    count++;
  }
  ok(`Users: ${count} created (password: ${SEED_PASSWORD})`);
}

async function seedCourses() {
  let courses = 0;
  let subjects = 0;

  for (const c of SEED_COURSES) {
    const slug = slugify(c.title);
    const course = await Course.findOneAndUpdate(
      { slug },
      {
        $setOnInsert: {
          title: c.title,
          slug,
          subject: c.subject,
          syllabusCode: c.syllabusCode,
          description: c.description,
          isPublished: true,
          subjects: [],
        },
      },
      { upsert: true, new: true }
    );
    courses++;

    const subjectIds = [];
    for (let i = 0; i < c.subjects.length; i++) {
      const name = c.subjects[i];
      const subjSlug = slugify(name);
      const doc = await Subject.findOneAndUpdate(
        { courseId: course._id, slug: subjSlug },
        {
          $setOnInsert: {
            courseId: course._id,
            name,
            slug: subjSlug,
            order: i + 1,
          },
        },
        { upsert: true, new: true }
      );
      subjectIds.push(doc._id);
      subjects++;
    }

    course.subjects = subjectIds;
    await course.save();
  }
  ok(`Courses: ${courses} | Subjects: ${subjects}`);
}

async function seedContent() {
  const elec = await Course.findOne({ slug: 'basic-electricity' }).lean();
  if (!elec) { warn('Basic Electricity course missing — run seed courses first'); return; }

  const subs = await Subject.find({ courseId: elec._id }).sort({ order: 1 }).lean();
  if (!subs.length) { warn('No subjects in Basic Electricity'); return; }

  const s0 = subs[0];

  const noteExists = await Note.findOne({ courseId: elec._id, title: 'Ohm Law Cheatsheet' }).lean();
  if (!noteExists) {
    await Note.create({
      courseId: elec._id,
      subjectId: s0._id,
      title: 'Ohm Law Cheatsheet',
      description: 'Quick reference for Ohm law formulas',
      bodyMd: '## Ohm Law\n\n**V = I × R**\n\n- V = Voltage (V)\n- I = Current (A)\n- R = Resistance (Ω)\n\n### Example\n12V across 4Ω → I = 3A.',
      visibility: VISIBILITY.PUBLIC,
    });
  }

  const paperExists = await Paper.findOne({ courseId: elec._id, year: 2024 }).lean();
  if (!paperExists) {
    const questions = [
      { qid: 'q1', stem: 'What is the SI unit of voltage?', options: ['Ampere', 'Volt', 'Ohm', 'Watt'], answer: 'Volt', marks: 2 },
      { qid: 'q2', stem: 'Ohm law states that V equals…', options: ['I + R', 'I × R', 'I / R', 'R / I'], answer: 'I × R', marks: 2 },
      { qid: 'q3', stem: 'Current in a 12V circuit with 4Ω resistance is…', options: ['3A', '48A', '0.33A', '16A'], answer: '3A', marks: 2 },
    ];

    await Paper.create({
      title: 'Basic Electricity · 2024 · Paper 1',
      courseId: elec._id,
      subjectId: s0._id,
      year: 2024,
      paperNo: 1,
      durationMin: 30,
      totalMarks: questions.reduce((s, q) => s + q.marks, 0),
      isPublished: true,
      sourcePdf: {
        publicId: null,
        url: null,
        fileName: null,
        size: null,
        mimeType: 'application/pdf',
      },
      questions: questions.map((x, i) => ({
        ...x,
        order: i + 1,
        difficulty: DIFFICULTY.EASY,
      })),
    });
  }

  ok('Content seeded (note + paper)');
}

async function seedAll() {
  await seedSettings();
  await seedAdmins();
  await seedUsers();
  await seedCourses();
  await seedContent();
}

async function menu() {
  clear();
  line();
  line(`${C.bold}${C.cyan}╭───────────────────────────────────────╮${C.reset}`);
  line(`${C.bold}${C.cyan}│   TVETGrid — Seed CLI                 │${C.reset}`);
  line(`${C.bold}${C.cyan}╰───────────────────────────────────────╯${C.reset}`);
  line();
  line(`  ${C.bold}1${C.reset}.  Seed all`);
  line(`  ${C.bold}2${C.reset}.  Seed settings + backup settings + legal`);
  line(`  ${C.bold}3${C.reset}.  Seed admins (standalone)`);
  line(`  ${C.bold}4${C.reset}.  Seed users (teachers + students)`);
  line(`  ${C.bold}5${C.reset}.  Seed courses + subjects`);
  line(`  ${C.bold}6${C.reset}.  Seed sample content (note + paper)`);
  line();
  line(`  ${C.dim}0.  Exit${C.reset}`);
  line();
  return await ask(`${C.cyan}›${C.reset} Select option: `);
}

async function main() {
  if (isProduction() && !process.argv.includes('--force')) {
    err('Refusing to run seed in production (use --force to override)');
    process.exit(1);
  }

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
      heading('Seeding');
      if (choice === '1') await seedAll();
      else if (choice === '2') await seedSettings();
      else if (choice === '3') await seedAdmins();
      else if (choice === '4') await seedUsers();
      else if (choice === '5') await seedCourses();
      else if (choice === '6') await seedContent();
      else if (choice === '0') break;
      else continue;
      line();
      ok('Done');
    } catch (e) {
      err(e.message);
    }
    await ask(`${C.dim}Press Enter to continue...${C.reset}`);
  }

  rl.close();
  await disconnectDB();
  line();
  ok('Bye');
  process.exit(0);
}

main();