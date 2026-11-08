import { useState } from 'react';
import { elementById } from '../../content';
import { BASE_ELEMENTS, MYSTIC_ELEMENTS, type ElementId } from '../../content/types';
import type { ElementDelta } from '../../game/elements';
import type { ElementBag } from '../../game/state';
import { ElementIcon } from './ElementIcon';
import { useOpenWord } from './La';
import { Sheet } from './Sheet';

/** An element amount: symbol + Latin name + number. Colour is extra; the symbol carries the meaning. */
export function ElementChip({ id, amount, onClick, pulse }: { id: ElementId; amount: number; onClick?: () => void; pulse?: boolean }) {
  const def = elementById.get(id);
  const content = (
    <>
      <ElementIcon id={id} />
      <span className="element-name" lang="la" dir="ltr">{id}</span>
      <span className="element-amount">{amount}</span>
    </>
  );
  const style = { '--el': def?.color } as React.CSSProperties;
  if (onClick) {
    return (
      <button type="button" className={`element-chip ${pulse ? 'pulse' : ''}`} style={style} onClick={onClick} aria-label={`${id} (${def?.name_he}): ${amount}`}>
        {content}
      </button>
    );
  }
  return (
    <span className="element-chip" style={style} title={`${id} — ${def?.name_he}`}>
      {content}
    </span>
  );
}

/** What an element is, where it comes from and what it is for. Opened by tapping a chip. */
export function ElementSheet({ id, onClose }: { id: ElementId; onClose: () => void }) {
  const def = elementById.get(id)!;
  const openWord = useOpenWord();
  return (
    <Sheet title="אלמנט" onClose={onClose}>
      <div className="element-sheet" style={{ '--el': def.color } as React.CSSProperties}>
        <ElementIcon id={id} size={64} />
        <div className="word-lemma" dir="ltr" lang="la">{id}</div>
        <div className="word-meaning">{def.name_he}</div>
        <p className="muted small">הסמל הקלאסי: {def.symbol_he}</p>
        <dl className="relatives">
          <div className="relative-row"><dt>מאיפה</dt><dd>{def.source_he}</dd></div>
          <div className="relative-row"><dt>למה</dt><dd>{def.use_he}</dd></div>
        </dl>
        <button type="button" className="secondary wide" onClick={() => { onClose(); openWord(id); }}>
          משפחת המילה <span lang="la" dir="ltr">{id}</span>
        </button>
      </div>
    </Sheet>
  );
}

export function ElementBar({ elements, pulse = [], mystic }: { elements: ElementBag; pulse?: ElementId[]; mystic?: ElementId[] }) {
  const [open, setOpen] = useState<ElementId | null>(null);
  const shownMystic = MYSTIC_ELEMENTS.filter((id) => mystic?.includes(id) || (elements[id] ?? 0) > 0);
  return (
    <>
      <div className="element-bar" aria-label="האלמנטים שלך (הקישו להסבר)">
        {BASE_ELEMENTS.map((id) => (
          <ElementChip key={id} id={id} amount={elements[id]} onClick={() => setOpen(id)} pulse={pulse.includes(id)} />
        ))}
      </div>
      {shownMystic.length > 0 && (
        <div className="element-bar mystic" aria-label="האלמנטים המיסטיים">
          {shownMystic.map((id) => (
            <ElementChip key={id} id={id} amount={elements[id] ?? 0} onClick={() => setOpen(id)} pulse={pulse.includes(id)} />
          ))}
        </div>
      )}
      {open && <ElementSheet id={open} onClose={() => setOpen(null)} />}
    </>
  );
}

export function ElementList({ delta, pop = false }: { delta: ElementDelta; pop?: boolean }) {
  const entries = (Object.entries(delta) as [ElementId, number][]).filter(([, v]) => v);
  if (!entries.length) return <span className="muted">אין</span>;
  return (
    <span className="element-list">
      {entries.map(([id, amount], i) => (
        <span key={id} className={pop ? 'pop-in' : ''} style={pop ? { animationDelay: `${i * 0.15}s` } : undefined}>
          <ElementChip id={id} amount={amount} />
        </span>
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
