/**
 * Everything that changes the saved game. Each function takes the current save and the time,
 * and returns a new save (never mutates), so it is easy to test and to undo.
 */
import { CONFIG } from '../config';
import { lessonById, lessons, spellById, spells, unitOfLesson } from '../content';
import type { Lesson } from '../content/types';
import type { LessonRun } from '../learning/lessonRun';
import { lessonRatings } from '../learning/lessonRun';
import { applyRatings, wordCard } from '../learning/srs';
import { accrueProduction, dropExpiredEffects, harvest, isBuilt, pauseFire } from './buildings';
import { burnFire } from './camp';
import { addElements, canAfford, type ElementDelta, subtractElements, sumDeltas } from './elements';
import { rankOrder } from './ranks';
import { spellIsCorrect, spellStatus, spellTotalCost, spellWords } from './spells';
import { applyEffect } from '../magic/effects';
import { dayKey, type SaveState } from './state';
import { lessonTask, recordFailure, recordSuccess, spellTask, taskStatus } from './tasks';

// ------------------------------------------------------------------ time

/** Brings time-based state up to date: buildings produce and the fire burns while the app is closed. */
export function tick(save: SaveState, now: number): SaveState {
  const camp = dropExpiredEffects(burnFire(pauseFire(accrueProduction(save.camp, now), now), now), now);
  return camp === save.camp ? save : { ...save, camp };
}

// ------------------------------------------------------------------ harvest

export function harvestBuilding(save: SaveState, buildingId: string, now: number): { save: SaveState; gained: ElementDelta; capped: boolean } {
  const current = tick(save, now);
  const result = harvest(current.camp, buildingId, now);
  const amount = Object.values(result.gained).reduce((a, b) => a + (b ?? 0), 0);
  if (!amount) return { save: current, gained: {}, capped: result.capped };
  return {
    save: {
      ...current,
      camp: result.camp,
      elements: addElements(current.elements, result.gained),
      stats: { ...current.stats, harvested: current.stats.harvested + amount },
    },
    gained: result.gained,
    capped: result.capped,
  };
}

// ------------------------------------------------------------------ lessons

export type LessonState = 'locked' | 'available' | 'done' | 'suspended';

/** Units can wait for a building (unit 6 opens with the bibliotheca). Returns the missing building. */
export function unitBlockedBy(save: SaveState, unitId: string): string | null {
  const unit = unitOfLesson.get(lessons.find((l) => unitOfLesson.get(l.id)?.id === unitId)?.id ?? '');
  const building = unit?.requires?.building;
  return building && !isBuilt(save.camp, building) ? building : null;
}

export function lessonState(
  save: SaveState,
  lessonId: string,
  now: number,
): { state: LessonState; lockedUntil: number | null; needsBuilding?: string } {
  const status = taskStatus(save.tasks[lessonTask(lessonId)], now);
  if (status.locked) return { state: 'suspended', lockedUntil: status.lockedUntil };
  if (save.lessons[lessonId]) return { state: 'done', lockedUntil: null };
  const needsBuilding = unitBlockedBy(save, unitOfLesson.get(lessonId)?.id ?? '');
  if (needsBuilding) return { state: 'locked', lockedUntil: null, needsBuilding };
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
  let earned = dailyBonus ? sumDeltas(run.earned, CONFIG.DAILY_LESSON_REWARD) : run.earned;
  // Stage 3: a perfect lesson (no mistakes) gives lux once the fox is a maga.
  const perfect = run.mistakes === 0 && rankOrder(save.rank) >= rankOrder('maga');
  if (perfect) earned = sumDeltas(earned, { lux: 1 });
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
      daily: { ...save.daily, lastLessonDay: today },
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

export type CastOutcome = 'cast' | 'wrong' | 'locked' | 'poor' | 'blocked' | 'unknown';

export interface CastResult {
  save: SaveState;
  outcome: CastOutcome;
  lockedNow: boolean;
  /** What the spell gave (grow rewards). */
  gained?: ElementDelta;
  /** Extra Hebrew line about what happened (new rank, building level…). */
  note_he?: string;
}

export function castSpell(save: SaveState, spellId: string, tiles: string[], now: number): CastResult {
  const spell = spellById.get(spellId);
  if (!spell || !save.spellbook.includes(spellId)) return { save, outcome: 'unknown', lockedNow: false };
  const current = tick(save, now);
  const taskId = spellTask(spellId);
  if (taskStatus(current.tasks[taskId], now).locked) return { save: current, outcome: 'locked', lockedNow: false };
  const status = spellStatus(current, spell, now);
  if (!status.ready) return { save: current, outcome: 'blocked', lockedNow: false, note_he: status.reason_he };
  const cost = spellTotalCost(current, spell);
  if (!canAfford(current.elements, cost)) return { save: current, outcome: 'poor', lockedNow: false };

  const correct = spellIsCorrect(spell, tiles);
  const ratings = Object.fromEntries(spellWords(spell).map((id) => [wordCard(id), correct]));
  const cards = applyRatings(current.cards, ratings, now);

  if (!correct) {
    // A wrong spell costs nothing ("טעות לא מענישה"), but counts toward suspension.
    const { tasks, lockedNow } = recordFailure(current.tasks, taskId, now);
    return { save: { ...current, cards, tasks }, outcome: 'wrong', lockedNow };
  }

  let next: SaveState = {
    ...current,
    cards,
    elements: subtractElements(current.elements, cost),
    tasks: recordSuccess(current.tasks, taskId),
    stats: { ...current.stats, spellsCast: current.stats.spellsCast + 1 },
  };
  const applied = applyEffect(next, spell.effect, now);
  next = applied.save;
  const { gained, note_he } = applied;
  return { save: next, outcome: 'cast', lockedNow: false, gained, note_he };
}
