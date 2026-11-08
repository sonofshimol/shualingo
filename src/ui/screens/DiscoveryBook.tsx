/** ספר הגילויים — every spell found in the lab, and how many powerful ones remain. */
import { rankById } from '../../content';
import { labRules, requirementStatus } from '../../magic/effects';
import { La } from '../components/La';
import { useSave } from '../store';

export function DiscoveryBook() {
  const save = useSave();
  const found = Object.values(save.lab.discoveries).sort((a, b) => a.firstAt - b.firstAt);
  const powerfulIds = new Set(found.map((d) => d.rule).filter(Boolean));
  const powerful = found.filter((d) => d.rule);
  const other = found.filter((d) => !d.rule);
  const missing = labRules.filter((r) => !powerfulIds.has(r.id));

  return (
    <div className="screen discoveries">
      <h1>ספר הגילויים</h1>
      <p className="muted">
        לחשים בעלי כוח שגיליתם: <b>{powerfulIds.size}</b> מתוך {labRules.length}. צירופים נכונים נוספים: {other.length}.
      </p>
      {powerful.length > 0 && (
        <section className="card">
          <h2>לחשים בעלי כוח</h2>
          <ul className="discovery-list">
            {powerful.map((d) => {
              const rule = labRules.find((r) => r.id === d.rule);
              return (
                <li key={d.text}>
                  <La text={d.text} className="spell-text" />
                  <span>{rule?.name_he}</span>
                  <span className="muted small">הוטל {d.casts} פעמים</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {missing.length > 0 && (
        <section className="card">
          <h2>עוד לא התגלו</h2>
          <ul className="discovery-list secret">
            {missing.map((r) => {
              const req = requirementStatus(save, r.requires);
              return (
                <li key={r.id}>
                  <span aria-hidden="true">❓</span> <span>{r.name_he}</span>
                  {!req.ready && r.requires?.rank && <span className="muted small">(דרגת {rankById.get(r.requires.rank)?.id})</span>}
                </li>
              );
            })}
          </ul>
          <p className="muted small">רמזים: רוח היער (Spīritum vocā!) או ספר (Librum mihi affer!).</p>
        </section>
      )}
      {other.length > 0 && (
        <section className="card">
          <h2>משפטים נכונים נוספים</h2>
          <ul className="discovery-list">
            {other.map((d) => (
              <li key={d.text}>
                <La text={d.text} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
