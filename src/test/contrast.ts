export interface TokenThemes {
  light: Record<string, string>;
  dark: Record<string, string>;
}

export type Rgba = [number, number, number, number];

function parseBlock(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+);/g)) {
    tokens[match[1].slice(2)] = match[2].trim();
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
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return [r, g, b, 1];
  }
  const match = value.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (!match) throw new Error(`Unsupported color value: ${value}`);
  return [+match[1], +match[2], +match[3], match[4] === undefined ? 1 : +match[4]];
}

export function token(tokens: Record<string, string>, name: string): Rgba {
  const value = tokens[name];
  if (!value) throw new Error(`Missing token --${name}`);
  return parseColor(value);
}

/** Alpha-composites a (possibly translucent) layer over an opaque background. */
export function composite(layer: Rgba, background: Rgba): Rgba {
  const alpha = layer[3];
  const rgb = [0, 1, 2].map((i) =>
    Math.round(layer[i] * alpha + background[i] * (1 - alpha)),
  );
  return [rgb[0], rgb[1], rgb[2], 1];
}

export function relativeLuminance(color: Rgba): number {
  const [r, g, b] = color.slice(0, 3).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
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
