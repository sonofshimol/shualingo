import { describe, expect, it } from 'vitest';
import { CONFIG, HOUR_MS } from '../config';
import { lessonById, lessons, spellById } from '../content';
import { answerExercise, lessonRatings, startLesson } from '../learning/lessonRun';
import { tilesMatch } from '../learning/exercises';
import { buildReview } from '../learning/review';
import { dueCards, rateCard } from '../learning/srs';
import { castSpell, finishLesson, finishReview, lessonState, tick } from './actions';
import { addFuel, burnFire, fireLevel } from './camp';
import { spellCost } from './spells';
import { newSave, type SaveState } from './state';
import { recordFailure, taskStatus } from './tasks';

const T0 = Date.parse('2026-11-05T09:00:00Z');

function passLesson(save: SaveState, lessonId: string, now: number) {
  const lesson = lessonById.get(lessonId)!;
  let run = startLesson(lesson);
  while (run.status === 'running') run = answerExercise(run, lesson, true);
  return finishLesson(save, run, now);
}

function failLesson(save: SaveState, lessonId: string, now: number) {
  const lesson = lessonById.get(lessonId)!;
  let run = startLesson(lesson);
  while (run.status === 'running') run = answerExercise(run, lesson, false);
  return finishLesson(save, run, now);
}

describe('suspension', () => {
  it('locks a task after the configured number of failures and reopens it clean', () => {
    let tasks = {};
    for (let i = 0; i < CONFIG.FAILURES_BEFORE_SUSPENSION - 1; i += 1) {
      ({ tasks } = recordFailure(tasks, 'lesson:x', T0));
      expect(taskStatus((tasks as never)['lesson:x'], T0).locked).toBe(false);
    }
    const result = recordFailure(tasks, 'lesson:x', T0);
    expect(result.lockedNow).toBe(true);
    const until = T0 + CONFIG.SUSPENSION_HOURS * HOUR_MS;
    expect(taskStatus(result.tasks['lesson:x'], until - 1)).toMatchObject({ locked: true, lockedUntil: until });
    expect(taskStatus(result.tasks['lesson:x'], until)).toEqual({ locked: false, lockedUntil: null, failures: 0 });
  });

  it('suspends only the failed lesson; failed words come back for review', () => {
    let save = passLesson(newSave(T0), 'u1-l1', T0).save;
    for (let i = 0; i < CONFIG.FAILURES_BEFORE_SUSPENSION; i += 1) save = failLesson(save, 'u1-l2', T0).save;
    expect(lessonState(save, 'u1-l2', T0).state).toBe('suspended');
    expect(lessonState(save, 'u1-l1', T0).state).toBe('done');
    expect(dueCards(save.cards, T0 + 60_000)).toContain('word:magnus');
    expect(lessonState(save, 'u1-l2', T0 + CONFIG.SUSPENSION_HOURS * HOUR_MS).state).toBe('available');
  });
});

describe('lessons', () => {
  it('unlock in order and reward elements, with a daily aether bonus', () => {
    const save = newSave(T0);
    expect(lessonState(save, 'u1-l1', T0).state).toBe('available');
    expect(lessonState(save, 'u1-l2', T0).state).toBe('locked');
    const { save: after, outcome } = passLesson(save, 'u1-l1', T0);
    expect(outcome.passed).toBe(true);
    expect(outcome.dailyBonus).toBe(true);
    expect(after.elements.aether).toBe(1);
    expect(after.elements.terra).toBeGreaterThan(0);
    expect(lessonState(after, 'u1-l2', T0).state).toBe('available');
    const second = passLesson(after, 'u1-l2', T0 + 1000);
    expect(second.outcome.dailyBonus).toBe(false);
  });

  it('re-queues a wrong exercise, gives it no reward and fails after too many mistakes', () => {
    const lesson = lessons[0];
    let run = startLesson(lesson);
    run = answerExercise(run, lesson, false);
    expect(run.queue[run.queue.length - 1]).toBe(0);
    expect(run.mistakes).toBe(1);
    for (let i = 1; i < CONFIG.LESSON_MISTAKES_TO_FAIL; i += 1) run = answerExercise(run, lesson, false);
    expect(run.status).toBe('failed');
    const ratings = lessonRatings(run, lesson);
    expect(Object.values(ratings).every((r) => r === false)).toBe(true);
  });

  it('a failed attempt earns nothing', () => {
    const { save, outcome } = failLesson(newSave(T0), 'u1-l1', T0);
    expect(outcome.earned).toEqual({});
    expect(Object.values(save.elements).every((v) => v === 0)).toBe(true);
  });

  it('completing unit 3 puts the gathering spell in the spellbook', () => {
    let save = newSave(T0);
    for (const lesson of lessons) save = passLesson(save, lesson.id, T0).save;
    expect(save.spellbook).toEqual(['gather-wood']);
  });
});

