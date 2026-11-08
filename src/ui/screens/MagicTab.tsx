/** The spells tab: the taught spells (circle), the spell lab, and the book of discoveries. */
import { useState } from 'react';
import { DiscoveryBook } from './DiscoveryBook';
import { LabScreen } from './LabScreen';
import { SpellScreen } from './SpellScreen';
import { useSave } from '../store';

type View = 'circle' | 'lab' | 'book';

export function MagicTab({ initialSpell }: { initialSpell?: string }) {
  const save = useSave();
  const [view, setView] = useState<View>('circle');
  const labOpen = save.spellbook.length > 0;
  return (
    <div className="magic-tab">
      {labOpen && (
        <div className="segmented" role="tablist">
          {([['circle', 'ספר הלחשים'], ['lab', 'מעבדה'], ['book', 'גילויים']] as [View, string][]).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {view === 'circle' || !labOpen ? <SpellScreen initialSpell={initialSpell} /> : view === 'lab' ? <LabScreen /> : <DiscoveryBook />}
    </div>
  );
}
