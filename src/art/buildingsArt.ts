/**
 * Procedural pixel art for the stage-2 camp: tower, library, spring, garden, tree, tent levels,
 * the fox's rank outfits and the light spell. Every rect is whole pixels on the 192×144 scene.
 */
import type { RankId } from '../content/types';

type Ctx = CanvasRenderingContext2D;

export function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** turris — stone tower with a violet roof and a glowing window. Top-left at (x, y), 14×40. */
export function drawTower(ctx: Ctx, x: number, y: number, frame: number) {
  const roof = ['#9b6be0', '#6f45b8'];
  for (let r = 0; r < 12; r += 1) {
    const half = Math.floor(r / 2) + 1;
    for (let c = -half; c < half; c += 1) px(ctx, c < 0 ? roof[0] : roof[1], x + 7 + c, y + r);
  }
  px(ctx, '#ffd84d', x + 6, y - 2, 2, 2); // star on top
  for (let r = 12; r < 40; r += 1) {
    for (let c = 1; c < 13; c += 1) {
      const brick = ((r >> 1) + (c >> 2) + (r % 4 < 2 ? 0 : 1)) % 2 === 0;
      px(ctx, c > 9 ? '#5d6075' : brick ? '#9a9db0' : '#868a9e', x + c, y + r);
    }
  }
  for (let c = 0; c < 14; c += 2) px(ctx, '#868a9e', x + c, y + 11, 1, 1);
  const glow = frame % 4 < 2 ? '#e2b6ff' : '#c77dff';
  px(ctx, glow, x + 5, y + 16, 3, 5); // window
  px(ctx, glow, x + 5, y + 26, 3, 4);
  px(ctx, '#3b2a1a', x + 5, y + 34, 4, 6); // door
  px(ctx, '#ffd84d', x + 8, y + 37);
}

/** bibliotheca — wooden hut with a red roof and coloured book spines. 22×17. */
export function drawLibrary(ctx: Ctx, x: number, y: number) {
  for (let r = 0; r < 7; r += 1) {
    for (let c = 6 - r; c < 16 + r; c += 1) px(ctx, r === 6 ? '#7a2a22' : (c + r) % 3 === 0 ? '#a83a2c' : '#c4483a', x + c, y + r);
  }
  for (let r = 7; r < 17; r += 1) for (let c = 1; c < 21; c += 1) px(ctx, c % 5 === 0 ? '#6b4423' : '#a8743f', x + c, y + r);
  px(ctx, '#2a1d14', x + 4, y + 9, 8, 6); // shelf window
  const spines = ['#ff5a36', '#3fa0ff', '#ffd84d', '#79c447', '#c77dff', '#ff9ad5', '#f6efe2'];
  spines.forEach((color, i) => px(ctx, color, x + 4 + i, y + 10, 1, 4));
  px(ctx, '#3b2a1a', x + 14, y + 10, 4, 7); // door
}

/** fōns — ring of stones with sparkling water. 20×9. */
export function drawSpring(ctx: Ctx, x: number, y: number, frame: number) {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 20; c += 1) {
      const d = ((c - 9.5) / 10) ** 2 + ((r - 4) / 4.5) ** 2;
      if (d > 1) continue;
      const inner = d < 0.55;
      px(ctx, inner ? ((c + r + frame) % 7 === 0 ? '#c8f0ff' : '#3fa0ff') : (c + r) % 2 ? '#8b8fa3' : '#6d7187', x + c, y + r);
    }
  }
  px(ctx, '#ffffff', x + 7 + (frame % 3) * 2, y + 3);
}

/** hortus — garden beds with herbs and flowers. 28×12. */
export function drawGarden(ctx: Ctx, x: number, y: number, frame: number) {
  const flowers = ['#ff5a36', '#ffd84d', '#c77dff', '#ff9ad5', '#ffffff'];
  for (let bed = 0; bed < 2; bed += 1) {
    const by = y + 3 + bed * 5;
    px(ctx, '#6b4423', x, by + 2, 28, 3);
    px(ctx, '#4a2e17', x, by + 4, 28, 1);
    for (let c = 1; c < 27; c += 3) {
      const sway = (frame + c) % 4 === 0 ? 1 : 0;
      px(ctx, '#3fae4a', x + c + sway, by, 1, 2);
      px(ctx, '#79c447', x + c - 1, by + 1, 3, 1);
      px(ctx, flowers[(c + bed) % flowers.length], x + c + sway, by - 1);
    }
  }
  px(ctx, '#8a5a2b', x - 1, y + 2, 1, 10); // fence posts
  px(ctx, '#8a5a2b', x + 28, y + 2, 1, 10);
}

