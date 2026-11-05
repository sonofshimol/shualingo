/**
 * The forest camp (silva) as an interactive pixel-art scene.
 * The canvas draws the world; HTML buttons on top handle taps (buildings, harvest bubbles,
 * empty plots, the fox), so everything is reachable by keyboard and screen readers too.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { RankId } from '../content/types';
import type { FireLevel } from '../game/camp';
import type { CampState } from '../game/state';
import {
  drawGarden, drawLanterns, drawLibrary, drawPlot, drawRankGear, drawSpring, drawTentExtras, drawTower, drawTree,
  px, RANK_PALETTE,
} from './buildingsArt';
import { drawSprite, ellipsePoints, seeded, spriteSize } from './draw';
import { FIRE, FOX, LOG_PILE, PALETTE, PINE, TENT } from './sprites';

export const SCENE_W = 192;
export const SCENE_H = 144;

/** Where everything stands (top-left x, y, width, height in scene pixels). */
export const SPOTS = {
  turris: { x: 166, y: 30, w: 14, h: 42 },
  bibliotheca: { x: 30, y: 57, w: 22, h: 17 },
  tentorium: { x: 4, y: 66, w: 22, h: 11 },
  tree: { x: 60, y: 44, w: 26, h: 32 },
  focus: { x: 88, y: 84, w: 14, h: 16 },
  fox: { x: 104, y: 76, w: 18, h: 22 },
  fons: { x: 142, y: 96, w: 20, h: 9 },
  hortus: { x: 128, y: 120, w: 28, h: 13 },
  circulus: { x: 22, y: 112, w: 48, h: 16 },
} as const;
export type SpotId = keyof typeof SPOTS;

const CIRCLE = { cx: 46, cy: 120, rx: 22, ry: 7 };
const GLOW_RADIUS: Record<FireLevel, number> = { out: 0, embers: 10, small: 22, big: 34 };

