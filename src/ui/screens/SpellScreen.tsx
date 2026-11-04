import { useMemo, useState } from 'react';
import { CONFIG } from '../../config';
import { sentenceFromTiles, spellById } from '../../content';
import { castSpell, type CastOutcome } from '../../game/actions';
import { canAfford } from '../../game/elements';
import { spellCost } from '../../game/spells';
import { spellTask, taskStatus } from '../../game/tasks';
import { shuffle } from '../../learning/exercises';
import { Countdown, ElementBar, ElementList } from '../components/common';
import { La } from '../components/La';
import { TileBuilder } from '../exercises/TileBuilder';
import { getSave, updateSave, useNow, useSave } from '../store';

/** מעגל הלחשים: build the spell from word tiles, pay its elements, and watch it work. */
export function SpellScreen() {
  const save = useSave();
  const now = useNow();
  const [spellId, setSpellId] = useState(save.spellbook[0]);
  const spell = spellId ? spellById.get(spellId) : undefined;
  const [round, setRound] = useState(0);
  const bank = useMemo(() => (spell ? shuffle([...spell.answer, ...spell.extra]) : []), [spell, round]);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<{ outcome: CastOutcome; lockedNow: boolean } | null>(null);

  if (!spell) {
    return (
      <div className="screen center">
        <h1>מעגל הלחשים</h1>
        <p>ספר הלחשים עדיין ריק. הלחש הראשון נפתח בסוף יחידה 3.</p>
      </div>
    );
  }

  const cost = spellCost(spell);
  const affordable = canAfford(save.elements, cost);
  const status = taskStatus(save.tasks[spellTask(spell.id)], now);

  const cast = () => {
    const outcome = castSpell(getSave(), spell.id, placed.map((i) => bank[i]), Date.now());
    updateSave(() => outcome.save);
    setResult({ outcome: outcome.outcome, lockedNow: outcome.lockedNow });
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

      <section className="card">
        <p className="eyebrow">ספר הלחשים · <span lang="la" dir="ltr">liber incantationum</span></p>
        <ul className="spellbook">
          {save.spellbook.map((id) => {
            const s = spellById.get(id)!;
            return (
              <li key={id}>
                <button type="button" className={`spell-entry ${id === spellId ? 'selected' : ''}`} onClick={() => { setSpellId(id); again(); }}>
                  <span className="spell-text" dir="ltr" lang="la">{s.text}</span>
                  <span>{s.meaning_he}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card circle-card">
        <h2>{spell.meaning_he}</h2>
        <p className="muted">הרכיבו את הלחש מהאריחים. כל מילה עולה את האלמנט שלה.</p>
        <p>מחיר: <ElementList delta={cost} /></p>

        {status.locked && status.lockedUntil ? (
          <p className="locked-note">
            הלחש השתבש יותר מדי פעמים, והמעגל צריך לנוח. ייפתח שוב בעוד <Countdown until={status.lockedUntil} now={now} />.
          </p>
        ) : result ? (
          <div className={`spell-result ${result.outcome === 'cast' ? 'good' : 'bad'}`} role="status">
            {result.outcome === 'cast' && (
              <>
                <h3>הלחש עבד!</h3>
                <La text={spell.text} className="spell-text" />
                <p>{spell.effect_he}</p>
              </>
            )}
            {result.outcome === 'wrong' && (
              <>
                <h3>הלחש השתבש</h3>
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
            {result.outcome === 'poor' && <p>אין מספיק אלמנטים. שיעורים וחזרות ימלאו אותם.</p>}
            <button type="button" className="primary wide" onClick={again}>
              {result.outcome === 'cast' ? 'להטיל שוב' : 'בסדר'}
            </button>
          </div>
        ) : (
          <>
            <TileBuilder bank={bank} placed={placed} onChange={setPlaced} locked={false} punctuation="!" />
            <p className="visually-hidden">{sentenceFromTiles(placed.map((i) => bank[i]), '!')}</p>
            <button type="button" className="primary wide magic" disabled={!placed.length || !affordable} onClick={cast}>
              {affordable ? 'הטלת הלחש' : 'אין מספיק אלמנטים'}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
