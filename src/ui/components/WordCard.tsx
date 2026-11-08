/** "משפחת המילה": origin, relatives in many languages, familiar expressions, and the forms. */
import { elementById, wordById } from '../../content';
import type { Word } from '../../content/types';
import { Ltr } from './La';
import { Sheet } from './Sheet';
import { Origin, Pronunciation, Quotes } from './WordExtras';

const LANGS: { code: string; name: string }[] = [
  { code: 'en', name: 'אנגלית' },
  { code: 'he', name: 'עברית' },
  { code: 'es', name: 'ספרדית' },
  { code: 'it', name: 'איטלקית' },
  { code: 'fr', name: 'צרפתית' },
  { code: 'pt', name: 'פורטוגזית' },
  { code: 'ro', name: 'רומנית' },
  { code: 'ca', name: 'קטלאנית' },
];

const POS_HE: Record<Word['pos'], string> = {
  noun: 'שם עצם', verb: 'פועל', adj: 'שם תואר', pron: 'כינוי גוף', conj: 'מילת חיבור', adv: 'תואר הפועל', prep: 'מילת יחס',
};

const NOUN_ROWS: { key: string; he: string }[] = [
  { key: 'nom', he: 'מי? (נושא)' },
  { key: 'acc', he: 'את מי? (מושא)' },
  { key: 'dat', he: 'למי? (נתינה)' },
];

const VERB_ROWS: { key: string; he: string }[] = [
  { key: 'pres.3sg', he: 'הוא/היא' },
  { key: 'pres.3pl', he: 'הם/הן' },
  { key: 'imp.2sg', he: 'ציווי (לאחד)' },
  { key: 'imp.2pl', he: 'ציווי (לרבים)' },
  { key: 'inf', he: 'שם הפועל' },
];

function FormsTable({ word }: { word: Word }) {
  if (word.pos === 'verb') {
    const rows = VERB_ROWS.filter((r) => word.forms[r.key]);
    if (!rows.length) return null;
    return (
      <table className="forms">
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th scope="row">{r.he}</th>
              <td dir="ltr" lang="la">{word.forms[r.key]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const suffix = word.pos === 'adj' ? '.f' : '';
  const rows = NOUN_ROWS.filter((r) => word.forms[`${r.key}.sg${suffix}`]);
  if (!rows.length) return null;
  return (
    <table className="forms">
      <thead>
        <tr>
          <th />
          <th scope="col">יחיד</th>
          {word.forms[`nom.pl${suffix}`] && <th scope="col">רבים</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <th scope="row">{r.he}</th>
            <td dir="ltr" lang="la">{word.forms[`${r.key}.sg${suffix}`]}</td>
            {word.forms[`${r.key}.pl${suffix}`] && <td dir="ltr" lang="la">{word.forms[`${r.key}.pl${suffix}`]}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WordCard({ wordId, onClose }: { wordId: string; onClose: () => void }) {
  const word = wordById.get(wordId);
  if (!word) return null;
  const element = elementById.get(word.element);
  const relatives = LANGS.map((l) => ({ ...l, list: (word.family[l.code] as string[] | undefined) ?? [] })).filter((l) => l.list.length);

  return (
    <Sheet title="משפחת המילה" onClose={onClose}>
      <div className="word-card">
        <div className="word-head">
          <div className="word-lemma" dir="ltr" lang="la">{word.lemma}</div>
          <div className="word-meaning">{word.meaning_he}</div>
          <Pronunciation word={word} />
          <div className="word-meta">
            <Ltr lang="la">{word.dictionary_form}</Ltr> · {POS_HE[word.pos]}
            {word.ipa && <> · <Ltr>{word.ipa}</Ltr></>}
          </div>
          {element && (
            <div className="word-element">
              <span className="dot" style={{ background: element.color }} /> בלחשים המילה עולה <b lang="la">{word.element}</b> ({element.name_he})
            </div>
          )}
        </div>

        {relatives.length > 0 && (
          <section>
            <h3>מילים קרובות</h3>
            <dl className="relatives">
              {relatives.map((r) => (
                <div key={r.code} className="relative-row">
                  <dt>{r.name}</dt>
                  <dd>{r.code === 'he' ? r.list.join(', ') : <Ltr lang={r.code}>{r.list.join(', ')}</Ltr>}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {word.expressions.length > 0 && (
          <section>
            <h3>ביטויים מוכרים</h3>
            <ul className="expressions">
              {word.expressions.map((e) => (
                <li key={e.text}>
                  <span className="la-strong" dir="ltr" lang="la">{e.text}</span>
                  <span> — {e.meaning_he}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Quotes word={word} />

        <Origin word={word} />

        {word.family.note_he && (
          <section>
            <h3>הקשר</h3>
            <p>{word.family.note_he}</p>
          </section>
        )}

        <section>
          <h3>צורות</h3>
          <FormsTable word={word} />
          {!Object.keys(word.forms).length && <p className="muted">המילה לא משתנה.</p>}
        </section>

        <p className="source muted">
          {word.dcc_rank ? <>מקום {word.dcc_rank} ברשימת המילים הנפוצות (DCC). </> : <>מילה מחוץ לרשימת DCC, נוספה בשביל הלחש. </>}
          נטיות והגייה: ויקימילון.
        </p>
      </div>
    </Sheet>
  );
}
