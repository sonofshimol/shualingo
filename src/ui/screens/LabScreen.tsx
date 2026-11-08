/**
 * מעבדת הלחשים — build any spell from known words in four slots and turn each word's ending.
 * The slot says what you mean; the ending says what the Latin says. Discover new spells,
 * and when the grammar slips, watch the spell go wrong in a way that explains why.
 */
import { unlockedMystic } from '../../game/ranks';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../../config';
import { wordById, words } from '../../content';
import type { Word } from '../../content/types';
import { canAfford, subtractElements } from '../../game/elements';
import { analyze, sentenceText, verbFrameById, wheelForms, type LabSentence, type SlotFill, type SlotRole } from '../../magic/grammar';
import { castLab, labPreview, type LabResult } from '../../magic/lab';
import { parseCardId } from '../../learning/srs';
import { Countdown, ElementBar, ElementList } from '../components/common';
import { La } from '../components/La';
import { Sheet } from '../components/Sheet';
import { play } from '../feedback/sfx';
import { getSave, updateSave, useNow, useSave } from '../store';

const SLOT_INFO: Record<SlotRole, { q: string; hint: string; icon: string }> = {
  verb: { q: 'מה לעשות?', hint: 'פקודה (ציווי)', icon: '✦' },
  object: { q: 'את מה?', hint: 'מושא: ‎-am, ‎-um, ‎-em', icon: '◆' },
  recipient: { q: 'למי?', hint: 'נתינה: ‎-ae, ‎-ō, ‎-ī, mihi', icon: '➜' },
  means: { q: 'במה? באיזה כוח?', hint: 'אמצעי: ‎-ā, ‎-ō, ‎-e', icon: '✚' },
};

const ADJECTIVES = ['magnus', 'multus', 'parvus', 'bonus', 'novus', 'fortis'];

const ANIMATION: Record<string, string> = {
  steam: '☁️', puddle: '💧', sparks: '✨', float: '🦊', narrator: '📜', echo: '🔊', giant: '🪵',
};

/** Words the player has met (in lessons, reviews or the word game). */
export function knownWordIds(cards: Record<string, unknown>): Set<string> {
  return new Set(Object.keys(cards).map(parseCardId).filter((c) => c.kind === 'word').map((c) => c.id));
}

function candidates(role: SlotRole | 'modifier', known: Set<string>): Word[] {
  const list = words.filter((w) => known.has(w.id));
  if (role === 'verb') return list.filter((w) => verbFrameById.has(w.id));
  if (role === 'modifier') return list.filter((w) => ADJECTIVES.includes(w.id));
  const nouns = list.filter((w) => w.pos === 'noun' || w.pos === 'pron');
  // Tagged words (things magic can touch) first.
  return [...nouns.filter((w) => w.tags?.length), ...nouns.filter((w) => !w.tags?.length)];
}

function defaultForm(word: Word): string {
  if (word.pos === 'verb') return word.forms['pres.3sg'] ?? wheelForms(word)[0];
  return wheelForms(word)[0] ?? word.lemma;
}

function Wheel({ word, form, onChange, label }: { word: Word; form: string; onChange: (f: string) => void; label: string }) {
  const forms = wheelForms(word);
  const i = Math.max(0, forms.indexOf(form));
  const turn = (d: number) => {
    play('tap');
    onChange(forms[(i + d + forms.length) % forms.length]);
  };
  return (
    <span className="wheel" dir="ltr">
      <button type="button" className="wheel-arrow" onClick={() => turn(-1)} aria-label={`הסיומת הקודמת של ${label}`}>◀</button>
      <span className="wheel-form" lang="la" aria-live="polite">{form}</span>
      <button type="button" className="wheel-arrow" onClick={() => turn(1)} aria-label={`הסיומת הבאה של ${label}`}>▶</button>
    </span>
  );
}

