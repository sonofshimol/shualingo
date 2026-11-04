import { useEffect, useRef } from 'react';
import type { Exercise } from '../../content/types';
import { CorrectAnswer, explanationFor, SolvedSentence } from '../exercises/ExerciseView';

/** The panel after "check": green when right, otherwise the right answer and a short explanation. */
export function Feedback({ correct, exercise, onContinue, requeued = true }: { correct: boolean; exercise: Exercise; onContinue: () => void; requeued?: boolean }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  const explanation = explanationFor(exercise);
  return (
    <div className={`feedback ${correct ? 'good' : 'bad'}`} role="status" aria-live="assertive">
      <h3>{correct ? 'נכון!' : 'לא בדיוק'}</h3>
      {correct ? (
        <SolvedSentence exercise={exercise} />
      ) : (
        <>
          <p className="feedback-label">התשובה הנכונה:</p>
          <div className="feedback-answer">
            <CorrectAnswer exercise={exercise} />
          </div>
          {explanation && <p className="feedback-explain">{explanation}</p>}
          {requeued && <p className="muted small">התרגיל יחזור בסוף השיעור.</p>}
        </>
      )}
      <button ref={button} type="button" className="primary wide" onClick={onContinue}>
        המשך
      </button>
    </div>
  );
}
