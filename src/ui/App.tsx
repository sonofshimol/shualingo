import { useCallback, useEffect, useState } from 'react';
import { WordCardContext } from './components/La';
import { WordCard } from './components/WordCard';
import { CampScreen } from './screens/CampScreen';
import { LessonScreen } from './screens/LessonScreen';
import { PathScreen } from './screens/PathScreen';
import { ReviewScreen } from './screens/ReviewScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { MagicTab } from './screens/MagicTab';
import { VerbaScreen } from './screens/VerbaScreen';
import { useSave } from './store';

type Tab = 'camp' | 'path' | 'words' | 'spells' | 'settings';
type Session = { kind: 'lesson'; id: string } | { kind: 'review' } | null;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'camp', label: 'מחנה', icon: '🔥' },
  { id: 'path', label: 'מסלול', icon: '📜' },
  { id: 'words', label: 'מילים', icon: '📖' },
  { id: 'spells', label: 'לחשים', icon: '✨' },
  { id: 'settings', label: 'הגדרות', icon: '⚙' },
];

export function App() {
  const save = useSave();
  const [tab, setTab] = useState<Tab>('camp');
  const [session, setSession] = useState<Session>(null);
  const [wordId, setWordId] = useState<string | null>(null);
  const [spellPick, setSpellPick] = useState<string | undefined>(undefined);

  // The phone's back button leaves a lesson instead of closing the app.
  useEffect(() => {
    const onPop = () => setSession(null);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openSession = useCallback((next: NonNullable<Session>) => {
    if (!window.history.state?.session) window.history.pushState({ session: true }, '');
    setSession(next);
  }, []);

  const closeSession = useCallback(() => {
    if (window.history.state?.session) window.history.back();
    else setSession(null);
  }, []);

  const go = (target: 'path' | 'review' | 'spells' | { lesson: string } | { spell: string }) => {
    if (target === 'review') openSession({ kind: 'review' });
    else if (typeof target === 'object' && 'lesson' in target) openSession({ kind: 'lesson', id: target.lesson });
    else if (typeof target === 'object') {
      setSpellPick(target.spell);
      setTab('spells');
    } else setTab(target);
  };

  let content;
  if (session?.kind === 'lesson') {
    content = (
      <LessonScreen
        key={session.id}
        lessonId={session.id}
        onExit={() => {
          setTab('path');
          closeSession();
        }}
        onOpenLesson={(id) => setSession({ kind: 'lesson', id })}
      />
    );
  } else if (session?.kind === 'review') {
    content = <ReviewScreen onExit={closeSession} />;
  } else if (tab === 'camp') content = <CampScreen go={go} />;
  else if (tab === 'path') content = <PathScreen openLesson={(id) => openSession({ kind: 'lesson', id })} />;
  else if (tab === 'words') content = <VerbaScreen />;
  else if (tab === 'spells') content = <MagicTab key={`${save.spellbook.join()}|${spellPick}`} initialSpell={spellPick} />;
  else content = <SettingsScreen />;

  return (
    <WordCardContext.Provider value={setWordId}>
      <div className="app">
        <main className="app-main">{content}</main>
        {!session && (
          <nav className="tab-bar" aria-label="ניווט">
            {TABS.map((t) => (
              <button key={t.id} type="button" className={`tab ${tab === t.id ? 'active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => { setSpellPick(undefined); setTab(t.id); }}>
                <span className="tab-icon" aria-hidden="true">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </nav>
        )}
        {wordId && <WordCard wordId={wordId} onClose={() => setWordId(null)} />}
      </div>
    </WordCardContext.Provider>
  );
}
