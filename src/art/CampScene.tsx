/** The forest camp (silva): night sky, pines, tent, fire, spell circle and the fox. */
import { useEffect, useRef, useState } from 'react';
import type { FireLevel } from '../game/camp';
import { drawSprite, ellipsePoints, seeded, spriteSize } from './draw';
import { FIRE, FOX, LOG_PILE, PINE, TENT } from './sprites';

export const SCENE_W = 160;
export const SCENE_H = 120;

const FIRE_POS = { x: 74, y: 72 };
const FOX_POS = { x: 92, y: 62 };
const TENT_POS = { x: 14, y: 52 };
const CIRCLE = { cx: 46, cy: 98, rx: 20, ry: 6 };

const GLOW_RADIUS: Record<FireLevel, number> = { out: 0, embers: 10, small: 22, big: 34 };

function drawScene(ctx: CanvasRenderingContext2D, fire: FireLevel, circleActive: boolean, frame: number) {
  // Sky
  const sky = ['#0c1124', '#10162d', '#141b36', '#18203f', '#1c2546'];
  sky.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, i * 12, SCENE_W, 12);
  });
  const rand = seeded(7);
  for (let i = 0; i < 40; i += 1) {
    const x = Math.floor(rand() * SCENE_W);
    const y = Math.floor(rand() * 48);
    const twinkle = (i + frame) % 7 === 0;
    ctx.fillStyle = twinkle ? '#ffffff' : rand() > 0.5 ? '#c9d3ff' : '#8a93c4';
    ctx.fillRect(x, y, 1, 1);
  }
  // Moon (luna)
  ctx.fillStyle = '#f3ecd0';
  for (let dy = -6; dy <= 6; dy += 1) {
    for (let dx = -6; dx <= 6; dx += 1) {
      if (dx * dx + dy * dy <= 36 && (dx - 3) * (dx - 3) + (dy + 1) * (dy + 1) > 20) ctx.fillRect(132 + dx, 14 + dy, 1, 1);
    }
  }

  // Far forest silhouette
  ctx.fillStyle = '#0f1f1a';
  const far = seeded(3);
  for (let x = 0; x < SCENE_W; x += 1) {
    const h = 6 + Math.floor(Math.abs(Math.sin(x * 0.35)) * 8 + far() * 3);
    ctx.fillRect(x, 58 - h, 1, h + 4);
  }
  // Ground
  const ground = ['#1d3324', '#1f3727', '#213b2a', '#233f2c', '#24422e'];
  ground.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 58 + i * 13, SCENE_W, 13);
  });
  const grass = seeded(11);
  ctx.fillStyle = '#2d5236';
  for (let i = 0; i < 90; i += 1) ctx.fillRect(Math.floor(grass() * SCENE_W), 60 + Math.floor(grass() * 60), 1, 1);

  // Firelight on the ground (dithered circle)
  const glow = GLOW_RADIUS[fire] + (fire !== 'out' && frame % 2 ? 1 : 0);
  const fcx = FIRE_POS.x + 6;
  const fcy = FIRE_POS.y + 12;
  if (glow > 0) {
    for (let dy = -glow; dy <= glow; dy += 1) {
      for (let dx = -glow * 1.4; dx <= glow * 1.4; dx += 1) {
        const d = (dx / 1.4) ** 2 + (dy * 1.6) ** 2;
        if (d > glow * glow) continue;
        const inner = d < (glow * 0.55) ** 2;
        if (!inner && (Math.round(dx) + dy) % 2 !== 0) continue;
        ctx.fillStyle = inner ? 'rgba(246,162,58,0.22)' : 'rgba(246,162,58,0.12)';
        ctx.fillRect(Math.round(fcx + dx), fcy + dy, 1, 1);
      }
    }
  }

  // Spell circle (circulus)
  const ring = ellipsePoints(CIRCLE.cx, CIRCLE.cy, CIRCLE.rx, CIRCLE.ry);
  ring.forEach(([x, y], i) => {
    ctx.fillStyle = circleActive ? ((i + frame) % 9 === 0 ? '#ffffff' : '#8fd3ff') : '#3e5a7a';
    ctx.fillRect(x, y, 1, 1);
  });
  const runes: [number, number][] = [[-12, 0], [12, 0], [0, -3], [0, 3], [-6, -2], [6, 2]];
  runes.forEach(([dx, dy]) => {
    ctx.fillStyle = circleActive ? '#c8ecff' : '#2f4660';
    ctx.fillRect(CIRCLE.cx + dx, CIRCLE.cy + dy, 1, 1);
  });

  // Back pines
  drawSprite(ctx, PINE, 2, 40);
  drawSprite(ctx, PINE, 140, 38);
  drawSprite(ctx, PINE, 124, 46);

  drawSprite(ctx, TENT, TENT_POS.x, TENT_POS.y);
  drawSprite(ctx, LOG_PILE, 110, 86);

  // Fire (focus)
  if (fire === 'out') {
    drawSprite(ctx, ['............', '............', '..bB.BbB....', '.sBbbbbbBs..', 'ss.......ss.'], FIRE_POS.x, FIRE_POS.y + 7);
  } else {
    const sprite = FIRE[fire][frame % 2];
    drawSprite(ctx, sprite, FIRE_POS.x, FIRE_POS.y + 12 - spriteSize(sprite).h + 0);
  }

  // The fox sits on the right of the fire, facing it.
  drawSprite(ctx, FOX, FOX_POS.x, FOX_POS.y, { flip: true });

  // Front pines frame the scene
  drawSprite(ctx, PINE, -6, 92);
  drawSprite(ctx, PINE, 150, 96);
}