function drawScene(ctx: CanvasRenderingContext2D, props: SceneProps, frame: number) {
  const { camp, fire, circleActive, lit, rank } = props;
  // Sky: deep blue to violet, brighter when the light spell is active.
  const sky = lit ? ['#1b2350', '#232c63', '#2c3675', '#353f86', '#3e4896'] : ['#0e1330', '#151b42', '#1d2353', '#272a62', '#30306e'];
  sky.forEach((color, i) => px(ctx, color, 0, i * 13, SCENE_W, 13));
  const rand = seeded(7);
  for (let i = 0; i < 55; i += 1) {
    const x = Math.floor(rand() * SCENE_W);
    const y = Math.floor(rand() * 52);
    const twinkle = (i + frame) % 7 === 0;
    px(ctx, twinkle ? '#ffffff' : rand() > 0.5 ? '#c9d3ff' : '#ffd84d', x, y);
  }
  // Moon (luna)
  for (let dy = -7; dy <= 7; dy += 1) {
    for (let dx = -7; dx <= 7; dx += 1) {
      if (dx * dx + dy * dy <= 49 && (dx - 3) ** 2 + (dy + 1) ** 2 > 26) px(ctx, '#fbf3d0', 140 + dx, 15 + dy);
    }
  }
  // Far forest
  const far = seeded(3);
  for (let x = 0; x < SCENE_W; x += 1) {
    const h = 7 + Math.floor(Math.abs(Math.sin(x * 0.33)) * 9 + far() * 3);
    px(ctx, '#123326', x, 64 - h, 1, h + 4);
  }
  // Ground with grass, flowers and mushrooms
  ['#1f4a2c', '#22502f', '#255733', '#285d36', '#2b6339', '#2e693c'].forEach((c, i) => px(ctx, c, 0, 64 + i * 14, SCENE_W, 14));
  const grass = seeded(11);
  for (let i = 0; i < 140; i += 1) px(ctx, grass() > 0.5 ? '#3f8a4a' : '#357a40', Math.floor(grass() * SCENE_W), 66 + Math.floor(grass() * 78));
  const flowers = seeded(19);
  const flowerColors = ['#ff9ad5', '#ffd84d', '#c77dff', '#ffffff', '#ff5a36'];
  for (let i = 0; i < 26; i += 1) {
    const x = Math.floor(flowers() * SCENE_W);
    const y = 70 + Math.floor(flowers() * 72);
    px(ctx, flowerColors[i % flowerColors.length], x, y);
  }
  [[12, 104], [178, 128], [110, 136]].forEach(([x, y]) => {
    px(ctx, '#e0532a', x, y, 3, 1);
    px(ctx, '#ffffff', x + 1, y);
    px(ctx, '#f6efe2', x + 1, y + 1, 1, 2);
  });

  // Firelight
  const glow = GLOW_RADIUS[fire] + (fire !== 'out' && frame % 2 ? 1 : 0);
  const fcx = SPOTS.focus.x + 7;
  const fcy = SPOTS.focus.y + 14;
  for (let dy = -glow; dy <= glow; dy += 1) {
    for (let dx = -glow * 1.4; dx <= glow * 1.4; dx += 1) {
      const d = (dx / 1.4) ** 2 + (dy * 1.6) ** 2;
      if (d > glow * glow) continue;
      const inner = d < (glow * 0.55) ** 2;
      if (!inner && (Math.round(dx) + dy) % 2 !== 0) continue;
      px(ctx, inner ? 'rgba(255,170,60,0.25)' : 'rgba(255,170,60,0.13)', fcx + dx, fcy + dy);
    }
  }

  // Spell circle
  ellipsePoints(CIRCLE.cx, CIRCLE.cy, CIRCLE.rx, CIRCLE.ry).forEach(([x, y], i) => {
    px(ctx, circleActive ? ((i + frame) % 9 === 0 ? '#ffffff' : '#8fd3ff') : '#3e5a7a', x, y);
  });
  [[-13, 0], [13, 0], [0, -4], [0, 4], [-7, -2], [7, 2]].forEach(([dx, dy]) => px(ctx, circleActive ? '#c8ecff' : '#2f4660', CIRCLE.cx + dx, CIRCLE.cy + dy));

  // Back pines
  drawSprite(ctx, PINE, 118, 48);
  drawSprite(ctx, PINE, 150, 50);

  // Buildings (or empty plots)
  const built = (id: string) => Boolean(camp.buildings[id]);
  if (built('turris')) drawTower(ctx, SPOTS.turris.x, SPOTS.turris.y, frame);
  else drawPlot(ctx, SPOTS.turris.x, SPOTS.turris.y + 32, 14, 8);
  if (built('bibliotheca')) drawLibrary(ctx, SPOTS.bibliotheca.x, SPOTS.bibliotheca.y);
  else drawPlot(ctx, SPOTS.bibliotheca.x, SPOTS.bibliotheca.y + 9, 22, 8);
  drawTree(ctx, SPOTS.tree.x + 13, SPOTS.tree.y + SPOTS.tree.h, camp.tree.stage, frame);
  drawSprite(ctx, TENT, SPOTS.tentorium.x, SPOTS.tentorium.y);
  drawTentExtras(ctx, SPOTS.tentorium.x, SPOTS.tentorium.y, camp.buildings.tentorium?.level ?? 1, frame);
  if (built('fons')) drawSpring(ctx, SPOTS.fons.x, SPOTS.fons.y, frame);
  else drawPlot(ctx, SPOTS.fons.x, SPOTS.fons.y, 20, 9);
  if (built('hortus')) drawGarden(ctx, SPOTS.hortus.x, SPOTS.hortus.y, frame);
  else drawPlot(ctx, SPOTS.hortus.x, SPOTS.hortus.y + 2, 28, 10);
  drawSprite(ctx, LOG_PILE, 74, 102);

  // Fire
  if (fire === 'out') {
    drawSprite(ctx, ['............', '............', '..bB.BbB....', '.sBbbbbbBs..', 'ss.......ss.'], SPOTS.focus.x, SPOTS.focus.y + 11);
  } else {
    const sprite = FIRE[fire][frame % 2];
    drawSprite(ctx, sprite, SPOTS.focus.x, SPOTS.focus.y + 16 - spriteSize(sprite).h);
    if (frame % 3 === 0) px(ctx, '#ffd84d', SPOTS.focus.x + 4 + (frame % 5), SPOTS.focus.y - 2 - (frame % 4)); // spark
  }

  // The fox, dressed for her rank. She blinks now and then.
  const blink = frame % 11 === 0;
  const fox = blink ? FOX.map((row, i) => (i === 9 ? row.replace(/[wk]/g, 'o') : row)) : FOX;
  drawRankGear(ctx, SPOTS.fox.x, SPOTS.fox.y, rank, frame);
  drawSprite(ctx, fox, SPOTS.fox.x, SPOTS.fox.y, { flip: true, palette: { ...PALETTE, ...RANK_PALETTE[rank] } });

  if (lit) drawLanterns(ctx, frame);

  // Front pines frame the scene
  drawSprite(ctx, PINE, -6, 108);
  drawSprite(ctx, PINE, 182, 112);
  // Fireflies
  for (let i = 0; i < 6; i += 1) {
    const x = (i * 37 + frame * (i % 2 ? 3 : -2) + 400) % SCENE_W;
    const y = 70 + ((i * 23 + frame * 2) % 60);
    if ((frame + i) % 3 !== 0) px(ctx, '#d6ff7a', x, y);
  }
}

