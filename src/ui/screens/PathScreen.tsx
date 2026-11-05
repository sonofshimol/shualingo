import { buildingById, units, wordById } from '../../content';
import { lessonState, unitBlockedBy } from '../../game/actions';
import { Countdown } from '../components/common';
import { useOpenWord } from '../components/La';
import { useNow, useSave } from '../store';

const STATE_ICON = { done: '✓', available: '▶', locked: '🔒', suspended: '⏳' } as const;

/** The learning path: units and their lessons, with lock and suspension state. */
export function PathScreen({ openLesson }: { openLesson: (id: string) => void }) {
  const save = useSave();
  const now = useNow();
  const openWord = useOpenWord();
  return (
    <div className="screen path">
      <h1>מסלול הלימוד</h1>
      {units.map((unit, u) => {
        const blockedBy = unitBlockedBy(save, unit.id);
        return (
        <section key={unit.id} className={`card unit unit-${u + 1}`}>
          <p className="eyebrow">יחידה {u + 1}</p>
          <h2>{unit.title_he}</h2>
          <p className="muted">{unit.subtitle_he}</p>
          {blockedBy && (
            <p className="locked-note">
              🔒 היחידה נפתחת כשבונים במחנה את <span lang="la" dir="ltr">{buildingById.get(blockedBy)?.name_la}</span> ({buildingById.get(blockedBy)?.name_he}).
            </p>
          )}
          <div className="word-chips" dir="ltr" aria-label="המילים של היחידה (הקישו לכרטיס המילה)">
            {unit.words.map((id) => (
              <button key={id} type="button" className="chip la-tile" lang="la" onClick={() => openWord(id)}>
                {wordById.get(id)?.lemma}
              </button>
            ))}
          </div>
          <ol className="lessons">
            {unit.lessons.map((lesson) => {
              const { state, lockedUntil } = lessonState(save, lesson.id, now);
              const record = save.lessons[lesson.id];
              return (
                <li key={lesson.id}>
                  <button
                    type="button"
                    className={`lesson-tile ${state}`}
                    disabled={state === 'locked' || state === 'suspended'}
                    onClick={() => openLesson(lesson.id)}
                  >
                    <span className="lesson-icon" aria-hidden="true">{STATE_ICON[state]}</span>
                    <span className="lesson-title">{lesson.title_he}</span>
                    <span className="lesson-status">
                      {state === 'suspended' && lockedUntil && (
                        <>נח עוד <Countdown until={lockedUntil} now={now} /></>
                      )}
                      {state === 'done' && record && (record.bestMistakes === 0 ? 'מושלם' : 'הושלם')}
                      {state === 'locked' && 'נעול'}
                      {state === 'available' && 'פתוח'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
        );
      })}
      <p className="muted small center-text">יחידות נוספות ייפתחו בשלבים הבאים.</p>
    </div>
  );
}