export interface Hotspot {
  id: 'fire' | 'tent' | 'circle' | 'fox';
  label: string;
}

const HOTSPOT_BOX: Record<Hotspot['id'], { x: number; y: number; w: number; h: number }> = {
  fire: { x: FIRE_POS.x - 4, y: FIRE_POS.y - 2, w: 20, h: 18 },
  tent: { x: TENT_POS.x, y: TENT_POS.y, w: 22, h: 12 },
  circle: { x: CIRCLE.cx - CIRCLE.rx, y: CIRCLE.cy - CIRCLE.ry - 2, w: CIRCLE.rx * 2, h: CIRCLE.ry * 2 + 4 },
  fox: { x: FOX_POS.x, y: FOX_POS.y, w: 18, h: 22 },
};

export function CampScene(props: {
  fire: FireLevel;
  circleActive: boolean;
  hotspots: Hotspot[];
  onHotspot: (id: Hotspot['id']) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const id = window.setInterval(() => setFrame((f) => f + 1), 450);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SCENE_W, SCENE_H);
    drawScene(ctx, props.fire, props.circleActive, frame);
  }, [props.fire, props.circleActive, frame]);

  return (
    <div className="camp-scene">
      <canvas ref={canvas} width={SCENE_W} height={SCENE_H} className="pixel" role="img" aria-label="המחנה של השועלה ביער: אוהל, מדורה ומעגל לחשים" />
      {props.hotspots.map((spot) => {
        const box = HOTSPOT_BOX[spot.id];
        return (
          <button
            key={spot.id}
            type="button"
            className="hotspot"
            aria-label={spot.label}
            title={spot.label}
            style={{
              left: `${(box.x / SCENE_W) * 100}%`,
              top: `${(box.y / SCENE_H) * 100}%`,
              width: `${(box.w / SCENE_W) * 100}%`,
              height: `${(box.h / SCENE_H) * 100}%`,
            }}
            onClick={() => props.onHotspot(spot.id)}
          />
        );
      })}
    </div>
  );
}

/** A single sprite as a small canvas (fox avatar on lesson screens). */
export function SpriteView({ sprite, scale = 4, flip = false, label }: { sprite: string[]; scale?: number; flip?: boolean; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { w, h } = spriteSize(sprite);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    drawSprite(ctx, sprite, 0, 0, { flip });
  }, [sprite, flip, w, h]);
  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      className="pixel"
      style={{ width: w * scale, height: h * scale }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
