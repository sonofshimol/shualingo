import { useMemo, useState } from 'react';
import { CONFIG } from '../../config';
import { sentenceFromTiles, spellById } from '../../content';
import { castSpell, type CastResult } from '../../game/actions';
import { canAfford } from '../../game/elements';
import { spellStatus, spellTotalCost } from '../../game/spells';
import { spellTask, taskStatus } from '../../game/tasks';
import { shuffle } from '../../learning/exercises';
import { Countdown, ElementBar, ElementList } from '../components/common';
import { La } from '../components/La';
import { TileBuilder } from '../exercises/TileBuilder';
import { play } from '../feedback/sfx';
import { getSave, updateSave, useNow, useSave } from '../store';

const SCHOOL_HE: Record<string, string> = {
  basic: 'איסוף',
  aedificium: 'בנייה',
  crescentia: 'גדילה',
  lux: 'אור',
  mutatio: 'שינוי',
};

/** מעגל הלחשים: build the spell from word tiles, pay its elements, and watch it work. */
export function SpellScreen({ initialSpell }: { initialSpell?: string }) {
  const save = useSave();
  const now = useNow();
  const [spellId, setSpellId] = useState(initialSpell && save.spellbook.includes(initialSpell) ? initialSpell : save.spellbook[0]);
  const spell = spellId ? spellById.get(spellId) : undefined;
  const [round, setRound] = useState(0);
  const bank = useMemo(() => (spell ? shuffle([...spell.answer, ...spell.extra]) : []), [spell, round]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<Omit<CastResult, 'save'> | null>(null);

  if (!spell) {
    return (
      <div className="screen center">
        <h1>מעגל הלחשים</h1>
        <p>ספר הלחשים עדיין ריק. הלחש הראשון נפתח בסוף יחידה 3.</p>
      </div>
    );
  }

  const cost = spellTotalCost(save, spell);
  const affordable = canAfford(save.elements, cost);
  const suspended = taskStatus(save.tasks[spellTask(spell.id)], now);
  const status = spellStatus(save, spell, now);

  const cast = () => {
    const outcome = castSpell(getSave(), spell.id, placed.map((i) => bank[i]), Date.now());
    updateSave(() => outcome.save);
    const { save: _ignored, ...rest } = outcome;
    setResult(rest);
    if (outcome.outcome === 'cast') {
      const effect = spell.effect.type;
      play(effect === 'rank' ? 'rank' : effect === 'build' ? 'build' : 'cast');
    } else if (outcome.outcome === 'wrong') play('fizzle');
  };
  const choose = (id: string) => {
    play('tap');
    setSpellId(id);
    setResult(null);
    setPlaced([]);
    setRound((r) => r + 1);
  };
  const again = () => {
    setResult(null);
    setPlaced([]);
    setRound((r) => r + 1);
  };

  return (
    <div className="screen spells">
      <h1>מעגל הלחשים</h1>
      <ElementBar elements={save.elements} />

      <section className={`card circle-card ${result?.outcome === 'cast' ? 'casting' : ''}`}>
        <h2>{spell.meaning_he}</h2>
        <p className="muted">הרכיבו את הלחש מהאריחים. כל מילה עולה את האלמנט שלה{spell.effect.type === 'build' || spell.effect.type === 'rank' ? ', ועוד חומרים' : ''}.</p>
        <p>מחיר: <ElementList delta={cost} /></p>

        {suspended.locked && suspended.lockedUntil ? (
          <p className="locked-note">
            הלחש השתבש יותר מדי פעמים, והמעגל צריך לנוח. ייפתח שוב בעוד <Countdown until={suspended.lockedUntil} now={now} />.
          </p>
        ) : result ? (
          <div className={`spell-result ${result.outcome === 'cast' ? 'good' : 'bad'}`} role="status">
            {result.outcome === 'cast' && (
              <>
                <h3>✓ הלחש עבד!</h3>
                <La text={spell.text} className="spell-text" />
                <p>{spell.effect_he}</p>
                {result.note_he && <p className="strong">{result.note_he}</p>}
                {result.gained && <p>קיבלת: <ElementList delta={result.gained} pop /></p>}
              </>
            )}
            {result.outcome === 'wrong' && (
              <>
                <h3>✗ הלחש השתבש</h3>
                <p>הנוסח הנכון:</p>
                <La text={spell.text} className="spell-text" />
                <p>{spell.explain_he}</p>
                <p className="muted small">
                  {result.lockedNow
                    ? `אחרי ${CONFIG.FAILURES_BEFORE_SUSPENSION} ניסיונות שגויים המעגל נח ${CONFIG.SUSPENSION_HOURS} שעות. המילים של הלחש נכנסו לחזרה.`
                    : 'טעות לא עולה אלמנטים. נסו שוב.'}
                </p>
              </>
            )}
            {result.outcome === 'poor' && <p>אין מספיק אלמנטים. שיעורים, חזרות וקציר מהמבנים ימלאו אותם.</p>}
            {result.outcome === 'blocked' && <p>{result.note_he}</p>}
            <button type="button" className="primary wide" onClick={again}>
              {result.outcome === 'cast' ? 'המשך' : 'בסדר'}
            </button>
          </div>
        ) : !status.ready ? (
          <p className="locked-note">
            🔒 {status.reason_he}
            {status.until && <> אפשר שוב בעוד <Countdown until={status.until} now={now} />.</>}
          </p>
        ) : (
          <>
            <TileBuilder bank={bank} placed={placed} onChange={(p) => { play('tap'); setPlaced(p); }} locked={false} punctuation="!" />
            <p className="visually-hidden">{sentenceFromTiles(placed.map((i) => bank[i]), '!')}</p>
            <button type="button" className="primary wide magic" disabled={!placed.length || !affordable} onClick={cast}>
              {affordable ? 'הטלת הלחש' : 'אין מספיק אלמנטים'}
            </button>
          </>
        )}
      </section>
      <section className="card">
        <p className="eyebrow">ספר הלחשים · <span lang="la" dir="ltr">liber incantationum</span></p>
        <ul className="spellbook">
          {save.spellbook.map((id) => {
            const s = spellById.get(id)!;
            const st = spellStatus(save, s, now);
            return (
              <li key={id}>
                <button type="button" className={`spell-entry ${id === spellId ? 'selected' : ''} ${st.ready ? '' : 'unavailable'}`} onClick={() => choose(id)} aria-current={id === spellId}>
                  <span className="spell-row">
                    <span className="spell-text" dir="ltr" lang="la">{s.text}</span>
                    <span className="school-tag">{SCHOOL_HE[s.school] ?? s.school}</span>
                  </span>
                  <span>{s.meaning_he}{st.ready ? '' : ' · 🔒'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

    </div>
  );
}
