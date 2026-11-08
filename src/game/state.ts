/**
 * The saved game: everything stored on the phone (IndexedDB) and in backup files.
 * Changing this shape? Bump SAVE_VERSION and add a step in src/storage/migrations.ts.
 */
import { CONFIG } from '../config';
import type { ElementId, RankId } from '../content/types';
import type { StoredCard } from '../learning/srs';

export const SAVE_VERSION = 3;

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

export interface BuildingState {
  level: number;
  builtAt: number;
}

export interface CampState {
  /** Fuel units in the fire (focus). */
  fuel: number;
  /** When the fire last burned a unit (epoch ms); burning is computed lazily from this. */
  lastBurnAt: number;
  /** Buildings that stand in the camp. */
  buildings: Record<string, BuildingState>;
  /** Produced but not yet harvested, per building (fractions accumulate). */
  pending: Record<string, number>;
  /** Production is computed lazily from this time. */
  lastProductionAt: number;
  /** How much was harvested on `day` (the daily cap). */
  harvest: { day: string | null; amount: number };
  tree: { stage: number; lastWateredAt: number | null };
  /** Active light spell (Lūcem fac!), or null. */
  light: { from: number; until: number } | null;
  /** Stage 3: timed effects from discovered spells (shade, watered garden, guarded fire…). */
  effects: TimedEffect[];
  /** Stage 3: dark areas of the forest revealed by the light school. */
  forest: { revealed: string[] };
}

export type EffectKind = 'shade' | 'garden-boost' | 'fire-guard';

export interface TimedEffect {
  kind: EffectKind;
  from: number;
  until: number;
}

/** Stage 3: the spell lab. */
export interface LabState {
  /** Every grammatical combination ever cast, by signature. */
  discoveries: Record<string, { firstAt: number; casts: number; text: string }>;
  /** The last garbled cast (to reward fixing it with umbra). */
  lastGarble: { verb: string; at: number } | null;
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
  rank: RankId;
  lab: LabState;
  daily: {
    lastLessonDay: string | null;
    /** The word mini-game's daily reward cap. */
    verbaDay: string | null;
    verbaEarned: number;
    /** Dōnum deae dā! works once a day. */
    offeringDay: string | null;
  };
  stats: {
    spellsCast: number;
    reviewsDone: number;
    lessonsFailed: number;
    harvested: number;
    garbles: number;
    verbaCorrect: number;
  };
  settings: { sound: boolean; vibration: boolean };
}

export function emptyElements(): ElementBag {
  return { terra: 0, aqua: 0, aer: 0, ignis: 0, aether: 0, lux: 0, umbra: 0, spiritus: 0 };
}

export const INITIAL_BUILDINGS = ['focus', 'tentorium', 'circulus'];

export function newCamp(now: number): CampState {
  return {
    fuel: CONFIG.FIRE_START_FUEL,
    lastBurnAt: now,
    buildings: Object.fromEntries(INITIAL_BUILDINGS.map((id) => [id, { level: 1, builtAt: now }])),
    pending: {},
    lastProductionAt: now,
    harvest: { day: null, amount: 0 },
    tree: { stage: 0, lastWateredAt: null },
    light: null,
    effects: [],
    forest: { revealed: [] },
  };
}

export function newSave(now: number): SaveState {
  return {
    saveVersion: SAVE_VERSION,
    createdAt: now,
    lessons: {},
    cards: {},
    elements: emptyElements(),
    camp: newCamp(now),
    tasks: {},
    spellbook: [],
    rank: 'discipula',
    lab: { discoveries: {}, lastGarble: null },
    daily: { lastLessonDay: null, verbaDay: null, verbaEarned: 0, offeringDay: null },
    stats: { spellsCast: 0, reviewsDone: 0, lessonsFailed: 0, harvested: 0, garbles: 0, verbaCorrect: 0 },
    settings: { sound: true, vibration: true },
  };
}

/** Local calendar day, e.g. "2026-11-05". */
export function dayKey(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
