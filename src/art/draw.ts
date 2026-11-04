/** Tiny pixel renderer on a 2D canvas (1 canvas unit = 1 pixel, scaled up with CSS). */
import { PALETTE, type Sprite } from './sprites';

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  options: { flip?: boolean; palette?: Record<string, string>; alpha?: number } = {},
): void {
  const palette = options.palette ?? PALETTE;
  const width = Math.max(...sprite.map((row) => row.length));
  ctx.globalAlpha = options.alpha ?? 1;
  sprite.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx += 1) {
      const color = palette[row[dx]];
      if (!color) continue;
      const px = options.flip ? x + width - 1 - dx : x + dx;
      ctx.fillStyle = color;
      ctx.fillRect(px, y + dy, 1, 1);
    }
  });
  ctx.globalAlpha = 1;
}

export function spriteSize(sprite: Sprite): { w: number; h: number } {
  return { w: Math.max(...sprite.map((row) => row.length)), h: sprite.length };
}

/** Deterministic pseudo-random numbers so the stars stay in place between frames. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Pixel ellipse outline (for the spell circle). */
export function ellipsePoints(cx: number, cy: number, rx: number, ry: number): [number, number][] {
  const points = new Set<string>();
  const steps = Math.ceil(2 * Math.PI * Math.max(rx, ry) * 2);
  for (let i = 0; i < steps; i += 1) {
    const a = (i / steps) * 2 * Math.PI;
    points.add(`${Math.round(cx + rx * Math.cos(a))},${Math.round(cy + ry * Math.sin(a))}`);
  }
  return [...points].map((p) => p.split(',').map(Number) as [number, number]);
}
