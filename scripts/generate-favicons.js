const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, '../public/favicon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateFavicons() {
  console.log('Reading SVG...');
  const svgBuffer = fs.readFileSync(inputSvg);

  // Generate apple-touch-icon.png (180x180)
  console.log('Generating apple-touch-icon.png (180x180)...');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));

  // Generate android-chrome-192x192.png
  console.log('Generating android-chrome-192x192.png...');
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outputDir, 'android-chrome-192x192.png'));

  // Generate favicon.ico (multiple sizes: 16, 32, 48)
  console.log('Generating favicon.ico...');

  // Generate 32x32 PNG first (main ico size)
  const png32 = await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toBuffer();

  // Generate 16x16 PNG
  const png16 = await sharp(svgBuffer)
    .resize(16, 16)
    .png()
    .toBuffer();

  // Generate 48x48 PNG
  const png48 = await sharp(svgBuffer)
    .resize(48, 48)
    .png()
    .toBuffer();

  // Create ICO file manually (simple ICO format)
  const icoBuffer = createIco([
    { png: png16, size: 16 },
    { png: png32, size: 32 },
    { png: png48, size: 48 },
  ]);

  fs.writeFileSync(path.join(outputDir, 'favicon.ico'), icoBuffer);

  console.log('Done! Generated files:');
  console.log('  - public/apple-touch-icon.png (180x180)');
  console.log('  - public/android-chrome-192x192.png (192x192)');
  console.log('  - public/favicon.ico (16x16, 32x32, 48x48)');
}

// Create ICO file from PNG buffers
function createIco(images) {
  const headerSize = 6;
  const dirEntrySize = 16;

  // Calculate offsets
  let offset = headerSize + (dirEntrySize * images.length);
  const entries = images.map(img => {
    const entry = {
      size: img.size,
      png: img.png,
      offset: offset
    };
    offset += img.png.length;
    return entry;
  });

  // Total size
  const totalSize = offset;
  const buffer = Buffer.alloc(totalSize);

  // ICO Header
  buffer.writeUInt16LE(0, 0);      // Reserved
  buffer.writeUInt16LE(1, 2);      // Type (1 = ICO)
  buffer.writeUInt16LE(images.length, 4); // Number of images

  // Directory entries
  let pos = headerSize;
  for (const entry of entries) {
    buffer.writeUInt8(entry.size === 256 ? 0 : entry.size, pos);     // Width
    buffer.writeUInt8(entry.size === 256 ? 0 : entry.size, pos + 1); // Height
    buffer.writeUInt8(0, pos + 2);           // Color palette
    buffer.writeUInt8(0, pos + 3);           // Reserved
    buffer.writeUInt16LE(1, pos + 4);        // Color planes
    buffer.writeUInt16LE(32, pos + 6);       // Bits per pixel
    buffer.writeUInt32LE(entry.png.length, pos + 8);  // Size of image data
    buffer.writeUInt32LE(entry.offset, pos + 12);     // Offset to image data
    pos += dirEntrySize;
  }

  // Image data
  for (const entry of entries) {
    entry.png.copy(buffer, entry.offset);
  }

  return buffer;
}

generateFavicons().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
