import { useMemo, useState } from 'react';
import { CONFIG, HOUR_MS } from '../../config';
import { buildingById, lessons, rankById, ruleById, spellById, spells } from '../../content';
import type { ElementId } from '../../content/types';
import { harvestBuilding, nextLesson, tick, unitBlockedBy } from '../../game/actions';
import { buildingLevel, harvestLeftToday, maxLevel, readyAt, storageCap } from '../../game/buildings';
import { FIRE_TEXT_HE, fireLevel } from '../../game/camp';
import { nextRank } from '../../game/ranks';
import { spellStatus } from '../../game/spells';
import { dueCards } from '../../learning/srs';
import { CampScene, type SpotId } from '../../art/CampScene';
import { Countdown, ElementBar } from '../components/common';
import { ElementIcon } from '../components/ElementIcon';
import { La } from '../components/La';
import { Sheet } from '../components/Sheet';
import { play } from '../feedback/sfx';
import { getSave, updateSave, useNow, useSave } from '../store';

export type CampGo = (target: 'path' | 'review' | 'spells' | { lesson: string } | { spell: string }) => void;

const BUILDING_SPOTS = ['hortus', 'fons', 'bibliotheca', 'turris'] as const;

function buildSpellFor(buildingId: string) {
  return spells.find((s) => s.effect.type === 'build' && s.effect.building === buildingId);
}

/** Latin the fox can say: spells she knows and examples from lessons already done. */
function foxPhrases(spellbook: string[], doneLessons: string[]): { la: string; he: string }[] {
  const phrases = spellbook.map((id) => spellById.get(id)!).map((s) => ({ la: s.text, he: s.meaning_he }));
  for (const lesson of lessons.filter((l) => doneLessons.includes(l.id))) {
    for (const ruleId of lesson.rules_intro) phrases.push(...(ruleById.get(ruleId)?.examples ?? []).map((e) => ({ la: e.la, he: e.he })));
  }
  return phrases.length ? phrases : [{ la: 'Silva magna est.', he: 'היער גדול.' }];
}

