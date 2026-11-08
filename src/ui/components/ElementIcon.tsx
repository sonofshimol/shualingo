/**
 * The classical alchemical element symbols, drawn as SVG so they work offline in every font:
 * ignis △, aer △ with a bar, aqua ▽, terra ▽ with a bar, aether ★ (the fifth element),
 * and the mystic lux ☉, umbra ☾, spiritus ☿.
 * The shape alone identifies the element, so it stays readable on a black-and-white screen.
 */
import { elementById } from '../../content';

const PATHS: Record<string, string> = {
  ignis: 'M12 3 L21.5 20 L2.5 20 Z',
  aer: 'M12 3 L21.5 20 L2.5 20 Z',
  aqua: 'M2.5 4 L21.5 4 L12 21 Z',
  terra: 'M2.5 4 L21.5 4 L12 21 Z',
  aether: 'M12 2.5 L14.6 9.3 L21.8 9.5 L16.1 14 L18.1 21 L12 17 L5.9 21 L7.9 14 L2.2 9.5 L9.4 9.3 Z',
};
const BARS: Record<string, [number, number, number]> = {
  aer: [0.5, 13.5, 23.5],
  terra: [0.5, 10.5, 23.5],
};

/** Mystic elements: lux ☉ (circle with a dot), umbra ☾ (crescent), spiritus ☿ (Mercury's sign). */
function MysticShape({ id, color }: { id: string; color: string }) {
  const stroke = { stroke: color, strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const };
  if (id === 'lux') {
    return (
      <>
        <circle cx="12" cy="12" r="9" fill={color} fillOpacity={0.3} stroke={color} strokeWidth={2.2} />
        <circle cx="12" cy="12" r="2.4" fill={color} />
      </>
    );
  }
  if (id === 'umbra') return <path d="M15.5 3.5 A9 9 0 1 0 15.5 20.5 A7 7 0 1 1 15.5 3.5 Z" fill={color} fillOpacity={0.35} stroke={color} strokeWidth={2.2} strokeLinejoin="round" />;
  return (
    <>
      <path d="M7.5 2.5 A4.5 4.5 0 0 0 16.5 2.5" {...stroke} />
      <circle cx="12" cy="9.5" r="4.5" {...stroke} fill={color} fillOpacity={0.3} />
      <line x1="12" y1="14" x2="12" y2="22" {...stroke} />
      <line x1="8.5" y1="18.5" x2="15.5" y2="18.5" {...stroke} />
    </>
  );
}

export function ElementIcon({ id, size = 18, title }: { id: string; size?: number; title?: string }) {
  const color = elementById.get(id)?.color ?? '#ccc';
  const bar = BARS[id];
  if (id === 'lux' || id === 'umbra' || id === 'spiritus') {
    return (
      <svg className="element-icon" width={size} height={size} viewBox="0 0 24 24" role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
        <MysticShape id={id} color={color} />
      </svg>
    );
  }
  return (
    <svg
      className="element-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={PATHS[id] ?? PATHS.aether} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={2.2} strokeLinejoin="round" />
      {bar && <line x1={bar[0]} y1={bar[1]} x2={bar[2]} y2={bar[1]} stroke={color} strokeWidth={2.2} strokeLinecap="round" />}
    </svg>
  );
}
