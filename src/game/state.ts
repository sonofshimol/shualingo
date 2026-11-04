/**
 * The saved game: everything stored on the phone (IndexedDB) and in backup files.
 * Changing this shape? Bump SAVE_VERSION and add a step in src/storage/migrations.ts.
 */
import { CONFIG } from '../config';
import type { ElementId } from '../content/types';
import type { StoredCard } from '../learning/srs';

export const SAVE_VERSION = 1;

export type ElementBag = Record<ElementId, number>;

export interface TaskState {
  /** Failed attempts since the last success or the last suspension. */
  failures: number;
  /** Epoch ms when the suspension ends, or null when not suspended. */
  lockedUntil: number | null;
}

export interface LessonRecord {
  completedAt: number;
  bestMistakes: number;
  timesCompleted: number;
}

export interface CampState {
  /** Fuel units in the fire (focus). */
  fuel: number;
  /** When the fire last burned a unit (epoch ms); burning is computed lazily from this. */
  lastBurnAt: number;
}

export interface SaveState {
  saveVersion: number;
  createdAt: number;
  lessons: Record<string, LessonRecord>;
  /** Spaced-repetition cards: "word:<id>" and "rule:<id>". */
  cards: Record<string, StoredCard>;
  elements: ElementBag;
  camp: CampState;
  /** Suspension state per task: "lesson:<id>", "spell:<id>" (later "build:", "trade:"). */
  tasks: Record<string, TaskState>;
  /** Spell ids the fox knows (liber incantationum). */
  spellbook: string[];
  daily: { lastLessonDay: string | null };
  stats: { spellsCast: number; reviewsDone: number; lessonsFailed: number };
}

export function emptyElements(): ElementBag {
  return { terra: 0, aqua: 0, aer: 0, ignis: 0, aether: 0 };
}

export function newSave(now: number): SaveState {
  return {
    saveVersion: SAVE_VERSION,
    createdAt: now,
    lessons: {},
    cards: {},
    elements: emptyElements(),
    camp: { fuel: CONFIG.FIRE_START_FUEL, lastBurnAt: now },
    tasks: {},
    spellbook: [],
    daily: { lastLessonDay: null },
    stats: { spellsCast: 0, reviewsDone: 0, lessonsFailed: 0 },
  };
}

/** Local calendar day, e.g. "2026-11-05". */
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
