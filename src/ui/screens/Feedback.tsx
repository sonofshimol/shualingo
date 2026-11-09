import { useEffect, useRef } from 'react';
import type { Exercise } from '../../content/types';
import { diagnoseExercise, type GivenAnswer } from '../../learning/diagnose';
import { CorrectAnswer, explanationFor, SolvedSentence } from '../exercises/ExerciseView';

/** The panel after "check": green when right, otherwise the right answer and a short explanation. */
export function Feedback({ correct, exercise, onContinue, requeued = true, given }: { correct: boolean; exercise: Exercise; onContinue: () => void; requeued?: boolean; given?: GivenAnswer }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  // A precise diagnosis of this answer beats the exercise's general rule (which may be about another word).
  const diagnosis = correct ? [] : diagnoseExercise(exercise, given);
  const explanation = diagnosis.length ? exercise.explain_he ?? null : explanationFor(exercise);
  return (
    <div className={`feedback ${correct ? 'good' : 'bad'}`} role="status" aria-live="assertive">
      <h3>{correct ? '✓ נכון!' : '✗ לא בדיוק'}</h3>
      {correct ? (
        <SolvedSentence exercise={exercise} />
      ) : (
        <>
          <p className="feedback-label">התשובה הנכונה:</p>
          <div className="feedback-answer">
            <CorrectAnswer exercise={exercise} />
          </div>
          {diagnosis.length > 0 && (
            <div className="feedback-diagnosis">
              <p className="feedback-label">מה השתבש:</p>
              {diagnosis.map((d) => <p key={d} className="feedback-explain strong">{d}</p>)}
            </div>
          )}
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
