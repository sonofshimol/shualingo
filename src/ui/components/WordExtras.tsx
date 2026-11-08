/**
 * Word-card sections added after user feedback: pronunciation in Hebrew letters,
 * the word's origin (lineage), and famous quotes.
 */
import { useState } from 'react';
import type { Word } from '../../content/types';
import { La, Ltr } from './La';

/** Syllables in Hebrew letters: bold = stressed, line above = long vowel (like ā in Latin). */
export function Pronunciation({ word, compact = false }: { word: Word; compact?: boolean }) {
  const [help, setHelp] = useState(false);
  if (!word.pron_he?.length) return null;
  return (
    <div className="pron">
      <span className="pron-label">{compact ? '' : 'הגייה: '}</span>
      <span className="pron-syllables" aria-label="הגייה באותיות עבריות">
        {word.pron_he.map((s, i) => (
          <span key={i}>
            {i > 0 && <span className="pron-dot">·</span>}
            <span className={`pron-syl ${s.stress ? 'stress' : ''} ${s.long ? 'long' : ''}`}>{s.t}</span>
          </span>
        ))}
      </span>
      {!compact && (
        <button type="button" className="mini pron-help-btn" onClick={() => setHelp(!help)} aria-expanded={help}>
          ?
        </button>
      )}
      {help && (
        <div className="pron-help small">
          <p><b>מודגש</b> = ההברה שמדגישים (ההטעמה).</p>
          <p>
            <span className="pron-syl long">קו מעל</span> = תנועה <b>ארוכה</b>. זה בדיוק מה שמסמן הקו מעל האות בלטינית (ā, ē, ī, ō, ū):
            אותו צליל, רק מחזיקים אותו כפליים זמן. ā כמו &quot;אָא&quot;, ו-a קצרה כמו &quot;אַ&quot;. לפעמים ההבדל משנה מילה: mālum (תפוח) ו-malum (רע).
          </p>
          <p>בהגייה הקלאסית c תמיד ק, v תמיד ו (כמו w באנגלית), ו-qu = קו.</p>
        </div>
      )}
    </div>
  );
}

export function Origin({ word }: { word: Word }) {
  const [more, setMore] = useState(false);
  const o = word.origin;
  if (!o && !word.etymology_en) return null;
  return (
    <section>
      <h3>מקור המילה</h3>
      {o?.unknown && <p>מקור המילה לא ידוע — גם החוקרים לא בטוחים מאיפה היא באה.</p>}
      {o && !o.unknown && (
        <>
          {o.hedge_he && <p className="muted small">{o.hedge_he} (החוקרים לא בטוחים לגמרי):</p>}
          <ol className="origin-chain">
            <li>
              <span className="origin-lang">לטינית</span> <La text={word.lemma} />
            </li>
            {o.steps.map((s, i) => (
              <li key={i}>
                <span className="origin-arrow" aria-hidden="true">↑</span> בא מ-<span className="origin-lang">{s.lang_he}</span>{' '}
                <Ltr lang="la">{s.term}</Ltr>
                {s.gloss_en && <span className="muted small"> (<Ltr lang="en">“{s.gloss_en}”</Ltr>)</span>}
              </li>
            ))}
          </ol>
          <p className="muted small">
            * = צורה משוחזרת, שהחוקרים שחזרו ולא נמצאה כתובה. פרוטו-הודו-אירופית היא שפת האם של רוב שפות אירופה, איראן והודו (לפני כ-6,000 שנה);
            פרוטו-איטלקית היא האם של הלטינית ושל שכנותיה באיטליה העתיקה.
          </p>
        </>
      )}
      {word.etymology_en && (
        <>
          <button type="button" className="mini" onClick={() => setMore(!more)} aria-expanded={more}>
            {more ? 'הסתרת הפירוט' : 'הפירוט המלא (באנגלית, מוויקימילון)'}
          </button>
          {more && <p className="etymology-full small" dir="ltr" lang="en">{word.etymology_en}</p>}
        </>
      )}
    </section>
  );
}

export function Quotes({ word }: { word: Word }) {
  if (!word.quotes?.length) return null;
  return (
    <section>
      <h3>ציטוטים מפורסמים</h3>
      <ul className="quotes">
        {word.quotes.map((q) => (
          <li key={q.text}>
            <La text={q.text} className="la-strong quote-text" />
            <span>{q.meaning_he}</span>
            <span className="muted small">— {q.author_he}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
