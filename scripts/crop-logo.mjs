import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'src', 'assets', 'devcode.png');
const outDir = path.join(root, 'src', 'assets', 'logo');

const DISPLAY_HEIGHT = 40;
const MARGIN = 2;
const DARK_BLUE = { r: 76, g: 155, b: 255 };
const DARK_MUTED = { r: 148, g: 169, b: 204 };

function alphaBounds(data, width, height) {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }

  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const delta = max - min;
  let hue = 0;

  if (delta !== 0) {
    if (max === r / 255) hue = ((g - b) / 255 / delta) % 6;
    else if (max === g / 255) hue = (b - r) / 255 / delta + 2;
    else hue = (r - g) / 255 / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return { hue, saturation: max === 0 ? 0 : delta / max, value: max };
}

function darkVariant(data, width, height) {
  const out = Buffer.from(data);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const alpha = out[offset + 3];
      if (alpha === 0) continue;

      const { hue, saturation, value } = rgbToHsv(out[offset], out[offset + 1], out[offset + 2]);

      const isBlue = hue >= 180 && hue <= 250 && saturation >= 0.3 && value >= 0.15;
      const isTagline = y >= height * 0.72 && saturation < 0.3;

      if (isBlue) {
        out[offset] = DARK_BLUE.r;
        out[offset + 1] = DARK_BLUE.g;
        out[offset + 2] = DARK_BLUE.b;
      } else if (isTagline) {
        out[offset] = DARK_MUTED.r;
        out[offset + 1] = DARK_MUTED.g;
        out[offset + 2] = DARK_MUTED.b;
      }
    }
  }

  return out;
}

function render(data, width, height, scale) {
  const targetHeight = DISPLAY_HEIGHT * scale;
  const padding = MARGIN * scale;
  const contentHeight = targetHeight - padding * 2;
  const contentWidth = Math.max(1, Math.round((width * contentHeight) / height));

  return sharp(data, { raw: { width, height, channels: 4 } })
    .resize(contentWidth, contentHeight, { fit: 'fill', kernel: 'lanczos3' })
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
}

async function writeAsset(name, data, width, height, scale) {
  const image = render(data, width, height, scale);
  const pngPath = path.join(outDir, `${name}.png`);
  const webpPath = path.join(outDir, `${name}.webp`);

  await image.clone().png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(pngPath);
  await image.clone().webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(webpPath);

  const png = await stat(pngPath);
  const webp = await stat(webpPath);
  console.log(`${name}: PNG ${png.size} B, WebP ${webp.size} B`);

  return { pngPath, webpPath, png: png.size, webp: webp.size };
}

async function main() {
  await mkdir(outDir, { recursive: true });

  const source = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(source.data, source.info.width, source.info.height);
  const trimmed = await sharp(source.data, {
    raw: {
      width: source.info.width,
      height: source.info.height,
      channels: 4,
    },
  })
    .extract(bounds)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = trimmed.info;
  console.log(`source: ${source.info.width}x${source.info.height}`);
  console.log(`trimmed: ${width}x${height} at ${bounds.left},${bounds.top}`);

  const darkData = darkVariant(trimmed.data, width, height);
  const sizes = [];

  for (const scale of [1, 2]) {
    const suffix = scale === 2 ? '@2x' : '';
    sizes.push(await writeAsset(`devcode-logo${suffix}`, trimmed.data, width, height, scale));
    sizes.push(await writeAsset(`devcode-logo-dark${suffix}`, darkData, width, height, scale));
  }

  const oversized = sizes.filter(({ png, webp }) => png >= 30_000 || webp >= 30_000);
  if (oversized.length > 0) {
    console.warn(`warning: ${oversized.length} file(s) are 30 KB or larger`);
  }
}

await main();
