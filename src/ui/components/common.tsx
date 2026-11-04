import { elementById } from '../../content';
import { BASE_ELEMENTS, type ElementId } from '../../content/types';
import type { ElementDelta } from '../../game/elements';
import type { ElementBag } from '../../game/state';

export function ElementChip({ id, amount, showName = true }: { id: ElementId; amount: number; showName?: boolean }) {
  const def = elementById.get(id);
  return (
    <span className="element-chip" title={def ? `${id} — ${def.name_he}: ${def.source_he}` : id}>
      <span className="gem" style={{ background: def?.color }} aria-hidden="true" />
      {showName && <span className="element-name">{def?.name_he}</span>}
      <span className="element-amount">{amount}</span>
    </span>
  );
}

export function ElementBar({ elements }: { elements: ElementBag }) {
  return (
    <div className="element-bar" aria-label="האלמנטים שלך">
      {BASE_ELEMENTS.map((id) => (
        <ElementChip key={id} id={id} amount={elements[id]} />
      ))}
    </div>
  );
}

export function ElementList({ delta }: { delta: ElementDelta }) {
  const entries = (Object.entries(delta) as [ElementId, number][]).filter(([, v]) => v);
  if (!entries.length) return <span className="muted">אין</span>;
  return (
    <span className="element-list">
      {entries.map(([id, amount]) => (
        <ElementChip key={id} id={id} amount={amount} />
      ))}
    </span>
  );
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function Countdown({ until, now }: { until: number; now: number }) {
  return (
    <span className="countdown" dir="ltr" role="timer">
      {formatCountdown(until - now)}
    </span>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}>
      <div className="progress-fill" style={{ width: `${value * 100}%` }} />
    </div>
  );
}
