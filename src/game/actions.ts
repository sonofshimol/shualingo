/**
 * Everything that changes the saved game. Each function takes the current save and the time,
 * and returns a new save (never mutates), so it is easy to test and to undo.
 */
import { CONFIG } from '../config';
import { lessonById, lessons, spellById, spells } from '../content';
import type { Lesson } from '../content/types';
import type { LessonRun } from '../learning/lessonRun';
import { lessonRatings } from '../learning/lessonRun';
import { applyRatings, wordCard } from '../learning/srs';
import { addFuel, burnFire } from './camp';
import { addElements, canAfford, type ElementDelta, subtractElements, sumDeltas } from './elements';
import { spellCost, spellIsCorrect, spellWords } from './spells';
import { dayKey, type SaveState } from './state';
import { lessonTask, recordFailure, recordSuccess, spellTask, taskStatus } from './tasks';

// ------------------------------------------------------------------ time

/** Brings time-based state up to date (the fire burns while the app is closed). */
export function tick(save: SaveState, now: number): SaveState {
  const camp = burnFire(save.camp, now);
  return camp === save.camp ? save : { ...save, camp };
}

// ------------------------------------------------------------------ lessons

export type LessonState = 'locked' | 'available' | 'done' | 'suspended';

export function lessonState(save: SaveState, lessonId: string, now: number): { state: LessonState; lockedUntil: number | null } {
  const status = taskStatus(save.tasks[lessonTask(lessonId)], now);
  if (status.locked) return { state: 'suspended', lockedUntil: status.lockedUntil };
  if (save.lessons[lessonId]) return { state: 'done', lockedUntil: null };
  const index = lessons.findIndex((l) => l.id === lessonId);
  const unlocked = index === 0 || Boolean(save.lessons[lessons[index - 1]?.id]);
  return { state: unlocked ? 'available' : 'locked', lockedUntil: null };
}

/** The first lesson not yet completed (what the "continue" button opens). */
export function nextLesson(save: SaveState): Lesson | undefined {
  return lessons.find((l) => !save.lessons[l.id]);
}

export interface LessonOutcome {
  passed: boolean;
  earned: ElementDelta;
  dailyBonus: boolean;
  lockedNow: boolean;
  newSpells: string[];
}

export function finishLesson(save: SaveState, run: LessonRun, now: number): { save: SaveState; outcome: LessonOutcome } {
  const lesson = lessonById.get(run.lessonId);
  if (!lesson || run.status === 'running') throw new Error(`lesson ${run.lessonId} is not finished`);
  const taskId = lessonTask(lesson.id);
  const cards = applyRatings(save.cards, lessonRatings(run, lesson), now);

  if (run.status === 'failed') {
    const { tasks, lockedNow } = recordFailure(save.tasks, taskId, now);
    return {
      save: { ...save, cards, tasks, stats: { ...save.stats, lessonsFailed: save.stats.lessonsFailed + 1 } },
      outcome: { passed: false, earned: {}, dailyBonus: false, lockedNow, newSpells: [] },
    };
  }

  const today = dayKey(now);
  const dailyBonus = save.daily.lastLessonDay !== today;
  const earned = dailyBonus ? sumDeltas(run.earned, CONFIG.DAILY_LESSON_REWARD) : run.earned;
  const previous = save.lessons[lesson.id];
  const newSpells = spells.filter((s) => s.unlocked_by === lesson.id && !save.spellbook.includes(s.id)).map((s) => s.id);

  return {
    save: {
      ...save,
      cards,
      elements: addElements(save.elements, earned),
      tasks: recordSuccess(save.tasks, taskId),
      lessons: {
        ...save.lessons,
        [lesson.id]: {
          completedAt: previous?.completedAt ?? now,
          bestMistakes: Math.min(previous?.bestMistakes ?? Infinity, run.mistakes),
          timesCompleted: (previous?.timesCompleted ?? 0) + 1,
        },
      },
      spellbook: [...save.spellbook, ...newSpells],
      daily: { lastLessonDay: today },
    },
    outcome: { passed: true, earned, dailyBonus, lockedNow: false, newSpells },
  };
}

// ------------------------------------------------------------------ review

export function finishReview(
  save: SaveState,
  results: { cards: string[]; correct: boolean }[],
  now: number,
): { save: SaveState; earned: ElementDelta } {
  const ratings: Record<string, boolean> = {};
  for (const r of results) for (const card of r.cards) ratings[card] = (ratings[card] ?? true) && r.correct;
  const correctCount = results.filter((r) => r.correct).length;
  const earned: ElementDelta = {};
  for (const [id, amount] of Object.entries(CONFIG.REVIEW_REWARD)) earned[id as keyof ElementDelta] = amount * correctCount;
  return {
    save: {
      ...save,
      cards: applyRatings(save.cards, ratings, now),
      elements: addElements(save.elements, earned),
      stats: { ...save.stats, reviewsDone: save.stats.reviewsDone + results.length },
    },
    earned,
  };
}

// ------------------------------------------------------------------ spells

export type CastOutcome = 'cast' | 'wrong' | 'locked' | 'poor' | 'unknown';

export function castSpell(
  save: SaveState,
  spellId: string,
  tiles: string[],
  now: number,
): { save: SaveState; outcome: CastOutcome; lockedNow: boolean } {
  const spell = spellById.get(spellId);
  if (!spell || !save.spellbook.includes(spellId)) return { save, outcome: 'unknown', lockedNow: false };
  const taskId = spellTask(spellId);
  if (taskStatus(save.tasks[taskId], now).locked) return { save, outcome: 'locked', lockedNow: false };
  const cost = spellCost(spell);
  if (!canAfford(save.elements, cost)) return { save, outcome: 'poor', lockedNow: false };

  const correct = spellIsCorrect(spell, tiles);
  const ratings = Object.fromEntries(spellWords(spell).map((id) => [wordCard(id), correct]));
  const cards = applyRatings(save.cards, ratings, now);

  if (!correct) {
    // A wrong spell costs nothing ("טעות לא מענישה"), but counts toward suspension.
    const { tasks, lockedNow } = recordFailure(save.tasks, taskId, now);
    return { save: { ...save, cards, tasks }, outcome: 'wrong', lockedNow };
  }

  let camp = save.camp;
  if (spell.effect.type === 'gather' && spell.effect.resource === 'fuel') camp = addFuel(camp, spell.effect.amount, now);
  return {
    save: {
      ...save,
      cards,
      camp,
      elements: subtractElements(save.elements, cost),
      tasks: recordSuccess(save.tasks, taskId),
      stats: { ...save.stats, spellsCast: save.stats.spellsCast + 1 },
    },
    outcome: 'cast',
    lockedNow: false,
  };
}