/** The tree (arbor) in four stages, base centred at (cx, baseY). */
export function drawTree(ctx: Ctx, cx: number, baseY: number, stage: number, frame: number) {
  const sizes = [
    { trunk: 4, r: 3 },
    { trunk: 6, r: 6 },
    { trunk: 8, r: 9 },
    { trunk: 10, r: 12 },
  ];
  const { trunk, r } = sizes[Math.max(0, Math.min(3, stage))];
  px(ctx, '#6b4423', cx - (stage > 1 ? 1 : 0), baseY - trunk, stage > 1 ? 3 : 1, trunk);
  const cy = baseY - trunk - r + 2;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const d = (dx * dx) / (r * r) + (dy * dy) / (r * r * 0.8);
      if (d > 1) continue;
      const shade = dx + dy > r * 0.4 ? '#2f7a3a' : (dx * 3 + dy * 5) % 7 === 0 ? '#9be36a' : '#4caf50';
      px(ctx, shade, cx + dx, cy + dy);
    }
  }
  if (stage >= 3) {
    // golden fruit glowing — the fully grown tree of the camp
    const fruit = frame % 2 ? '#ffd84d' : '#fff2a8';
    [[-5, -2], [4, -5], [6, 3], [-3, 5], [0, -8]].forEach(([dx, dy]) => px(ctx, fruit, cx + dx, cy + dy, 2, 2));
  }
}

/** Tent extras by level: a pennant at level 2, a second small tent at level 3. */
export function drawTentExtras(ctx: Ctx, x: number, y: number, level: number, frame: number) {
  if (level >= 2) {
    px(ctx, '#5a3a1e', x + 10, y - 7, 1, 7);
    px(ctx, frame % 2 ? '#ff5a36' : '#ff7a50', x + 11, y - 7, 4, 2);
    px(ctx, '#ff5a36', x + 11, y - 5, 2, 1);
  }
  if (level >= 3) {
    for (let r = 0; r < 7; r += 1) {
      for (let c = 6 - r; c <= 6 + r; c += 1) px(ctx, c < 6 ? '#3fa0ff' : '#2a6fc0', x + 20 + c, y + 4 + r);
    }
    px(ctx, '#173a66', x + 25, y + 8, 3, 3);
  }
}

/** An empty plot: tilled soil marking where something can be built. */
export function drawPlot(ctx: Ctx, x: number, y: number, w: number, h: number) {
  for (let r = 0; r < h; r += 1) for (let c = 0; c < w; c += 1) if ((r + c) % 3 === 0) px(ctx, '#3a5a34', x + c, y + r);
}

/** Lanterns floating over the camp while Lūcem fac! is active. */
export function drawLanterns(ctx: Ctx, frame: number) {
  const spots = [[30, 40], [70, 34], [110, 40], [150, 30], [52, 58], [128, 60], [92, 50]];
  spots.forEach(([x, y], i) => {
    const bob = (frame + i) % 4 < 2 ? 0 : 1;
    px(ctx, '#fff2a8', x, y + bob, 2, 2);
    px(ctx, 'rgba(255,242,168,0.35)', x - 1, y + bob - 1, 4, 4);
  });
}

/** The fox's outfit colours per rank (hat and accents). */
export const RANK_PALETTE: Record<RankId, Record<string, string>> = {
  discipula: { p: '#7b5cc0', P: '#4f3787', y: '#f2d65c' },
  maga: { p: '#3f8cf0', P: '#2559b0', y: '#fff2a8' },
  magistra: { p: '#d6334f', P: '#8f1f36', y: '#ffd84d' },
};

/** Cape and staff drawn around the fox for higher ranks. fx,fy = fox top-left, facing left. */
export function drawRankGear(ctx: Ctx, fx: number, fy: number, rank: RankId, frame: number) {
  if (rank === 'discipula') return;
  const cape = rank === 'maga' ? '#2559b0' : '#ffd84d';
  for (let r = 15; r < 21; r += 1) {
    px(ctx, cape, fx + 2, fy + r);
    px(ctx, cape, fx + 13, fy + r);
  }
  if (rank === 'magistra') {
    px(ctx, '#7a4a24', fx + 16, fy + 6, 1, 16); // staff
    px(ctx, frame % 2 ? '#c77dff' : '#e2b6ff', fx + 15, fy + 3, 3, 3); // orb
  }
}
