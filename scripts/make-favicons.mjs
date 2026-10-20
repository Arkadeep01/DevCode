import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'src', 'assets', 'devcode.png');
const publicDir = path.join(root, 'public');
const STANDARD_MARGIN = 0.07;
const SMALL_MARGIN = 0.02;
const LIGHT_BG = { r: 241, g: 247, b: 255, alpha: 1 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const CRC_TABLE = new Uint32Array(256);

for (let n = 0; n < 256; n += 1) {
  let value = n;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  CRC_TABLE[n] = value >>> 0;
}

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function clearPaletteAlpha(png) {
  const patched = Buffer.from(png);
  let offset = 8;

  while (offset + 12 <= patched.length) {
    const length = patched.readUInt32BE(offset);
    const type = patched.toString('ascii', offset + 4, offset + 8);

    if (type === 'tRNS') {
      for (let index = offset + 8; index < offset + 8 + length; index += 1) {
        if (patched[index] <= 1) patched[index] = 0;
      }
      const chunkStart = offset + 4;
      const chunkEnd = offset + 8 + length;
      patched.writeUInt32BE(crc32(patched.subarray(chunkStart, chunkEnd)), chunkEnd);
      break;
    }

    offset += length + 12;
  }

  return patched;
}

function cleanEdges(data) {
  const out = Buffer.from(data);
  for (let index = 0; index < out.length; index += 4) {
    if (out[index + 3] <= 3) out[index + 3] = 0;
  }
  return out;
}

function symbolBounds(data, width, height) {
  const occupiedColumns = [];
  for (let x = 0; x < width; x += 1) {
    let occupied = false;
    for (let y = 0; y < height; y += 1) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        occupied = true;
        break;
      }
    }
    occupiedColumns.push(occupied);
  }

  const first = occupiedColumns.indexOf(true);
  if (first === -1) throw new Error('No artwork found in the source image');

  let right = first;
  let emptyRun = 0;
  for (let x = first + 1; x < width; x += 1) {
    if (occupiedColumns[x]) {
      right = x;
      emptyRun = 0;
    } else {
      emptyRun += 1;
      if (emptyRun >= 8) break;
    }
  }

  let top = height;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = first; x <= right; x += 1) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        break;
      }
    }
  }

  return {
    left: first,
    top,
    width: right - first + 1,
    height: bottom - top + 1,
  };
}

async function squareCanvas(data, width, height, margin) {
  const side = Math.round(Math.max(width, height) / (1 - margin * 2));
  const left = Math.round((side - width) / 2);
  const top = Math.round((side - height) / 2);

  const buffer = await sharp(data, { raw: { width, height, channels: 4 } })
    .extend({
      left,
      right: side - width - left,
      top,
      bottom: side - height - top,
      background: TRANSPARENT,
    })
    .png()
    .toBuffer();

  return sharp(buffer);
}

function resizeTo(pipeline, size, sharpen = false) {
  let image = pipeline.resize(size, size, { kernel: 'lanczos3' });
  if (sharpen) image = image.sharpen({ sigma: 0.5 });
  return image;
}

async function pngBuffer(pipeline, size, palette, sharpen = false) {
  const output = await resizeTo(pipeline, size, sharpen)
    .png(
      palette
        ? {
            compressionLevel: 9,
            adaptiveFiltering: false,
            palette: true,
            colours: 16,
            quality: 90,
            effort: 10,
            dither: 0,
          }
        : { compressionLevel: 9, adaptiveFiltering: true },
    )
    .toBuffer();

  return palette ? clearPaletteAlpha(output) : output;
}

function buildIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  let offset = header.length;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(image.size >= 256 ? 0 : image.size, entry);
    header.writeUInt8(image.size >= 256 ? 0 : image.size, entry + 1);
    header.writeUInt8(0, entry + 2);
    header.writeUInt8(0, entry + 3);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(image.data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += image.data.length;
  });

  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

async function report(name) {
  const file = await stat(path.join(publicDir, name));
  console.log(`${name}: ${file.size} B`);
  return file.size;
}

async function main() {
  await mkdir(publicDir, { recursive: true });

  const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cleaned = cleanEdges(source.data);
  const bounds = symbolBounds(cleaned, source.info.width, source.info.height);
  const cropped = await sharp(cleaned, {
    raw: {
      width: source.info.width,
      height: source.info.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .raw()
    .toBuffer({ resolveWithObject: true });

  console.log(`source: ${source.info.width}x${source.info.height}`);
  console.log(
    `symbol: ${cropped.info.width}x${cropped.info.height} at ${bounds.left},${bounds.top}`,
  );

  const standard = await squareCanvas(
    cropped.data,
    cropped.info.width,
    cropped.info.height,
    STANDARD_MARGIN,
  );
  const small = await squareCanvas(
    cropped.data,
    cropped.info.width,
    cropped.info.height,
    SMALL_MARGIN,
  );

  const sizes = [16, 32, 48];
  const icoImages = [];

  for (const size of sizes) {
    const data = await pngBuffer(small, size, false, true);
    icoImages.push({ size, data });
  }

  await writeFile(path.join(publicDir, 'favicon-16x16.png'), icoImages[0].data);
  await writeFile(path.join(publicDir, 'favicon-32x32.png'), icoImages[1].data);
  await writeFile(path.join(publicDir, 'favicon.ico'), buildIco(icoImages));

  await writeFile(path.join(publicDir, 'icon-192.png'), await pngBuffer(standard, 192, true));
  await writeFile(path.join(publicDir, 'icon-512.png'), await pngBuffer(standard, 512, true));

  const symbolWidth = Math.round(180 * 0.7);
  const appleSymbol = await sharp(cropped.data, {
    raw: {
      width: cropped.info.width,
      height: cropped.info.height,
      channels: 4,
    },
  })
    .resize({ width: symbolWidth, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const appleSymbolMeta = await sharp(appleSymbol).metadata();
  const apple = await sharp({
    create: { width: 180, height: 180, channels: 4, background: LIGHT_BG },
  })
    .composite([
      {
        input: appleSymbol,
        left: Math.round((180 - symbolWidth) / 2),
        top: Math.round((180 - (appleSymbolMeta.height ?? 0)) / 2),
      },
    ])
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: true,
      colours: 256,
      quality: 90,
      effort: 8,
    })
    .toBuffer();
  await writeFile(path.join(publicDir, 'apple-touch-icon.png'), apple);

  const files = [
    'favicon.ico',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
  ];
  const sizesOut = {};
  for (const name of files) sizesOut[name] = await report(name);

  const limits = {
    'favicon.ico': 15_000,
    'favicon-16x16.png': 20_000,
    'favicon-32x32.png': 20_000,
    'apple-touch-icon.png': 20_000,
    'icon-192.png': 20_000,
    'icon-512.png': 20_000,
  };
  const oversized = Object.entries(sizesOut).filter(([name, size]) => size > limits[name]);
  if (oversized.length > 0) {
    throw new Error(`Oversized favicon assets: ${oversized.map(([name]) => name).join(', ')}`);
  }
}

await main();
