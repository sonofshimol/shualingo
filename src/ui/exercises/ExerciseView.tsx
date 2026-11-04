/**
 * The five exercise types of stage 1. Each one manages its own input and calls onSubmit(correct)
 * when the player checks the answer. `locked` freezes the input while feedback is shown.
 */
import { useMemo, useState } from 'react';
import { endingSentence, latinWords, ruleById, sentenceFromTiles, wordById } from '../../content';
import type {
  BuildExercise, ChoiceExercise, EndingExercise, Exercise, MatchExercise, Role, RoleExercise,
} from '../../content/types';
import { choiceMatches, ROLE_LABEL_HE, shuffle, tilesMatch } from '../../learning/exercises';
import { La } from '../components/La';
import { TileBuilder } from './TileBuilder';

interface Props<E> {
  exercise: E;
  locked: boolean;
  onSubmit: (correct: boolean) => void;
}

function CheckButton({ disabled, onClick, locked }: { disabled: boolean; onClick: () => void; locked: boolean }) {
  if (locked) return null;
  return (
    <button type="button" className="primary wide check-button" disabled={disabled} onClick={onClick}>
      בדיקה
    </button>
  );
}

// ------------------------------------------------------------------ match

function MatchView({ exercise, locked, onSubmit }: Props<MatchExercise>) {
  const items = useMemo(() => exercise.words.map((id) => wordById.get(id)!).filter(Boolean), [exercise]);
  const right = useMemo(() => shuffle(items.map((w) => w.id)), [items]);
  const [picked, setPicked] = useState<{ side: 'la' | 'he'; id: string } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string[]>([]);
  const [hadError, setHadError] = useState(false);

  const choose = (side: 'la' | 'he', id: string) => {
    if (locked || matched.includes(id)) return;
    if (!picked || picked.side === side) {
      setPicked({ side, id });
      return;
    }
    if (picked.id === id) {
      const next = [...matched, id];
      setMatched(next);
      setPicked(null);
      if (next.length === items.length) onSubmit(!hadError);
    } else {
      setHadError(true);
      setWrong([picked.id, id]);
      setPicked(null);
      window.setTimeout(() => setWrong([]), 600);
    }
  };

  const cls = (side: 'la' | 'he', id: string) =>
    [
      'match-item',
      side === 'la' ? 'la-tile' : '',
      matched.includes(id) ? 'matched' : '',
      picked?.side === side && picked.id === id ? 'selected' : '',
      wrong.includes(id) && (picked === null) ? 'wrong' : '',
    ].join(' ');

  return (
    <div className="exercise">
      <p className="instruction">התאימו כל מילה לטינית לפירוש שלה.</p>
      <div className="match-grid">
        <div className="match-col">
          {items.map((w) => (
            <button key={w.id} type="button" dir="ltr" lang="la" className={cls('la', w.id)} onClick={() => choose('la', w.id)} disabled={matched.includes(w.id)}>
              {w.lemma}
            </button>
          ))}
        </div>
        <div className="match-col">
          {right.map((id) => (
            <button key={id} type="button" className={cls('he', id)} onClick={() => choose('he', id)} disabled={matched.includes(id)}>
              {wordById.get(id)!.meaning_he}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ choice

function ChoiceView({ exercise, locked, onSubmit }: Props<ChoiceExercise>) {
  const options = useMemo(() => shuffle([exercise.answer, ...exercise.distractors]), [exercise]);
  const [picked, setPicked] = useState<string | null>(null);
  const latinOptions = exercise.direction === 'he-la';

  return (
    <div className="exercise">
      <p className="instruction">{latinOptions ? 'איך אומרים בלטינית?' : 'מה הפירוש?'}</p>
      <div className="prompt">
        {exercise.prompt_la && <div className="prompt-cue"><La text={exercise.prompt_la} /></div>}
        {latinOptions ? <span className="prompt-he">{exercise.prompt}</span> : <La text={exercise.prompt} className="prompt-la" />}
      </div>
      <div className="options" role="radiogroup">
        {options.map((option) => {
          const state = locked
            ? choiceMatches(exercise.answer, option) ? 'correct' : picked === option ? 'wrong' : ''
            : picked === option ? 'selected' : '';
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={picked === option}
              className={`option ${latinOptions ? 'la-tile' : ''} ${state}`}
              dir={latinOptions ? 'ltr' : undefined}
              lang={latinOptions ? 'la' : undefined}
              disabled={locked}
              onClick={() => setPicked(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
      <CheckButton locked={locked} disabled={!picked} onClick={() => picked && onSubmit(choiceMatches(exercise.answer, picked))} />
    </div>
  );
}

// ------------------------------------------------------------------ build

export function finalPunctuation(text: string): string {
  const match = text.trim().match(/[.!?]$/);
  return match ? match[0] : '';
}

function BuildView({ exercise, locked, onSubmit }: Props<BuildExercise>) {
  const bank = useMemo(() => shuffle([...exercise.answer, ...exercise.extra]), [exercise]);
  const [placed, setPlaced] = useState<number[]>([]);
  return (
    <div className="exercise">
      <p className="instruction">בנו את המשפט בלטינית.</p>
      <div className="prompt">
        <span className="prompt-he">{exercise.prompt_he}</span>
      </div>
      <TileBuilder bank={bank} placed={placed} onChange={setPlaced} locked={locked} punctuation={finalPunctuation(exercise.prompt_he)} />
      <CheckButton
        locked={locked}
        disabled={placed.length === 0}
        onClick={() => onSubmit(tilesMatch(exercise, placed.map((i) => bank[i])))}
      />
    </div>
  );
}

// ------------------------------------------------------------------ role

function RoleView({ exercise, locked, onSubmit }: Props<RoleExercise>) {
  const options: Role[] = exercise.options ?? ['subject', 'object', 'indirect'];
  const [picked, setPicked] = useState<Role | null>(null);
  const tokens = latinWords(exercise.sentence);
  const punctuation = finalPunctuation(exercise.sentence);
  return (
    <div className="exercise">
      <p className="instruction">מה התפקיד של המילה המודגשת? הסיומת תגלה.</p>
      <div className="prompt">
        <span className="prompt-la la" dir="ltr" lang="la">
          {tokens.map((t, i) => (
            <span key={i}>
              <span className={i === exercise.target ? 'target-word' : ''}>{t}</span>
              {i < tokens.length - 1 ? ' ' : punctuation}
            </span>
          ))}
        </span>
      </div>
      <div className="options" role="radiogroup">
        {options.map((role) => {
          const state = locked ? (role === exercise.answer ? 'correct' : picked === role ? 'wrong' : '') : picked === role ? 'selected' : '';
          return (
            <button key={role} type="button" role="radio" aria-checked={picked === role} className={`option ${state}`} disabled={locked} onClick={() => setPicked(role)}>
              {ROLE_LABEL_HE[role]}
            </button>
          );
        })}
      </div>
      <CheckButton locked={locked} disabled={!picked} onClick={() => picked && onSubmit(picked === exercise.answer)} />
    </div>
  );
}

// ------------------------------------------------------------------ ending

function EndingView({ exercise, locked, onSubmit }: Props<EndingExercise>) {
  const options = useMemo(() => shuffle(exercise.options), [exercise]);
  const [picked, setPicked] = useState<string | null>(null);
  const after = exercise.after;
  const spaceAfter = /^[.!?,]/.test(after) ? '' : ' ';
  return (
    <div className="exercise">
      <p className="instruction">השלימו את הסיומת החסרה.</p>
      <div className="prompt">
        <span className="prompt-la la" dir="ltr" lang="la">
          {exercise.before && <>{exercise.before} </>}
          {exercise.stem}
          <span className={`blank ${picked ? 'filled' : ''}`}>{picked ?? '___'}</span>
          {spaceAfter}
          {after}
        </span>
        <span className="translation">{exercise.translation_he}</span>
      </div>
      <div className="options endings" role="radiogroup">
        {options.map((option) => {
          const state = locked ? (option === exercise.answer ? 'correct' : picked === option ? 'wrong' : '') : picked === option ? 'selected' : '';
          return (
            <button key={option} type="button" role="radio" aria-checked={picked === option} className={`option la-tile ${state}`} dir="ltr" lang="la" disabled={locked} onClick={() => setPicked(option)}>
              -{option}
            </button>
          );
        })}
      </div>
      <CheckButton locked={locked} disabled={!picked} onClick={() => picked && onSubmit(picked === exercise.answer)} />
    </div>
  );
}

// ------------------------------------------------------------------ dispatch

export function ExerciseView(props: Props<Exercise>) {
  const { exercise } = props;
  switch (exercise.type) {
    case 'match':
      return <MatchView {...props} exercise={exercise} />;
    case 'choice':
      return <ChoiceView {...props} exercise={exercise} />;
    case 'build':
      return <BuildView {...props} exercise={exercise} />;
    case 'role':
      return <RoleView {...props} exercise={exercise} />;
    case 'ending':
      return <EndingView {...props} exercise={exercise} />;
  }
}

/** The right answer, shown after a mistake. Latin words in it open their word cards. */
export function CorrectAnswer({ exercise }: { exercise: Exercise }) {
  switch (exercise.type) {
    case 'match':
      return (
        <ul className="pairs">
          {exercise.words.map((id) => (
            <li key={id}>
              <La text={wordById.get(id)!.lemma} /> = {wordById.get(id)!.meaning_he}
            </li>
          ))}
        </ul>
      );
    case 'choice':
      return exercise.direction === 'he-la' ? <La text={exercise.answer} /> : <span>{exercise.answer}</span>;
    case 'build':
      return <La text={sentenceFromTiles(exercise.answer, finalPunctuation(exercise.prompt_he))} />;
    case 'role':
      return (
        <span>
          {ROLE_LABEL_HE[exercise.answer]} — <La text={exercise.sentence} /> ({exercise.translation_he})
        </span>
      );
    case 'ending':
      return (
        <span>
          <La text={endingSentence(exercise)} /> ({exercise.translation_he})
        </span>
      );
  }
}

/** A short explanation: the exercise's own note, or the rule it practises. */
export function explanationFor(exercise: Exercise): string | null {
  if (exercise.explain_he) return exercise.explain_he;
  const rule = exercise.rules?.map((id) => ruleById.get(id)).find(Boolean);
  return rule ? rule.explain_he : null;
}

/** The full Latin sentence of the exercise after it is answered (to explore its words). */
export function SolvedSentence({ exercise }: { exercise: Exercise }) {
  if (exercise.type === 'choice' && exercise.direction === 'la-he') return <La text={exercise.prompt} />;
  return null;
}
