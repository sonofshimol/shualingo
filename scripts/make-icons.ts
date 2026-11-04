/**
 * Draws the app icons (public/icons/*.png) from the fox sprite. Run: npm run icons
 * Uses only Node built-ins: a tiny PNG encoder over zlib.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { FOX, PALETTE } from '../src/art/sprites.ts';

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const BG = hex('#141a2e');
const DISC = hex('#1e2643');

function icon(size: number, fill: number): Buffer {
  const w = Math.max(...FOX.map((r) => r.length));
  const h = FOX.length;
  const scale = Math.floor((size * fill) / Math.max(w, h));
  const ox = Math.floor((size - w * scale) / 2);
  const oy = Math.floor((size - h * scale) / 2);
  return png(size, (x, y) => {
    const sx = Math.floor((x - ox) / scale);
    const sy = Math.floor((y - oy) / scale);
    const ch = FOX[sy]?.[sx];
    if (ch && PALETTE[ch]) return hex(PALETTE[ch]);
    const d = Math.hypot(x - size / 2, y - size / 2);
    return d < size * 0.46 ? DISC : BG;
  });
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', icon(192, 0.72));
writeFileSync('public/icons/icon-512.png', icon(512, 0.72));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, 0.56));
console.log('icons written to public/icons/');
