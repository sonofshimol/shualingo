/** Verba — the word mini-game: themed decks, quick rounds, words anchored to familiar ones. */
import { useEffect, useRef, useState } from 'react';
import { CONFIG } from '../../config';
import { decks, wordById } from '../../content';
import type { ElementDelta } from '../../game/elements';
import { buildRound, deckProgress, finishRound, verbaLeftToday, type VerbaCard } from '../../learning/verba';
import { ElementList, ProgressBar } from '../components/common';
import { ElementIcon } from '../components/ElementIcon';
import { La, Ltr } from '../components/La';
import { play } from '../feedback/sfx';
import { getSave, updateSave, useNow, useSave } from '../store';

/** A short line that ties the word to words the player already knows. */
function Anchors({ wordId }: { wordId: string }) {
  const word = wordById.get(wordId)!;
  const en = (word.family.en ?? []).slice(0, 3);
  const he = (word.family.he ?? []).slice(0, 2);
  const romance = ['es', 'it', 'fr'].map((l) => (word.family[l] as string[] | undefined)?.[0]).filter(Boolean) as string[];
  if (!en.length && !he.length && !romance.length) return null;
  return (
    <p className="anchors">
      קרוב ל: {en.length > 0 && <Ltr lang="en">{en.join(', ')}</Ltr>}
      {he.length > 0 && <>{en.length ? ' · ' : ''}{he.join(', ')}</>}
      {romance.length > 0 && <> · <Ltr>{romance.join(' / ')}</Ltr></>}
    </p>
  );
}

function IntroCard({ wordId, onNext }: { wordId: string; onNext: () => void }) {
  const word = wordById.get(wordId)!;
  const expression = word.expressions[0];
  return (
    <div className="verba-card intro" style={{ '--el': undefined } as React.CSSProperties}>
      <p className="eyebrow">מילה חדשה</p>
      <div className="verba-lemma"><La text={word.lemma} /></div>
      {word.ipa && <p className="muted small"><Ltr>{word.ipa}</Ltr></p>}
      <p className="verba-meaning">{word.meaning_he}</p>
      <Anchors wordId={wordId} />
      {expression && (
        <p className="small">
          <span className="la-strong" dir="ltr" lang="la">{expression.text}</span> — {expression.meaning_he}
        </p>
      )}
      <button type="button" className="primary wide" onClick={onNext} autoFocus>
        הבנתי
      </button>
    </div>
  );
}

