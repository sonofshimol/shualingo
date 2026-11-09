import { useState } from 'react';
import { CONFIG } from '../../config';
import { lessonById, ruleById, spellById, unitOfLesson } from '../../content';
import type { Rule } from '../../content/types';
import { finishLesson, lessonState, nextLesson, type LessonOutcome } from '../../game/actions';
import { answerExercise, lessonProgress, startLesson, type LessonRun } from '../../learning/lessonRun';
import { FOX } from '../../art/sprites';
import { SpriteView } from '../../art/CampScene';
import { Countdown, ElementList, ProgressBar } from '../components/common';
import { La } from '../components/La';
import { play } from '../feedback/sfx';
import { getSave, updateSave, useNow, useSave } from '../store';
import { Feedback } from './Feedback';
import { ExerciseView } from '../exercises/ExerciseView';

export function RuleCards({ rules, onDone }: { rules: Rule[]; onDone: () => void }) {
  return (
    <div className="rule-intro">
      <p className="eyebrow">לפני שמתחילים</p>
      {rules.map((rule) => (
        <article key={rule.id} className="rule-card">
          <h3>{rule.title_he}</h3>
          <p>{rule.explain_he}</p>
          <ul>
            {rule.examples.map((ex) => (
              <li key={ex.la}>
                <La text={ex.la} className="la-strong" /> — {ex.he}
              </li>
            ))}
          </ul>
        </article>
      ))}
      <p className="muted small">טיפ: הקישו על כל מילה לטינית כדי לראות את משפחת המילה שלה.</p>
      <button type="button" className="primary wide" onClick={onDone}>
        הבנתי, מתחילים
      </button>
    </div>
  );
}

export function SessionHeader({ progress, onExit, mistakes }: { progress: number; onExit: () => void; mistakes?: number }) {
  return (
    <div className="session-header">
      <button type="button" className="icon-button" onClick={onExit} aria-label="יציאה">
        ✕
      </button>
      <ProgressBar value={progress} label="התקדמות" />
      {mistakes !== undefined && (
        <span className="mistakes" aria-label={`${mistakes} טעויות מתוך ${CONFIG.LESSON_MISTAKES_TO_FAIL}`}>
          {Array.from({ length: CONFIG.LESSON_MISTAKES_TO_FAIL }, (_, i) => (
            <span key={i} className={`mistake-dot ${i < mistakes ? 'used' : ''}`} />
          ))}
        </span>
      )}
    </div>
  );
}

