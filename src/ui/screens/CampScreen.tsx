import { useState } from 'react';
import { CONFIG, HOUR_MS } from '../../config';
import { buildings } from '../../content';
import { nextLesson, tick } from '../../game/actions';
import { FIRE_TEXT_HE, fireLevel } from '../../game/camp';
import { dueCards } from '../../learning/srs';
import { CampScene, type Hotspot } from '../../art/CampScene';
import { Countdown, ElementBar } from '../components/common';
import { useNow, useSave } from '../store';

const HOTSPOTS: Hotspot[] = [
  { id: 'fire', label: 'המדורה (focus)' },
  { id: 'tent', label: 'האוהל (tentorium)' },
  { id: 'circle', label: 'מעגל הלחשים' },
  { id: 'fox', label: 'השועלה' },
];

export function CampScreen({ go }: { go: (screen: 'path' | 'review' | 'spells' | { lesson: string }) => void }) {
  const save = useSave();
  const now = useNow(5000);
  const camp = tick(save, now).camp;
  const level = fireLevel(camp.fuel);
  const circleActive = save.spellbook.length > 0;
  const due = dueCards(save.cards, now).length;
  const upcoming = nextLesson(save);
  const [note, setNote] = useState<string | null>(null);

  const onHotspot = (id: Hotspot['id']) => {
    if (id === 'circle' && circleActive) return go('spells');
    if (id === 'fire') return setNote(`${FIRE_TEXT_HE[level]} (דלק: ${camp.fuel}/${CONFIG.FIRE_MAX_FUEL})`);
    if (id === 'fox') return setNote('השועלה מחכה לשיעור הבא. כל שיעור מוסיף לה אלמנטים ומילים לספר הלחשים.');
    const building = buildings.find((b) => (id === 'tent' ? b.id === 'tentorium' : b.id === 'circulus'));
    if (building) setNote(`${building.name_he} (${building.name_la}): ${building.description_he}${id === 'circle' ? ' הוא יתעורר בסוף יחידה 3.' : ''}`);
  };

  return (
    <div className="screen camp">
      <ElementBar elements={save.elements} />
      <CampScene fire={level} circleActive={circleActive} hotspots={HOTSPOTS} onHotspot={onHotspot} />
      {note && (
        <button type="button" className="scene-note" onClick={() => setNote(null)}>
          {note}
        </button>
      )}

      <div className="camp-actions">
        {upcoming ? (
          <button type="button" className="primary wide" onClick={() => go({ lesson: upcoming.id })}>
            המשך ללמוד: {upcoming.title_he}
          </button>
        ) : (
          <button type="button" className="primary wide" onClick={() => go('path')}>
            כל השיעורים הושלמו — למסלול
          </button>
        )}
        <button type="button" className="secondary wide" onClick={() => go('review')} disabled={due === 0}>
          {due > 0 ? `חזרה על מילים חלשות (${due})` : 'אין כרגע מילים לחזרה'}
        </button>
        {circleActive ? (
          <button type="button" className="secondary wide magic" onClick={() => go('spells')}>
            מעגל הלחשים
          </button>
        ) : (
          <p className="muted small center-text">מעגל הלחשים יתעורר בסוף יחידה 3, עם הלחש הראשון.</p>
        )}
      </div>
      {Object.keys(save.lessons).length === 0 && (
        <section className="card welcome">
          <h2>ברוכים הבאים ליער</h2>
          <p>
            שועלה קוסמת צעירה הגיעה לבדה ליער (<span lang="la" dir="ltr">silva</span>) והקימה מחנה קטן.
            בעולם שלה לטינית היא שפת הקסם: כל שיעור נותן לה אלמנטים ומילים, ובעזרתם היא תטיל לחשים ותבנה את המחנה.
          </p>
          <p className="muted small">אפשר להקיש על המדורה, על האוהל ועל המעגל בתמונה.</p>
        </section>
      )}
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
      </section>
    </div>
  );
}
