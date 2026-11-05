import { useMemo, useState } from 'react';
import type { ElementDelta } from '../../game/elements';
import { finishReview } from '../../game/actions';
import { buildReview } from '../../learning/review';
import { nextDue } from '../../learning/srs';
import { FOX } from '../../art/sprites';
import { SpriteView } from '../../art/CampScene';
import { Countdown, ElementList } from '../components/common';
import { play } from '../feedback/sfx';
import { getSave, updateSave, useNow, useSave } from '../store';
import { ExerciseView } from '../exercises/ExerciseView';
import { Feedback } from './Feedback';
import { SessionHeader } from './LessonScreen';

/** "חזרה": weak and due words and rules, chosen by FSRS. Correct answers earn aqua. */
export function ReviewScreen({ onExit }: { onExit: () => void }) {
  const save = useSave();
  const now = useNow();
  const items = useMemo(() => buildReview(getSave().cards, Date.now()), []);
  const [position, setPosition] = useState(0);
  const [results, setResults] = useState<{ cards: string[]; correct: boolean }[]>([]);
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [earned, setEarned] = useState<ElementDelta | null>(null);

  if (items.length === 0) {
    const due = nextDue(save.cards);
    return (
      <div className="screen center">
        <SpriteView sprite={FOX} scale={5} label="השועלה" rank={save.rank} />
        <h2>אין מה לחזור עליו כרגע</h2>
        {Object.keys(save.cards).length === 0 ? (
          <p>המילים נכנסות לחזרה אחרי השיעור הראשון.</p>
        ) : (
          due && <p>החזרה הבאה בעוד <Countdown until={due} now={now} /></p>
        )}
        <button type="button" className="primary" onClick={onExit}>חזרה</button>
      </div>
    );
  }

  if (earned) {
    const correct = results.filter((r) => r.correct).length;
    return (
      <div className="screen session end-screen">
        <SpriteView sprite={FOX} scale={5} label="השועלה" rank={save.rank} />
        <h2>החזרה הושלמה</h2>
        <p>{correct} מתוך {results.length} נכונות.</p>
        <p>הרווחת: <ElementList delta={earned} pop /></p>
        <button type="button" className="primary" onClick={onExit}>חזרה למחנה</button>
      </div>
    );
  }

  const item = items[position];
  const proceed = () => {
    if (feedback === null) return;
    const nextResults = [...results, { cards: item.cards, correct: feedback }];
    setResults(nextResults);
    setFeedback(null);
    if (position + 1 < items.length) {
      setPosition(position + 1);
    } else {
      const outcome = finishReview(getSave(), nextResults, Date.now());
      updateSave(() => outcome.save);
      setEarned(outcome.earned);
      play('complete');
    }
  };
  const exit = () => {
    if (window.confirm('לצאת מהחזרה? התשובות בסבב הזה לא יישמרו.')) onExit();
  };

  return (
    <div className="screen session">
      <SessionHeader progress={position / items.length} onExit={exit} />
      <p className="session-sub">חזרה על מילים וכללים חלשים</p>
      <ExerciseView key={position} exercise={item.exercise} locked={feedback !== null} onSubmit={(ok) => { play(ok ? 'correct' : 'wrong'); setFeedback(ok); }} />
      {feedback !== null && <Feedback correct={feedback} exercise={item.exercise} onContinue={proceed} requeued={false} />}
    </div>
  );
}