export function LessonScreen({ lessonId, onExit, onOpenLesson }: { lessonId: string; onExit: () => void; onOpenLesson: (id: string) => void }) {
  const lesson = lessonById.get(lessonId)!;
  const unit = unitOfLesson.get(lessonId)!;
  const save = useSave();
  const now = useNow();
  const introRules = lesson.rules_intro.map((id) => ruleById.get(id)).filter((r): r is Rule => Boolean(r));
  const [phase, setPhase] = useState<'intro' | 'exercise' | 'end'>(introRules.length ? 'intro' : 'exercise');
  const [run, setRun] = useState<LessonRun>(() => startLesson(lesson));
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [given, setGiven] = useState<string | string[] | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<LessonOutcome | null>(null);

  const status = lessonState(save, lessonId, now);
  if (phase !== 'end' && status.state === 'suspended') {
    return (
      <div className="screen center">
        <p>השיעור הזה נח עכשיו.</p>
        <p>נפתח שוב בעוד <Countdown until={status.lockedUntil!} now={now} /></p>
        <button type="button" className="primary" onClick={onExit}>חזרה</button>
      </div>
    );
  }

  const exit = () => {
    if (phase === 'end' || window.confirm('לצאת מהשיעור? ההתקדמות בשיעור הזה לא תישמר.')) onExit();
  };

  const proceed = () => {
    if (feedback === null) return;
    const next = answerExercise(run, lesson, feedback);
    setFeedback(null);
    setAttempt((a) => a + 1);
    setRun(next);
    if (next.status !== 'running') {
      const result = finishLesson(getSave(), next, Date.now());
      updateSave(() => result.save);
      setOutcome(result.outcome);
      setPhase('end');
      play(result.outcome.passed ? 'complete' : 'fizzle');
    }
  };

  const retry = () => {
    setRun(startLesson(lesson));
    setOutcome(null);
    setFeedback(null);
    setPhase(introRules.length ? 'intro' : 'exercise');
  };

  if (phase === 'intro') {
    return (
      <div className="screen session">
        <SessionHeader progress={0} onExit={exit} />
        <h2 className="session-title">{lesson.title_he}</h2>
        <RuleCards rules={introRules} onDone={() => setPhase('exercise')} />
      </div>
    );
  }

  if (phase === 'end' && outcome) {
    const following = nextLesson(save);
    const followingOpen = following && lessonState(save, following.id, now).state === 'available';
    const task = save.tasks[`lesson:${lessonId}`];
    return (
      <div className="screen session end-screen">
        <SpriteView sprite={FOX} scale={5} label="השועלה" rank={save.rank} />
        {outcome.passed ? (
          <>
            <h2>כל הכבוד! סיימת את השיעור</h2>
            <p>הרווחת: <ElementList delta={outcome.earned} pop /></p>
            {outcome.dailyBonus && <p className="muted">כולל בונוס aether על השיעור הראשון של היום.</p>}
            {outcome.newSpells.map((id) => (
              <div key={id} className="new-spell">
                <p className="eyebrow">לחש חדש נכנס לספר הלחשים</p>
                <La text={spellById.get(id)!.text} className="spell-text" />
                <p>{spellById.get(id)!.meaning_he}</p>
              </div>
            ))}
            <div className="button-row">
              {followingOpen && (
                <button type="button" className="primary" onClick={() => onOpenLesson(following.id)}>
                  לשיעור הבא
                </button>
              )}
              <button type="button" className={followingOpen ? 'secondary' : 'primary'} onClick={onExit}>
                חזרה למסלול
              </button>
            </div>
          </>
        ) : (
          <>
            <h2>הפעם זה לא הצליח</h2>
            <p>בניסיון הזה אין תגמול, אבל גם אין עונש. המילים שהתבלבלת בהן ייכנסו לחזרה.</p>
            {outcome.lockedNow && task?.lockedUntil ? (
              <p>
                השיעור הזה ינוח {CONFIG.SUSPENSION_HOURS} שעות ויפתח בעוד <Countdown until={task.lockedUntil} now={now} />.
                בינתיים אפשר לעשות חזרה או לבקר במחנה.
              </p>
            ) : (
              <p className="muted">
                עוד {CONFIG.FAILURES_BEFORE_SUSPENSION - (task?.failures ?? 0)} ניסיונות לפני שהשיעור ינוח קצת.
              </p>
            )}
            <div className="button-row">
              {!outcome.lockedNow && (
                <button type="button" className="primary" onClick={retry}>
                  לנסות שוב
                </button>
              )}
              <button type="button" className="secondary" onClick={onExit}>
                חזרה למסלול
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  const index = run.queue[0];
  const exercise = lesson.exercises[index];
  return (
    <div className="screen session">
      <SessionHeader progress={lessonProgress(run, lesson)} onExit={exit} mistakes={run.mistakes} />
      <p className="session-sub">{unit.title_he} · {lesson.title_he}</p>
      <ExerciseView key={`${index}-${attempt}`} exercise={exercise} locked={feedback !== null} onSubmit={(ok, ans) => { play(ok ? 'correct' : 'wrong'); setGiven(ans); setFeedback(ok); }} />
      {feedback !== null && <Feedback correct={feedback} exercise={exercise} onContinue={proceed} given={given} />}
    </div>
  );
}
