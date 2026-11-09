/** The words tab: the word game (decks) and the reading library. */
import { useState } from 'react';
import { LibraryScreen } from './LibraryScreen';
import { VerbaScreen } from './VerbaScreen';

export function WordsTab() {
  const [view, setView] = useState<'decks' | 'library'>('decks');
  return (
    <div>
      <div className="segmented two" role="tablist">
        <button type="button" role="tab" aria-selected={view === 'decks'} className={view === 'decks' ? 'active' : ''} onClick={() => setView('decks')}>
          חפיסות מילים
        </button>
        <button type="button" role="tab" aria-selected={view === 'library'} className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}>
          ספרייה: טקסטים ובדיחות
        </button>
      </div>
      {view === 'decks' ? <VerbaScreen /> : <LibraryScreen />}
    </div>
  );
}