function QuizCard({ card, onAnswer }: { card: Extract<VerbaCard, { kind: 'quiz' }>; onAnswer: (correct: boolean) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const after = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (picked !== null) after.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [picked]);
  const word = wordById.get(card.wordId)!;
  const latinOptions = card.direction === 'he-la';
  const answered = picked !== null;
  const choose = (option: string) => {
    if (answered) return;
    setPicked(option);
    play(option === card.answer ? 'correct' : 'wrong');
  };
  return (
    <div className="verba-card">
      <p className="instruction">{latinOptions ? 'איך אומרים בלטינית?' : 'מה הפירוש?'}</p>
      <div className="verba-lemma">{latinOptions ? <span className="verba-meaning">{word.meaning_he}</span> : <span dir="ltr" lang="la">{word.lemma}</span>}</div>
      <div className="options verba-options" role="radiogroup">
        {card.options.map((option) => {
          const state = answered ? (option === card.answer ? 'correct' : option === picked ? 'wrong' : '') : '';
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={picked === option}
              className={`option ${latinOptions ? 'la-tile' : ''} ${state}`}
              dir={latinOptions ? 'ltr' : undefined}
              lang={latinOptions ? 'la' : undefined}
              disabled={answered}
              onClick={() => choose(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
      {answered && (
        <div ref={after} className={`verba-after ${picked === card.answer ? 'good' : 'bad'}`} role="status">
          <p className="strong">
            {picked === card.answer ? '✓ נכון!' : '✗ לא בדיוק'} <La text={word.lemma} /> = {word.meaning_he}
          </p>
          <Anchors wordId={card.wordId} />
          <button type="button" className="primary wide" onClick={() => onAnswer(picked === card.answer)} autoFocus>
            הבא
          </button>
        </div>
      )}
    </div>
  );
}

export function VerbaScreen() {
  const save = useSave();
  const now = useNow(30000);
  const [deckId, setDeckId] = useState<string | null>(null);
  const [cards, setCards] = useState<VerbaCard[]>([]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<{ wordId: string; correct: boolean }[]>([]);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [earned, setEarned] = useState<ElementDelta | null>(null);

  const start = (id: string) => {
    play('tap');
    setDeckId(id);
    setCards(buildRound(getSave(), id, Date.now()));
    setIndex(0);
    setResults([]);
    setStreak(0);
    setBest(0);
    setEarned(null);
  };

  const next = () => {
    if (index + 1 < cards.length) setIndex(index + 1);
    else {
      const outcome = finishRound(getSave(), results, Date.now());
      updateSave(() => outcome.save);
      setEarned(outcome.earned);
      play('complete');
    }
  };

  const answer = (correct: boolean) => {
    const card = cards[index];
    const nextResults = [...results, { wordId: card.wordId, correct }];
    setResults(nextResults);
    const s = correct ? streak + 1 : 0;
    setStreak(s);
    setBest(Math.max(best, s));
    if (correct && s > 0 && s % 3 === 0) play('harvest');
    if (index + 1 < cards.length) setIndex(index + 1);
    else {
      const outcome = finishRound(getSave(), nextResults, Date.now());
      updateSave(() => outcome.save);
      setEarned(outcome.earned);
      play('complete');
    }
  };

  // ---- deck list
  if (!deckId) {
    const left = verbaLeftToday(save, now);
    return (
      <div className="screen verba">
        <h1><span lang="la" dir="ltr" className="la-title">Verba</span> · משחק המילים</h1>
        <p className="muted">
          חפיסות של מילים נפוצות. כל מילה חדשה מוצגת קודם עם מילים מוכרות שקרובות אליה, ואחר כך חוזרת כשאלה. מילים שלמדת חוזרות גם במסך החזרה.
        </p>
        <p className="small">
          כל תשובה נכונה נותנת את האלמנט של המילה עצמה. היום אפשר להרוויח עוד {left} מתוך {CONFIG.VERBA_DAILY_CAP}.
        </p>
        <div className="deck-grid">
          {decks.map((deck) => {
            const p = deckProgress(save, deck.id);
            return (
              <button key={deck.id} type="button" className="deck-card" onClick={() => start(deck.id)}>
                <ElementIcon id={deck.element} size={26} />
                <span className="deck-name" lang="la" dir="ltr">{deck.name_la}</span>
                <span className="deck-he">{deck.name_he}</span>
                <ProgressBar value={p.total ? p.learned / p.total : 0} label={`נלמדו ${p.learned} מתוך ${p.total}`} />
                <span className="small muted">נלמדו {p.learned}/{p.total}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const deck = decks.find((d) => d.id === deckId)!;

  // ---- round summary
  if (earned) {
    const correct = results.filter((r) => r.correct).length;
    const p = deckProgress(save, deck.id);
    return (
      <div className="screen session end-screen">
        <h2><span lang="la" dir="ltr">{deck.name_la}</span>: הסבב הסתיים</h2>
        <p>{correct} מתוך {results.length} נכונות · הרצף הארוך ביותר: {best}</p>
        <p>הרווחת: <ElementList delta={earned} pop /></p>
        <p className="small">בחפיסה נלמדו {p.learned} מתוך {p.total} מילים.</p>
        <div className="button-row">
          <button type="button" className="primary" onClick={() => start(deck.id)}>סבב נוסף</button>
          <button type="button" className="secondary" onClick={() => setDeckId(null)}>לכל החפיסות</button>
        </div>
      </div>
    );
  }

  const card = cards[index];
  return (
    <div className="screen session verba-round">
      <div className="session-header">
        <button type="button" className="icon-button" onClick={() => setDeckId(null)} aria-label="יציאה">✕</button>
        <ProgressBar value={index / cards.length} label="התקדמות בסבב" />
        <span className={`streak ${streak >= 3 ? 'hot' : ''}`} aria-label={`רצף ${streak}`}>×{streak}</span>
      </div>
      <p className="session-sub"><span lang="la" dir="ltr">{deck.name_la}</span> · {deck.name_he}</p>
      {card.kind === 'intro' ? (
        <IntroCard key={index} wordId={card.wordId} onNext={next} />
      ) : (
        <QuizCard key={index} card={card} onAnswer={answer} />
      )}
    </div>
  );
}