describe('camp fire and the gathering spell', () => {
  it('burns while the app is closed, never below zero', () => {
    const camp = { fuel: 3, lastBurnAt: T0 };
    expect(burnFire(camp, T0 + CONFIG.FIRE_BURN_HOURS * HOUR_MS).fuel).toBe(2);
    expect(burnFire(camp, T0 + 100 * HOUR_MS).fuel).toBe(0);
    expect(fireLevel(0)).toBe('out');
    expect(addFuel({ fuel: 5, lastBurnAt: T0 }, 3, T0).fuel).toBe(CONFIG.FIRE_MAX_FUEL);
  });

  it('costs each word its element and feeds the fire when cast correctly', () => {
    const spell = spellById.get('gather-wood')!;
    expect(spellCost(spell)).toEqual({ terra: 1, aer: 2 });
    let save: SaveState = { ...newSave(T0), spellbook: ['gather-wood'], camp: { fuel: 0, lastBurnAt: T0 } };
    expect(castSpell(save, 'gather-wood', ['lignum', 'mihi', 'affer'], T0).outcome).toBe('poor');
    save = { ...save, elements: { ...save.elements, terra: 1, aer: 2 } };
    const result = castSpell(save, 'gather-wood', ['mihi', 'lignum', 'affer'], T0);
    expect(result.outcome).toBe('cast');
    expect(result.save.camp.fuel).toBe(3);
    expect(result.save.elements).toMatchObject({ terra: 0, aer: 0 });
  });

  it('a wrong spell costs nothing but counts toward suspension', () => {
    let save: SaveState = { ...newSave(T0), spellbook: ['gather-wood'] };
    save = { ...save, elements: { ...save.elements, terra: 5, aer: 5 } };
    let last = castSpell(save, 'gather-wood', ['lignō', 'mihi', 'affer'], T0);
    expect(last.outcome).toBe('wrong');
    expect(last.save.elements.terra).toBe(5);
    for (let i = 1; i < CONFIG.FAILURES_BEFORE_SUSPENSION; i += 1) last = castSpell(last.save, 'gather-wood', ['lignum'], T0);
    expect(last.lockedNow).toBe(true);
    expect(castSpell(last.save, 'gather-wood', ['lignum', 'mihi', 'affer'], T0).outcome).toBe('locked');
  });

  it('tick() advances the fire', () => {
    const save = newSave(T0);
    expect(tick(save, T0 + 100 * HOUR_MS).camp.fuel).toBe(0);
  });
});

describe('answer checking and review', () => {
  it('accepts free Latin word order only when allowed', () => {
    expect(tilesMatch({ answer: ['puella', 'aquam', 'portat'], any_order: true }, ['aquam', 'puella', 'portat'])).toBe(true);
    expect(tilesMatch({ answer: ['puella', 'et', 'lūna'] }, ['lūna', 'et', 'puella'])).toBe(false);
    expect(tilesMatch({ answer: ['a', 'b'], alternatives: [['b', 'a']] }, ['b', 'a'])).toBe(true);
  });

  it('builds a review from due cards and rewards water', () => {
    let cards = {};
    for (const id of ['word:aqua', 'word:silva', 'word:terra', 'word:luna', 'word:stella', 'rule:acc-sg-1', 'rule:est-sunt']) {
      cards = { ...cards, [id]: rateCard(undefined, false, T0) };
    }
    const items = buildReview(cards, T0 + HOUR_MS, () => 0.42);
    expect(items.length).toBe(7 - 3); // one match of 4 words + 1 word + 2 rules
    for (const item of items) {
      if (item.exercise.type === 'choice') {
        expect(item.exercise.distractors).toHaveLength(2);
        expect(item.exercise.distractors).not.toContain(item.exercise.answer);
      }
    }
    const save = { ...newSave(T0), cards };
    const { earned } = finishReview(save, items.map((i) => ({ cards: i.cards, correct: true })), T0 + HOUR_MS);
    expect(earned.aqua).toBe(items.length);
  });
});
