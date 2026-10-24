// WCAG AA contrast check for DevCode theme tokens.
// Usage: node scripts/contrast.mjs   (exits non-zero when a pair falls below its required ratio)

import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');

function parseBlock(block) {
  const tokens = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+);/g)) {
    tokens[match[1].slice(2)] = match[2].trim();
  }
  return tokens;
}

const darkMarker = "[data-theme='dark'] {";
const light = parseBlock(css.slice(css.indexOf(':root {'), css.indexOf(darkMarker)));
const dark = { ...light, ...parseBlock(css.slice(css.indexOf(darkMarker))) };

function parseColor(value) {
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = [...hex].map((char) => char + char).join('');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return [r, g, b, 1];
  }
  const match = value.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!match) throw new Error(`Unsupported color value: ${value}`);
  return [+match[1], +match[2], +match[3], match[4] === undefined ? 1 : +match[4]];
}

function token(tokens, name) {
  if (!tokens[name]) throw new Error(`Missing token --${name}`);
  return parseColor(tokens[name]);
}

function composite(layer, background) {
  const alpha = layer[3];
  const rgb = [0, 1, 2].map((i) =>
    Math.round(layer[i] * alpha + background[i] * (1 - alpha)),
  );
  return [rgb[0], rgb[1], rgb[2], 1];
}

function luminance(color) {
  const [r, g, b] = color.slice(0, 3).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

// [label, foreground, background, required] — background may be a soft (translucent)
// token plus an opaque base, expressed as "layer/base".
const checks = [
  ['teal-text on bg (hero accent, large)', 'teal-text', 'bg', 3.0],
  ['teal-text on teal-soft/surface (info tag)', 'teal-text', 'teal-soft/surface', 4.5],
  ['success on success-soft/surface (success tag)', 'success', 'success-soft/surface', 4.5],
  ['warn on warn-soft/surface (warn tag)', 'warn', 'warn-soft/surface', 4.5],
  ['muted on bg', 'muted', 'bg', 4.5],
  ['muted on nav-bg/bg (navbar links)', 'muted', 'nav-bg/bg', 4.5],
  ['muted on nav-bg/section-dark (navbar over dark band)', 'muted', 'nav-bg/section-dark', 4.5],
  ['muted on surface-alt', 'muted', 'surface-alt', 4.5],
  ['daily title on card (large)', 'heading', 'surface', 3.0],
  ['daily description on card', 'muted', 'surface', 4.5],
  ['daily category tag on card', 'link', 'blue-soft/surface', 4.5],
  ['daily info tag on card', 'teal-text', 'teal-soft/surface', 4.5],
  ['daily success tag on card', 'success', 'success-soft/surface', 4.5],
  ['daily button label on primary', 'on-primary', 'primary', 4.5],
  ['daily code text on code-bg', 'code-ink', 'code-bg', 4.5],
];

function measure(tokens, foreground, background) {
  if (background.includes('/')) {
    const [layerName, baseName] = background.split('/');
    return ratio(token(tokens, foreground), composite(token(tokens, layerName), token(tokens, baseName)));
  }
  return ratio(token(tokens, foreground), token(tokens, background));
}

let failed = 0;

console.log('DevCode contrast check (WCAG AA)\n');
console.log('theme  pair                                             ratio   needed  status');
console.log('-'.repeat(82));

for (const [themeName, tokens] of [['light', light], ['dark', dark]]) {
  for (const [label, foreground, background, required] of checks) {
    let value;
    let status;
    try {
      value = measure(tokens, foreground, background);
      status = value >= required ? 'pass' : 'FAIL';
    } catch (error) {
      value = null;
      status = `FAIL (${error.message})`;
    }
    if (status !== 'pass') failed += 1;
    const ratioText = value === null ? '  n/a' : value.toFixed(2).padStart(5);
    console.log(
      `${themeName.padEnd(6)} ${label.padEnd(48)} ${ratioText}   ${required.toFixed(1).padStart(4)}   ${status}`,
    );
  }
}

console.log('-'.repeat(82));
console.log(`${checks.length * 2 - failed} passed, ${failed} failed`);
process.exitCode = failed === 0 ? 0 : 1;
