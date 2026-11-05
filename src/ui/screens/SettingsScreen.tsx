import { useRef, useState } from 'react';
import { CONFIG } from '../../config';
import { downloadBackup, readBackup } from '../../storage/backup';
import { play } from '../feedback/sfx';
import { getSave, replaceSave, updateSave, useSave } from '../store';

/** Backup, game constants and credits (required by the CC BY-SA sources). */
export function SettingsScreen() {
  const save = useSave();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = readBackup(await file.text());
      if (!window.confirm('לטעון את הגיבוי? ההתקדמות הנוכחית במכשיר תוחלף בזו שבקובץ.')) return;
      replaceSave(imported);
      setMessage({ ok: true, text: 'הגיבוי נטען בהצלחה.' });
    } catch (error) {
      setMessage({ ok: false, text: (error as Error).message });
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const completed = Object.keys(save.lessons).length;
  return (
    <div className="screen settings">
      <h1>הגדרות</h1>

      <section className="card">
        <h2>צלילים ורטט</h2>
        <label className="toggle">
          <input
            type="checkbox"
            checked={save.settings.sound}
            onChange={(e) => {
              const sound = e.target.checked;
              updateSave((s) => ({ ...s, settings: { ...s.settings, sound } }));
              if (sound) window.setTimeout(() => play('correct'), 50);
            }}
          />
          <span>צלילים</span>
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={save.settings.vibration}
            onChange={(e) => {
              const vibration = e.target.checked;
              updateSave((s) => ({ ...s, settings: { ...s.settings, vibration } }));
              if (vibration) window.setTimeout(() => play('harvest'), 50);
            }}
          />
          <span>רטט</span>
        </label>
        <p className="muted small">רטט עובד באנדרואיד. באייפון דפדפנים לא מאפשרים לאתרים לרטוט.</p>
      </section>

      <section className="card">
        <h2>גיבוי</h2>
        <p>ההתקדמות נשמרת רק במכשיר הזה. כדי לא לאבד אותה, או כדי לעבור לטלפון אחר, שמרו קובץ גיבוי.</p>
        <p className="muted small">שיעורים שהושלמו: {completed} · מילים בחזרה: {Object.keys(save.cards).filter((c) => c.startsWith('word:')).length}</p>
        <div className="button-row">
          <button type="button" className="primary" onClick={() => downloadBackup(getSave(), Date.now())}>
            שמירת קובץ גיבוי
          </button>
          <button type="button" className="secondary" onClick={() => fileInput.current?.click()}>
            טעינת גיבוי
          </button>
        </div>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => void onImport(e.target.files?.[0])} />
        {message && <p className={message.ok ? 'ok-text' : 'error-text'} role="status">{message.text}</p>}
      </section>

      <section className="card">
        <h2>איך המשחק עובד</h2>
        <ul className="plain-list">
          <li>טעות לא מענישה: פשוט לא מרוויחים עליה, והתרגיל חוזר בסוף השיעור.</li>
          <li>{CONFIG.LESSON_MISTAKES_TO_FAIL} טעויות באותו שיעור מסיימות את הניסיון בלי תגמול.</li>
          <li>אחרי {CONFIG.FAILURES_BEFORE_SUSPENSION} ניסיונות שנכשלו, רק המשימה הזאת נחה {CONFIG.SUSPENSION_HOURS} שעות. כל השאר ממשיך.</li>
          <li>המדורה שורפת יחידת עץ כל {CONFIG.FIRE_BURN_HOURS} שעות, גם כשהאפליקציה סגורה.</li>
          <li>המבנים מייצרים אלמנטים גם כשהאפליקציה סגורה. אפשר לקצור מהם עד {CONFIG.DAILY_HARVEST_CAP} ביום, כדי שהשיעורים יישארו העיקר.</li>
          <li>האלמנטים מסומנים בסמלים הקלאסיים: ignis △, aer △ עם קו, aqua ▽, terra ▽ עם קו, aether ★.</li>
        </ul>
      </section>

      <section className="card credits">
        <h2>קרדיטים</h2>
        <ul className="plain-list">
          <li>
            אוצר המילים: <a href="https://dcc.dickinson.edu/latin-core-list1" target="_blank" rel="noreferrer">DCC Latin Core Vocabulary</a>,
            Dickinson College Commentaries (CC BY-SA).
          </li>
          <li>
            נטיות, הגייה ומילים קרובות: <a href="https://en.wiktionary.org/" target="_blank" rel="noreferrer">ויקימילון</a> דרך{' '}
            <a href="https://kaikki.org/dictionary/Latin/" target="_blank" rel="noreferrer">kaikki.org</a> (CC BY-SA).
          </li>
          <li>סדר היחידות: <i>Latin for Beginners</i>, Benjamin L. D'Ooge (1909, נחלת הכלל).</li>
          <li>
            חזרה מרווחת: <a href="https://github.com/open-spaced-repetition/ts-fsrs" target="_blank" rel="noreferrer">ts-fsrs</a> (MIT).
          </li>
          <li>גופנים: Frank Ruhl Libre ו-Cinzel (SIL Open Font License).</li>
          <li>פיקסל-ארט וצלילים מקוריים של שועלינגו.</li>
        </ul>
      </section>
      <p className="muted small center-text">שועלינגו · שלב 2 · חינמי לגמרי, בלי שרת, בלי חשבונות ובלי פרסומות.</p>
    </div>
  );
}
