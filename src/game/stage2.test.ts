import { describe, expect, it } from 'vitest';
import { CONFIG, HOUR_MS } from '../config';
import { lessonById, lessons } from '../content';
import { answerExercise, startLesson } from '../learning/lessonRun';
import { migrate } from '../storage/migrations';
import { castSpell, finishLesson, harvestBuilding, lessonState, tick } from './actions';
import { readyAt, storageCap } from './buildings';
import { spellTotalCost } from './spells';
import { newSave, type SaveState } from './state';
import { spellById } from '../content';

const T0 = Date.parse('2026-11-05T09:00:00');
const RICH = { terra: 99, aqua: 99, aer: 99, ignis: 99, aether: 99 };

function passAll(save: SaveState, upTo: number, now: number): SaveState {
  for (const lesson of lessons.slice(0, upTo)) {
    let run = startLesson(lessonById.get(lesson.id)!);
    while (run.status === 'running') run = answerExercise(run, lesson, true);
    save = finishLesson(save, run, now).save;
  }
  return save;
}

function cast(save: SaveState, id: string, now = T0) {
  return castSpell(save, id, spellById.get(id)!.answer, now);
}

describe('buildings and production', () => {
  it('build spells cost words plus materials, and build the building', () => {
    let save: SaveState = { ...passAll(newSave(T0), 11, T0), elements: { ...RICH } };
    expect(spellTotalCost(save, spellById.get('build-hortus')!)).toEqual({ terra: 4, aer: 2, ignis: 1 });
    const result = cast(save, 'build-hortus');
    expect(result.outcome).toBe('cast');
    save = result.save;
    expect(save.camp.buildings.hortus.level).toBe(1);
    expect(cast(save, 'build-hortus').outcome).toBe('blocked');
  });

  it('produces while away, up to the storage cap, and harvest respects the daily cap', () => {
    let save: SaveState = newSave(T0);
    save = { ...save, camp: { ...save.camp, buildings: { ...save.camp.buildings, hortus: { level: 1, builtAt: T0 } } } };
    save = tick(save, T0 + 3 * HOUR_MS);
    expect(readyAt(save.camp, 'hortus')).toBe(1);
    save = tick(save, T0 + 100 * HOUR_MS);
    expect(readyAt(save.camp, 'hortus')).toBe(storageCap(save.camp));
    const first = harvestBuilding(save, 'hortus', T0 + 100 * HOUR_MS);
    expect(first.gained).toEqual({ terra: 3 });
    // Fill the day's cap
    let s = first.save;
    s = { ...s, camp: { ...s.camp, harvest: { ...s.camp.harvest, amount: CONFIG.DAILY_HARVEST_CAP } } };
    const later = tick(s, T0 + 110 * HOUR_MS);
    const blocked = harvestBuilding(later, 'hortus', T0 + 110 * HOUR_MS);
    expect(blocked.capped).toBe(true);
    expect(blocked.gained).toEqual({});
  });

  it('the fire makes ignis only while it burns', () => {
    const save = newSave(T0); // 3 fuel = 9 hours of fire
    const later = tick(save, T0 + 48 * HOUR_MS);
    expect(readyAt(later.camp, 'focus')).toBe(3);
  });

  it('upgrading the tent grows storage', () => {
    let save: SaveState = { ...passAll(newSave(T0), 12, T0), elements: { ...RICH } };
    const before = storageCap(save.camp);
    save = cast(save, 'build-tentorium').save;
    expect(save.camp.buildings.tentorium.level).toBe(2);
    expect(storageCap(save.camp)).toBeGreaterThan(before);
  });

  it('unit 6 waits for the bibliotheca', () => {
    let save: SaveState = { ...passAll(newSave(T0), 15, T0), elements: { ...RICH } };
    expect(lessonState(save, 'u6-l1', T0)).toMatchObject({ state: 'locked', needsBuilding: 'bibliotheca' });
    save = cast(save, 'build-bibliotheca').save;
    expect(lessonState(save, 'u6-l1', T0).state).toBe('available');
  });
});

describe('tree, light and ranks', () => {
  it('the tree grows once per cooldown and pays out at the end', () => {
    let save: SaveState = { ...passAll(newSave(T0), 15, T0), elements: { ...RICH } };
    let t = T0;
    const first = cast(save, 'grow-tree', t);
    expect(first.outcome).toBe('cast');
    expect(cast(first.save, 'grow-tree', t + HOUR_MS).outcome).toBe('blocked');
    save = first.save;
    for (let i = 1; i < CONFIG.TREE_MAX_STAGE; i += 1) {
      t += CONFIG.TREE_GROW_COOLDOWN_HOURS * HOUR_MS;
      const r = cast(save, 'grow-tree', t);
      save = r.save;
      if (i === CONFIG.TREE_MAX_STAGE - 1) expect(r.gained?.aether).toBeGreaterThan(0);
    }
    expect(save.camp.tree.stage).toBe(CONFIG.TREE_MAX_STAGE);
  });

  it('rises discipula → maga with the tower, then light doubles production', () => {
    let save: SaveState = { ...passAll(newSave(T0), lessons.length, T0), elements: { ...RICH } };
    expect(cast(save, 'rank-up').outcome).toBe('blocked'); // no tower yet
    expect(cast(save, 'make-light').outcome).toBe('blocked'); // needs maga
    save = cast(save, 'build-turris').save;
    save = cast(save, 'rank-up').save;
    expect(save.rank).toBe('maga');
    expect(cast(save, 'rank-up').outcome).toBe('blocked'); // magistra needs every building
    save = { ...save, camp: { ...save.camp, buildings: { ...save.camp.buildings, hortus: { level: 1, builtAt: T0 } }, pending: {}, lastProductionAt: T0 } };
    save = cast(save, 'make-light').save;
    const lit = tick(save, T0 + 2 * HOUR_MS);
    expect(readyAt(lit.camp, 'hortus')).toBe(2); // 2h at double speed = 2 units
  });

  it('reaches magistra when everything is built', () => {
    let save: SaveState = { ...passAll(newSave(T0), lessons.length, T0), elements: { ...RICH } };
    for (const id of ['build-turris', 'build-hortus', 'build-fons', 'build-bibliotheca']) save = cast(save, id).save;
    save = cast(save, 'rank-up').save;
    save = cast(save, 'rank-up').save;
    expect(save.rank).toBe('magistra');
    expect(cast(save, 'gather-more').outcome).toBe('cast');
  });
});

describe('save migration', () => {
  it('upgrades a stage-1 save without losing progress', () => {
    const v1 = {
      saveVersion: 1, createdAt: T0, lessons: { 'u1-l1': { completedAt: T0, bestMistakes: 0, timesCompleted: 1 } },
      cards: {}, elements: { terra: 4, aqua: 1, aer: 2, ignis: 3, aether: 1 }, camp: { fuel: 2, lastBurnAt: T0 },
      tasks: {}, spellbook: ['gather-wood'], daily: { lastLessonDay: null }, stats: { spellsCast: 1, reviewsDone: 0, lessonsFailed: 0 },
    };
    const save = migrate(v1);
    expect(save.saveVersion).toBe(2);
    expect(save.lessons['u1-l1']).toBeDefined();
    expect(save.elements.terra).toBe(4);
    expect(save.camp.fuel).toBe(2);
    expect(save.camp.buildings.focus.level).toBe(1);
    expect(save.rank).toBe('discipula');
    expect(save.settings.sound).toBe(true);
  });
});
