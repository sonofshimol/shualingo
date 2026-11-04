/**
 * One attempt at a lesson, as a small state machine.
 * - A wrong answer earns nothing and the exercise returns at the end of the lesson.
 * - LESSON_MISTAKES_TO_FAIL mistakes end the attempt as a failure (no elements at all).
 * - Elements are earned only for exercises answered right on the first try.
 */
import { CONFIG } from '../config';
import type { Lesson } from '../content/types';
import { type ElementDelta, sumDeltas } from '../game/elements';
import { exerciseCards } from './exercises';

export interface LessonRun {
  lessonId: string;
  /** Indices into lesson.exercises still to do; the first one is current. */
  queue: number[];
  mistakes: number;
  /** Exercise indices answered wrong at least once. */
  missed: number[];
  done: number;
  earned: ElementDelta;
  status: 'running' | 'passed' | 'failed';
}

export function startLesson(lesson: Lesson): LessonRun {
  return {
    lessonId: lesson.id,
    queue: lesson.exercises.map((_, i) => i),
    mistakes: 0,
    missed: [],
    done: 0,
    earned: {},
    status: 'running',
  };
}

export function currentExercise(run: LessonRun): number | undefined {
  return run.status === 'running' ? run.queue[0] : undefined;
}

export function answerExercise(run: LessonRun, lesson: Lesson, correct: boolean): LessonRun {
  if (run.status !== 'running' || run.queue.length === 0) return run;
  const [index, ...rest] = run.queue;
  const exercise = lesson.exercises[index];

  if (correct) {
    const firstTry = !run.missed.includes(index);
    const earned = firstTry ? sumDeltas(run.earned, CONFIG.EXERCISE_REWARDS[exercise.type]) : run.earned;
    const queue = rest;
    return { ...run, queue, earned, done: run.done + 1, status: queue.length === 0 ? 'passed' : 'running' };
  }

  const mistakes = run.mistakes + 1;
  const missed = run.missed.includes(index) ? run.missed : [...run.missed, index];
  const failed = mistakes >= CONFIG.LESSON_MISTAKES_TO_FAIL;
  return {
    ...run,
    queue: failed ? rest : [...rest, index],
    mistakes,
    missed,
    status: failed ? 'failed' : 'running',
  };
}

/** Progress from 0 to 1 for the progress bar. */
export function lessonProgress(run: LessonRun, lesson: Lesson): number {
  return Math.min(1, run.done / lesson.exercises.length);
}

/**
 * Spaced-repetition ratings for the attempt: every word and rule seen is rated once —
 * "remembered" unless an exercise containing it was missed.
 */
export function lessonRatings(run: LessonRun, lesson: Lesson): Record<string, boolean> {
  const ratings: Record<string, boolean> = {};
  lesson.exercises.forEach((exercise, index) => {
    const missed = run.missed.includes(index);
    const attempted = missed || !run.queue.includes(index);
    if (!attempted) return;
    for (const card of exerciseCards(exercise)) {
      ratings[card] = (ratings[card] ?? true) && !missed;
    }
  });
  return ratings;
}
