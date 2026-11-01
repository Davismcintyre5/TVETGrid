const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const SOURCE_SVG = path.join(PUBLIC_DIR, 'logo.svg');

const BG = { r: 11, g: 15, b: 25, alpha: 1 };

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

const MASKABLE_SIZES = [192, 512];

const FAVICONS = [
  { name: 'favicon-16x16.png', size: 16 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-48x48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function ensureDir(dir) {
  await fs.promises.mkdir(dir, { recursive: true });
}

async function svgBuffer(size, padding = 0) {
  const inner = Math.max(1, size - padding * 2);
  const base = await sharp(SOURCE_SVG)
    .resize(inner, inner, { fit: 'contain', background: BG })
    .png()
    .toBuffer();

  if (padding === 0) return base;

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: base, top: padding, left: padding }])
    .png()
    .toBuffer();
}

async function writeIcon(size, filename) {
  const buf = await svgBuffer(size);
  const out = path.join(PUBLIC_DIR, filename);
  await fs.promises.writeFile(out, buf);
  console.log(`  ✓ ${filename} (${size}x${size})`);
}

async function writeMaskable(size, filename) {
  const safeZone = Math.round(size * 0.1);
  const buf = await svgBuffer(size, safeZone);
  const out = path.join(PUBLIC_DIR, filename);
  await fs.promises.writeFile(out, buf);
  console.log(`  ✓ ${filename} (${size}x${size}, maskable)`);
}

async function writeIco() {
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(sizes.map((s) => svgBuffer(s)));
  const out = path.join(PUBLIC_DIR, 'favicon.ico');

  const ico = buildIco(pngs, sizes);
  await fs.promises.writeFile(out, ico);
  console.log(`  ✓ favicon.ico (${sizes.join(', ')})`);
}

function buildIco(pngBuffers, sizes) {
  const count = pngBuffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  const entries = [];
  let offset = dataOffset;
  for (let i = 0; i < count; i++) {
    const size = sizes[i];
    const buf = pngBuffers[i];
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(buf.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += buf.length;
  }

  return Buffer.concat([header, ...entries, ...pngBuffers]);
}

async function writeManifest() {
  const manifest = {
    name: 'TVETGrid',
    short_name: 'TVETGrid',
    description: 'TVETGrid — real-time virtual classroom and meetings.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0b0f19',
    theme_color: '#0b0f19',
    icons: [
      ...SIZES.map((size) => ({
        src: `/pwa-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'any',
      })),
      ...MASKABLE_SIZES.map((size) => ({
        src: `/pwa-maskable-${size}x${size}.png`,
        sizes: `${size}x${size}`,
        type: 'image/png',
        purpose: 'maskable',
      })),
    ],
  };

  const out = path.join(PUBLIC_DIR, 'manifest.webmanifest');
  await fs.promises.writeFile(out, JSON.stringify(manifest, null, 2) + '\n');
  console.log('  ✓ manifest.webmanifest');
}

async function main() {
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`Source SVG not found: ${SOURCE_SVG}`);
    process.exit(1);
  }

  await ensureDir(PUBLIC_DIR);

  console.log(`Generating PWA assets from ${path.relative(ROOT, SOURCE_SVG)}`);
  console.log(`Output: ${path.relative(ROOT, PUBLIC_DIR)}\n`);

  for (const size of SIZES) {
    await writeIcon(size, `pwa-${size}x${size}.png`);
  }

  for (const size of MASKABLE_SIZES) {
    await writeMaskable(size, `pwa-maskable-${size}x${size}.png`);
  }

  for (const { name, size } of FAVICONS) {
    await writeIcon(size, name);
  }

  await writeIco();
  await writeManifest();

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('PWA asset generation failed:', err.message);
  process.exit(1);
});