export function LabScreen() {
  const save = useSave();
  const now = useNow(5000);
  const [sentence, setSentence] = useState<LabSentence>({});
  const [picker, setPicker] = useState<{ role: SlotRole; modifier?: boolean } | null>(null);
  const [result, setResult] = useState<Omit<LabResult, 'save'> | null>(null);
  const [hint, setHint] = useState(false);
  const castCard = useRef<HTMLElement>(null);
  useEffect(() => {
    if (result) castCard.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);
  const known = useMemo(() => knownWordIds(save.cards), [save.cards]);
  const meansOpen = Boolean(save.lessons['u7-l1']);
  const roles: SlotRole[] = meansOpen ? ['verb', 'object', 'recipient', 'means'] : ['verb', 'object', 'recipient'];
  const preview = labPreview(save, sentence);
  const analysis = analyze(sentence);
  const text = sentenceText(sentence);

  const setSlot = (role: SlotRole, fill: SlotFill | undefined) => {
    setResult(null);
    setHint(false);
    setSentence((s) => {
      const next = { ...s };
      if (fill) next[role] = fill;
      else delete next[role];
      return next;
    });
  };

  const pick = (word: Word) => {
    if (!picker) return;
    play('tap');
    if (picker.modifier) {
      const slot = sentence[picker.role];
      if (slot) setSlot(picker.role, { ...slot, modifier: { wordId: word.id, form: defaultForm(word) } });
    } else {
      setSlot(picker.role, { wordId: word.id, form: defaultForm(word) });
    }
    setPicker(null);
  };

  const buyHint = () => {
    if (!canAfford(save.elements, { aer: 1 })) return;
    updateSave((s) => ({ ...s, elements: subtractElements(s.elements, { aer: 1 }) }));
    setHint(true);
    play('tap');
  };

  const cast = () => {
    const r = castLab(getSave(), sentence, Date.now());
    updateSave(() => r.save);
    const { save: _ignored, ...rest } = r;
    setResult(rest);
    setHint(false);
    if (r.outcome === 'cast') play(r.newDiscovery ? 'rank' : 'cast');
    else if (r.outcome === 'harmless') play(r.newDiscovery ? 'harvest' : 'tap');
    else if (r.outcome === 'garble') play('fizzle');
  };

  const slotError = (role: SlotRole) => analysis.errors.find((e) => e.role === role);
  const totalDiscoveries = Object.keys(save.lab.discoveries).length;

  return (
    <div className="screen lab">
      <ElementBar mystic={unlockedMystic(save.rank)} elements={save.elements} />
      <section className="card lab-intro">
        <h2>מעבדת הלחשים</h2>
        <p className="small">
          שימו מילה בכל משבצת, וסובבו את הסיומת עם ◀ ▶. המשבצת אומרת מה אתם <b>מתכוונים</b>; הסיומת אומרת מה הלטינית <b>אומרת</b>.
          צירוף תקין חדש נרשם כגילוי. ניסוי שהשתבש לא עולה כלום ולא נועל.
        </p>
        <p className="muted small">גילויים עד עכשיו: {totalDiscoveries}</p>
      </section>

      <div className="slots">
        {roles.map((role) => {
          const fill = sentence[role];
          const word = fill ? wordById.get(fill.wordId) : undefined;
          const err = hint ? slotError(role) : undefined;
          const frame = role !== 'verb' && sentence.verb ? verbFrameById.get(sentence.verb.wordId) : undefined;
          const notNeeded = role === 'recipient' && frame?.recipient === 'none';
          return (
            <section key={role} className={`slot slot-${role} ${fill ? 'filled' : ''} ${hint ? (err ? 'hint-bad' : fill ? 'hint-good' : '') : ''}`}>
              <div className="slot-head">
                <span className="slot-icon" aria-hidden="true">{SLOT_INFO[role].icon}</span>
                <span className="slot-q">{SLOT_INFO[role].q}</span>
                <span className="slot-hint muted small">{SLOT_INFO[role].hint}</span>
                {hint && fill && <span className="slot-mark">{err ? '✗' : '✓'}</span>}
              </div>
              {fill && word ? (
                <div className="slot-body">
                  {fill.modifier && wordById.get(fill.modifier.wordId) && (
                    <Wheel
                      word={wordById.get(fill.modifier.wordId)!}
                      form={fill.modifier.form}
                      label={wordById.get(fill.modifier.wordId)!.lemma}
                      onChange={(form) => setSlot(role, { ...fill, modifier: { ...fill.modifier!, form } })}
                    />
                  )}
                  <Wheel word={word} form={fill.form} label={word.lemma} onChange={(form) => setSlot(role, { ...fill, form })} />
                  <span className="slot-meaning muted small">{word.meaning_he}</span>
                  <span className="slot-actions">
                    {(role === 'object' || role === 'means') && !fill.modifier && (
                      <button type="button" className="mini" onClick={() => setPicker({ role, modifier: true })}>+ תואר</button>
                    )}
                    {fill.modifier && (
                      <button type="button" className="mini" onClick={() => setSlot(role, { wordId: fill.wordId, form: fill.form })}>− תואר</button>
                    )}
                    <button type="button" className="mini" onClick={() => setSlot(role, undefined)} aria-label="ניקוי המשבצת">✕</button>
                  </span>
                </div>
              ) : (
                <button type="button" className="slot-empty" onClick={() => setPicker({ role })} disabled={notNeeded}>
                  {notNeeded ? 'הפקודה הזאת לא צריכה "למי?"' : '+ בחרו מילה'}
                </button>
              )}
            </section>
          );
        })}
        {!meansOpen && <p className="muted small center-text">המשבצת "במה? באיזה כוח?" נפתחת ביחידה 7.</p>}
      </div>

      <section ref={castCard} className="card circle-card lab-cast">
        <div className="lab-sentence" dir="ltr" lang="la">{text || '…'}</div>
        {preview.rule && (
          <p className="small">
            מחיר: <ElementList delta={preview.cost} />
          </p>
        )}
        {!result && (
          <div className="button-row">
            <button type="button" className="primary magic" disabled={!sentence.verb} onClick={cast}>הטלה</button>
            <button type="button" className="secondary" disabled={hint || !Object.keys(sentence).length || !canAfford(save.elements, { aer: 1 })} onClick={buyHint}>
              רמז (1 aer)
            </button>
          </div>
        )}
        {hint && !result && (
          <p className="small">{analysis.ok ? '✓ כל הסיומות מתאימות למשבצות.' : `✗ משהו לא מתאים במשבצת "${SLOT_INFO[analysis.errors[0].role].q}".`}</p>
        )}
        {result && <LabResultCard result={result} now={now} onAgain={() => setResult(null)} />}
      </section>

      {picker && (
        <Sheet title={picker.modifier ? 'בחרו שם תואר' : `${SLOT_INFO[picker.role].q} — בחרו מילה`} onClose={() => setPicker(null)}>
          <p className="muted small">מוצגות רק מילים שכבר פגשתם (בשיעורים, בחזרה או במשחק המילים).</p>
          <div className="picker">
            {candidates(picker.modifier ? 'modifier' : picker.role, known).map((w) => (
              <button key={w.id} type="button" className="picker-word" onClick={() => pick(w)}>
                <span lang="la" dir="ltr">{w.lemma}</span>
                <span className="small muted">{w.meaning_he}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function LabResultCard({ result, now, onAgain }: { result: Omit<LabResult, 'save'>; now: number; onAgain: () => void }) {
  const { outcome } = result;
  return (
    <div className={`spell-result ${outcome === 'cast' || outcome === 'harmless' ? 'good' : 'bad'}`} role="status">
      {outcome === 'cast' && (
        <>
          <h3>✓ {result.rule?.name_he}</h3>
          <La text={result.analysis.text} className="spell-text" />
          {result.newDiscovery && <p className="discovery-badge">★ גילוי חדש! נרשם בספר הגילויים</p>}
          {result.note_he && <p>{result.note_he}</p>}
          {result.analysis.hasMeans && <p className="small">יחסת האמצעי הכפילה את הכוח.</p>}
          {result.gained && <p>קיבלת: <ElementList delta={result.gained} pop /></p>}
        </>
      )}
      {outcome === 'harmless' && (
        <>
          <h3>✓ משפט נכון!</h3>
          <La text={result.analysis.text} className="spell-text" />
          <p>הקסם פועל, אבל שום דבר במחנה לא מגיב ללחש הזה. {result.newDiscovery ? 'הוא נרשם בספר הגילויים.' : ''}</p>
        </>
      )}
      {outcome === 'garble' && result.garble && (
        <>
          <span className={`garble-anim anim-${result.garble.def.animation}`} aria-hidden="true">{ANIMATION[result.garble.def.animation]}</span>
          <h3>✗ {result.garble.def.title_he}</h3>
          <La text={result.analysis.text} className="spell-text" />
          <p>{result.garble.effect_he}</p>
          <p className="strong">{result.garble.explain_he}</p>
          <p className="muted small">הכלל נכנס לחזרה. נסו לתקן את הסיומת. מדרגת magistra, תיקון תוך {CONFIG.FIX_GARBLE_MINUTES} דקות נותן umbra.</p>
        </>
      )}
      {outcome === 'blocked' && <p>🔒 {result.note_he}{result.until ? <> אפשר שוב בעוד <Countdown until={result.until} now={now} />.</> : null}</p>}
      {outcome === 'cooldown' && result.until && <p>⏳ הלחש הזה צריך לנוח. אפשר שוב בעוד <Countdown until={result.until} now={now} />.</p>}
      {outcome === 'poor' && <p>אין מספיק אלמנטים. צריך: <ElementList delta={result.cost ?? {}} /></p>}
      <button type="button" className="primary wide" onClick={onAgain}>
        {outcome === 'garble' ? 'לתקן' : 'המשך'}
      </button>
    </div>
  );
}