export interface SceneProps {
  camp: CampState;
  fire: FireLevel;
  rank: RankId;
  circleActive: boolean;
  lit: boolean;
  /** Clickable things and their labels. */
  targets: { id: SpotId; label: string }[];
  onTarget: (id: SpotId) => void;
  /** Overlays (bubbles, plots, speech) positioned over scene spots. */
  overlays?: { id: string; spot: SpotId; dy?: number; node: ReactNode }[];
}

export function CampScene(props: SceneProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = window.setInterval(() => setFrame((f) => f + 1), 420);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SCENE_W, SCENE_H);
    drawScene(ctx, props, frame);
  }, [props, frame]);

  const pos = (spot: SpotId, dy = 0) => {
    const s = SPOTS[spot];
    return { left: `${((s.x + s.w / 2) / SCENE_W) * 100}%`, top: `${((s.y + dy) / SCENE_H) * 100}%` };
  };

  return (
    <div className={`camp-scene ${props.lit ? 'lit' : ''}`}>
      <canvas ref={canvas} width={SCENE_W} height={SCENE_H} className="pixel" role="img" aria-label="המחנה של השועלה ביער" />
      {props.targets.map(({ id, label }) => {
        const s = SPOTS[id];
        return (
          <button
            key={id}
            type="button"
            className="hotspot"
            aria-label={label}
            title={label}
            style={{
              left: `${(s.x / SCENE_W) * 100}%`,
              top: `${(s.y / SCENE_H) * 100}%`,
              width: `${(s.w / SCENE_W) * 100}%`,
              height: `${(s.h / SCENE_H) * 100}%`,
            }}
            onClick={() => props.onTarget(id)}
          />
        );
      })}
      {props.overlays?.map((o) => (
        <div key={o.id} className="scene-overlay" style={pos(o.spot, o.dy)}>
          {o.node}
        </div>
      ))}
    </div>
  );
}

/** A single sprite as a small canvas (fox avatar on lesson screens). */
export function SpriteView({ sprite, scale = 4, flip = false, label, rank = 'discipula' }: { sprite: string[]; scale?: number; flip?: boolean; label?: string; rank?: RankId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { w, h } = spriteSize(sprite);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    drawSprite(ctx, sprite, 0, 0, { flip, palette: { ...PALETTE, ...RANK_PALETTE[rank] } });
  }, [sprite, flip, w, h, rank]);
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
