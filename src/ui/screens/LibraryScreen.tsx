/**
 * ספרייה — famous texts, songs, poems, jokes and wordplay in Latin, line by line.
 * Each line: the Latin (known words open their word card), a hidden Hebrew translation to reveal,
 * and notes. At the end: what the text teaches about the language.
 */
import { useState } from 'react';
import { readingTexts } from '../../content';
import type { ReadingText, TextKind } from '../../content/types';
import { La } from '../components/La';
import { play } from '../feedback/sfx';

const KINDS: { kind: TextKind; icon: string; label: string }[] = [
  { kind: 'joke', icon: '😄', label: 'בדיחות' },
  { kind: 'wordplay', icon: '🔄', label: 'משחקי מילים' },
  { kind: 'quote', icon: '💬', label: 'משפטים מפורסמים' },
  { kind: 'song', icon: '🎵', label: 'שירים' },
  { kind: 'canon', icon: '📜', label: 'טקסטים קנוניים' },
  { kind: 'poem', icon: '✒️', label: 'שירה' },
];

const LEVEL = ['', '● קל', '●● בינוני', '●●● מאתגר'];

// Which texts this device has finished: a convenience only, so browser storage is fine (may be unavailable).
/** Hebrew text with Latin words inside: each Latin run is isolated so the line keeps its order. */
function Mixed({ text }: { text: string }) {
  const parts = text.split(/([A-Za-z\u00C0-\u024F\u1E00-\u1EFF][A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u0300-\u036F' .,!?-]*[A-Za-z\u00C0-\u024F\u1E00-\u1EFF!?]|[A-Za-z\u00C0-\u024F\u1E00-\u1EFF])/u);
  return <>{parts.map((p, i) => (i % 2 ? <bdi key={i} dir="ltr" lang="la">{p}</bdi> : p))}</>;
}

function loadRead(): string[] {
  try {
    return JSON.parse(localStorage.getItem('shualingo-read-texts') ?? '[]');
  } catch {
    return [];
  }
}
function saveRead(ids: string[]) {
  try {
    localStorage.setItem('shualingo-read-texts', JSON.stringify(ids));
  } catch {
    /* private mode: ignore */
  }
}

function Reader({ text, onBack, onDone }: { text: ReadingText; onBack: () => void; onDone: () => void }) {
  const [shown, setShown] = useState<Set<number>>(new Set());
  const all = shown.size === text.lines.length;
  const toggle = (i: number) => {
    play('tap');
    setShown((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };
  return (
    <div className="screen reader">
      <button type="button" className="secondary" onClick={onBack}>→ לכל הטקסטים</button>
      <header className="card">
        <p className="eyebrow">{text.author_he}</p>
        <h1 className="reader-title" dir="ltr" lang="la">{text.title_la}</h1>
        <h2>{text.title_he}</h2>
        <p><Mixed text={text.intro_he} /></p>
        <p className="muted small">נסו להבין כל שורה לבד, ורק אחר כך פתחו את התרגום. הקישו על מילה לטינית מוכרת כדי לראות את הכרטיס שלה.</p>
        <button type="button" className="mini" onClick={() => setShown(all ? new Set() : new Set(text.lines.map((_, i) => i)))}>
          {all ? 'להסתיר את כל התרגומים' : 'להציג את כל התרגומים'}
        </button>
      </header>
      <ol className="reader-lines">
        {text.lines.map((line, i) => (
          <li key={i} className="card reader-line">
            <La text={line.la} className="reader-la" />
            <button type="button" className={`mini reveal ${shown.has(i) ? 'open' : ''}`} onClick={() => toggle(i)} aria-expanded={shown.has(i)}>
              {shown.has(i) ? '▲ להסתיר תרגום' : '▼ תרגום'}
            </button>
            {shown.has(i) && (
              <div className="reader-he">
                <p className="strong"><Mixed text={line.he} /></p>
                {line.notes.length > 0 && (
                  <dl className="reader-notes">
                    {line.notes.map((n) => (
                      <div key={n.la}>
                        <dt dir="ltr" lang="la">{n.la}</dt>
                        <dd><Mixed text={n.he} /></dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      <section className="card lesson-box">
        <h2>מה לומדים מזה על הלטינית</h2>
        <ul className="plain-list">
          {text.lesson_he.map((l) => <li key={l}><Mixed text={l} /></li>)}
        </ul>
      </section>
      <button type="button" className="primary wide" onClick={onDone}>✓ קראתי — חזרה לספרייה</button>
    </div>
  );
}

export function LibraryScreen() {
  const [open, setOpen] = useState<ReadingText | null>(null);
  const [read, setRead] = useState<string[]>(loadRead);

  if (open) {
    return (
      <Reader
        text={open}
        onBack={() => setOpen(null)}
        onDone={() => {
          const next = [...new Set([...read, open.id])];
          setRead(next);
          saveRead(next);
          play('complete');
          setOpen(null);
        }}
      />
    );
  }

  return (
    <div className="screen library">
      <h1><span lang="la" dir="ltr" className="la-title">Bibliothēca</span> · ספריית הטקסטים</h1>
      <p className="muted">טקסטים מפורסמים, שירים, בדיחות ומשחקי מילים בלטינית — שורה אחר שורה, עם תרגום והסבר. כל טקסט מלמד משהו על השפה.</p>
      {KINDS.map(({ kind, icon, label }) => {
        const list = readingTexts.filter((t) => t.kind === kind).sort((a, b) => a.level - b.level);
        if (!list.length) return null;
        return (
          <section key={kind} className="card">
            <h2><span aria-hidden="true">{icon}</span> {label}</h2>
            <ul className="text-list">
              {list.map((t) => (
                <li key={t.id}>
                  <button type="button" className="text-item" onClick={() => { play('tap'); setOpen(t); }}>
                    <span className="text-la" dir="ltr" lang="la">{t.title_la}</span>
                    <span>{t.title_he}</span>
                    <span className="muted small">{t.author_he}</span>
                    <span className="small">{LEVEL[t.level]}{read.includes(t.id) ? ' · ✓ נקרא' : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