export function CampScreen({ go }: { go: CampGo }) {
  const save = useSave();
  const now = useNow(4000);
  const state = tick(save, now);
  const camp = state.camp;
  const level = fireLevel(camp.fuel);
  const lit = Boolean(camp.light && camp.light.until > now);
  const circleActive = save.spellbook.length > 0;
  const due = dueCards(save.cards, now).length;
  const upcoming = nextLesson(save);
  const blockedBy = upcoming ? unitBlockedBy(save, upcoming.id.split('-')[0]) : null;
  const rank = rankById.get(save.rank)!;
  const [sheet, setSheet] = useState<SpotId | null>(null);
  const [speech, setSpeech] = useState<{ la: string; he: string } | null>(null);
  const [floaters, setFloaters] = useState<{ key: number; spot: SpotId; element: ElementId; amount: number }[]>([]);
  const [pulse, setPulse] = useState<ElementId[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const phrases = useMemo(() => foxPhrases(save.spellbook, Object.keys(save.lessons)), [save.spellbook, save.lessons]);
  const leftToday = harvestLeftToday(camp, now);

  const doHarvest = (id: SpotId) => {
    const result = harvestBuilding(getSave(), id, Date.now());
    const entries = Object.entries(result.gained) as [ElementId, number][];
    if (!entries.length) {
      if (result.capped) setNote(`קצרת היום את המקסימום (${CONFIG.DAILY_HARVEST_CAP}). מחר אפשר לקצור שוב — ובינתיים, שיעורים נותנים אלמנטים בלי הגבלה.`);
      return;
    }
    updateSave(() => result.save);
    play('harvest');
    const key = Date.now();
    setFloaters((f) => [...f, ...entries.map(([element, amount], i) => ({ key: key + i, spot: id, element, amount }))]);
    setPulse(entries.map(([e]) => e));
    window.setTimeout(() => setFloaters((f) => f.filter((x) => x.key < key)), 1200);
    window.setTimeout(() => setPulse([]), 700);
    if (result.capped) setNote('הגעת לתקרת הקציר היומית. השאר מחכה למחר.');
  };

  const onTarget = (id: SpotId) => {
    play('tap');
    if (id === 'fox') {
      setSpeech(phrases[Math.floor(Math.random() * phrases.length)]);
      return;
    }
    if (id === 'focus') play('crackle');
    if (id === 'circulus') {
      if (circleActive) go('spells');
      else setNote('מעגל הלחשים יתעורר בסוף יחידה 3, עם הלחש הראשון.');
      return;
    }
    if (id === 'tree') {
      if (save.spellbook.includes('grow-tree')) go({ spell: 'grow-tree' });
      else setNote(`זה עץ צעיר (arbor). ביחידה 5 תלמדו להשקות אותו בלחש: Aquam arborī dā!`);
      return;
    }
    if (readyAt(camp, id) >= 1) {
      doHarvest(id);
      return;
    }
    setSheet(id);
  };

  // Overlays: harvest bubbles, build plots, the fox's speech and rising "+N".
  const overlays = [];
  for (const id of ['focus', ...BUILDING_SPOTS] as SpotId[]) {
    const ready = readyAt(camp, id);
    const produces = buildingById.get(id)?.produces;
    if (camp.buildings[id] && produces && ready >= 1) {
      overlays.push({
        id: `bubble-${id}`,
        spot: id,
        dy: -6,
        node: (
          <button type="button" className={`bubble ${leftToday === 0 ? 'capped' : ''}`} onClick={() => doHarvest(id)} aria-label={`קצירת ${ready} ${produces.element}`}>
            <ElementIcon id={produces.element} size={16} />
            <span>{ready}</span>
          </button>
        ),
      });
    }
  }
  for (const id of BUILDING_SPOTS) {
    if (camp.buildings[id]) continue;
    const spell = buildSpellFor(id);
    if (!spell || !save.spellbook.includes(spell.id)) continue;
    overlays.push({
      id: `plot-${id}`,
      spot: id,
      dy: id === 'turris' ? 26 : 0,
      node: (
        <button type="button" className="plot-button" onClick={() => { play('tap'); go({ spell: spell.id }); }} aria-label={`לבנות ${buildingById.get(id)!.name_la}`}>
          + <span lang="la" dir="ltr">{buildingById.get(id)!.name_la}</span>
        </button>
      ),
    });
  }
  if (speech) {
    overlays.push({
      id: 'speech',
      spot: 'fox' as SpotId,
      dy: -4,
      node: (
        <div className="speech" role="status">
          <La text={speech.la} />
          <span className="speech-he">{speech.he}</span>
          <button type="button" className="speech-close" onClick={() => setSpeech(null)} aria-label="סגירה">✕</button>
        </div>
      ),
    });
  }
  for (const f of floaters) {
    overlays.push({
      id: `float-${f.key}`,
      spot: f.spot,
      dy: -8,
      node: (
        <span className="floater">
          +{f.amount} <ElementIcon id={f.element} size={14} />
        </span>
      ),
    });
  }

  const targets: { id: SpotId; label: string }[] = [
    { id: 'focus', label: 'המדורה (focus)' },
    { id: 'fox', label: 'השועלה — הקישו כדי לשמוע אותה' },
    { id: 'tentorium', label: 'האוהל (tentōrium)' },
    { id: 'circulus', label: 'מעגל הלחשים' },
    { id: 'tree', label: 'העץ (arbor)' },
    ...BUILDING_SPOTS.filter((id) => camp.buildings[id]).map((id) => ({ id: id as SpotId, label: `${buildingById.get(id)!.name_he} (${buildingById.get(id)!.name_la})` })),
  ];

  return (
    <div className="screen camp">
      <ElementBar elements={save.elements} pulse={pulse} />
      <CampScene camp={camp} fire={level} rank={save.rank} circleActive={circleActive} lit={lit} targets={targets} onTarget={onTarget} overlays={overlays} />
      {note && (
        <button type="button" className="scene-note" onClick={() => setNote(null)}>
          {note}
        </button>
      )}

      <div className="camp-actions">
        {upcoming && !blockedBy ? (
          <button type="button" className="primary wide" onClick={() => go({ lesson: upcoming.id })}>
            המשך ללמוד: {upcoming.title_he}
          </button>
        ) : upcoming && blockedBy ? (
          <button type="button" className="primary wide" onClick={() => go({ spell: buildSpellFor(blockedBy)!.id })}>
            היחידה הבאה מחכה ל-<span lang="la" dir="ltr">{buildingById.get(blockedBy)!.name_la}</span>: לבנות אותה
          </button>
        ) : (
          <button type="button" className="primary wide" onClick={() => go('path')}>
            כל השיעורים הושלמו — למסלול
          </button>
        )}
        <button type="button" className="secondary wide" onClick={() => go('review')} disabled={due === 0}>
          {due > 0 ? `חזרה על מילים חלשות (${due}) · מרוויחים aqua` : 'אין כרגע מילים לחזרה'}
        </button>
        {circleActive && (
          <button type="button" className="secondary wide magic" onClick={() => go('spells')}>
            מעגל הלחשים
          </button>
        )}
      </div>

      {Object.keys(save.lessons).length === 0 && (
        <section className="card welcome">
          <h2>ברוכים הבאים ליער</h2>
          <p>
            שועלה קוסמת צעירה הגיעה לבדה ליער (<span lang="la" dir="ltr">silva</span>) והקימה מחנה קטן.
            בעולם שלה לטינית היא שפת הקסם: כל שיעור נותן לה אלמנטים ומילים, ובעזרתם היא תטיל לחשים ותבנה את המחנה.
          </p>
          <p className="muted small">הקישו על השועלה, על המדורה ועל כל דבר אחר בתמונה.</p>
        </section>
      )}

      <section className="card rank-card">
        <p className="eyebrow">הדרגה של השועלה</p>
        <h2><span lang="la" dir="ltr" className="la-title">{rank.id}</span> · {rank.name_he}</h2>
        <p className="muted small">{rank.description_he}</p>
        {nextRank(save) && <p className="small">הדרגה הבאה: <span lang="la" dir="ltr">{nextRank(save)!.id}</span> ({nextRank(save)!.name_he}) — עם הלחש <span lang="la" dir="ltr" className="nowrap">Mē mūtā!</span> במגדל.</p>}
      </section>

      <section className="card fire-card">
        <h2>
          <span lang="la" dir="ltr" className="la-title">focus</span> · המדורה
        </h2>
        <p>{FIRE_TEXT_HE[level]}</p>
        <div className="fuel" aria-label={`דלק: ${camp.fuel} מתוך ${CONFIG.FIRE_MAX_FUEL}`}>
          {Array.from({ length: CONFIG.FIRE_MAX_FUEL }, (_, i) => (
            <span key={i} className={`fuel-unit ${i < camp.fuel ? 'full' : ''}`} />
          ))}
        </div>
        {camp.fuel > 0 && (
          <p className="muted small">
            יחידת העץ הבאה תישרף בעוד <Countdown until={camp.lastBurnAt + CONFIG.FIRE_BURN_HOURS * HOUR_MS} now={now} />
          </p>
        )}
        <p className="muted small">קציר מהמבנים היום: {CONFIG.DAILY_HARVEST_CAP - leftToday} מתוך {CONFIG.DAILY_HARVEST_CAP}.</p>
      </section>

      {sheet && <BuildingSheet id={sheet} onClose={() => setSheet(null)} go={go} onHarvest={doHarvest} />}
    </div>
  );
}

function BuildingSheet({ id, onClose, go, onHarvest }: { id: SpotId; onClose: () => void; go: CampGo; onHarvest: (id: SpotId) => void }) {
  const save = useSave();
  const now = useNow(4000);
  const camp = tick(save, now).camp;
  const building = buildingById.get(id);
  if (!building) return null;
  const level = buildingLevel(camp, id);
  const spell = buildSpellFor(id);
  const status = spell && save.spellbook.includes(spell.id) ? spellStatus(save, spell, now) : null;
  const ready = readyAt(camp, id);
  return (
    <Sheet title={building.name_he} onClose={onClose}>
      <div className="building-sheet">
        <div className="word-lemma" dir="ltr" lang="la"><La text={building.name_la} /></div>
        <p>{building.description_he}</p>
        {level > 0 && maxLevel(building) > 1 && <p className="small">רמה {level} מתוך {maxLevel(building)}.</p>}
        {id === 'tentorium' && <p className="small">כל מבנה צובר עד {storageCap(camp)} יחידות לפני שצריך לקצור.</p>}
        {building.produces && level > 0 && (
          <p className="small">
            מייצר <ElementIcon id={building.produces.element} size={14} /> <span lang="la" dir="ltr">{building.produces.element}</span> אחד
            כל {building.produces.every_hours} שעות{building.produces.needs_fire ? ', כל עוד האש בוערת' : ''}. מוכן לקציר: {ready}.
          </p>
        )}
        {ready >= 1 && (
          <button type="button" className="primary wide" onClick={() => { onHarvest(id); onClose(); }}>
            קציר
          </button>
        )}
        {spell && save.spellbook.includes(spell.id) && status?.ready && (
          <button type="button" className="secondary wide magic" onClick={() => { onClose(); go({ spell: spell.id }); }}>
            {level === 0 ? 'לבנות' : 'לשדרג'} בלחש <span lang="la" dir="ltr">{spell.text}</span>
          </button>
        )}
        {spell && !save.spellbook.includes(spell.id) && level < maxLevel(building) && (
          <p className="muted small">את לחש הבנייה לומדים בהמשך המסלול.</p>
        )}
      </div>
    </Sheet>
  );
}
