export interface TokenThemes {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export type Rgba = [number, number, number, number];

function parseBlock(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+);/g)) {
    const [, name, value] = match;
    if (name === undefined || value === undefined) continue;
    tokens[name.slice(2)] = value.trim();
  }
  return tokens;
}

/** Splits tokens.css into the light (:root) and merged dark token maps. */
export function parseTokens(css: string): TokenThemes {
  const darkMarker = "[data-theme='dark'] {";
  const lightStart = css.indexOf(':root {');
  const darkStart = css.indexOf(darkMarker);
  const light = parseBlock(css.slice(lightStart, darkStart));
  const dark = { ...light, ...parseBlock(css.slice(darkStart)) };
  return { light, dark };
}

export function parseColor(value: string): Rgba {
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = [...hex].map((char) => char + char).join('');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      1,
    ];
  }
  const match = value.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!match) throw new Error(`Unsupported color value: ${value}`);
  const [, r, g, b, alpha] = match;
  if (r === undefined || g === undefined || b === undefined) {
    throw new Error(`Unsupported color value: ${value}`);
  }
  return [+r, +g, +b, alpha === undefined ? 1 : +alpha];
}

export function token(tokens: Record<string, string>, name: string): Rgba {
  const value = tokens[name];
  if (!value) throw new Error(`Missing token --${name}`);
  return parseColor(value);
}

/** Alpha-composites a (possibly translucent) layer over an opaque background. */
export function composite(layer: Rgba, background: Rgba): Rgba {
  const [layerR, layerG, layerB, alpha] = layer;
  const [bgR, bgG, bgB] = background;
  return [
    Math.round(layerR * alpha + bgR * (1 - alpha)),
    Math.round(layerG * alpha + bgG * (1 - alpha)),
    Math.round(layerB * alpha + bgB * (1 - alpha)),
    1,
  ];
}

export function relativeLuminance(color: Rgba): number {
  const linearize = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = color;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function tokensContrast(
  tokens: Record<string, string>,
  foregroundName: string,
  backgroundName: string,
): number {
  return contrastRatio(token(tokens, foregroundName), token(tokens, backgroundName));
}

/** Foreground vs a translucent token composited over an opaque token. */
export function tokensContrastOnComposite(
  tokens: Record<string, string>,
  foregroundName: string,
  layerName: string,
  backgroundName: string,
): number {
  return contrastRatio(
    token(tokens, foregroundName),
    composite(token(tokens, layerName), token(tokens, backgroundName)),
  );
}
