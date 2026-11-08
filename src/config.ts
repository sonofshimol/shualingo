/**
 * כל הקבועים של המשחק במקום אחד. משנים כאן מספר — וזה משתנה בכל האפליקציה.
 * All tunable game constants live here.
 */
import type { ElementId, ExerciseType } from './content/types';

export const CONFIG = {
  /** כמה שעות משימה נעולה אחרי כישלונות חוזרים (הוחלט: שעתיים). */
  SUSPENSION_HOURS: 2,
  /** כמה כישלונות באותה משימה עד שהיא ננעלת. */
  FAILURES_BEFORE_SUSPENSION: 3,
  /** כמה טעויות בשיעור אחד עד שהניסיון נחשב לכישלון. */
  LESSON_MISTAKES_TO_FAIL: 4,

  /** המדורה שורפת יחידת דלק אחת בכל פרק זמן כזה (שעות). */
  FIRE_BURN_HOURS: 3,
  /** כמה דלק המדורה יכולה להכיל. */
  FIRE_MAX_FUEL: 6,
  /** דלק התחלתי במשחק חדש. */
  FIRE_START_FUEL: 3,

  /** אלמנטים לכל תשובה נכונה בניסיון הראשון, לפי סוג התרגיל. */
  EXERCISE_REWARDS: {
    match: { terra: 1 },
    choice: { terra: 1 },
    build: { aer: 1 },
    role: { ignis: 1 },
    ending: { ignis: 1 },
  } satisfies Record<ExerciseType, Partial<Record<ElementId, number>>>,
  /** אלמנטים לכל תשובה נכונה בחזרה על מילים חלשות. */
  REVIEW_REWARD: { aqua: 1 } as Partial<Record<ElementId, number>>,
  /** בונוס על השיעור הראשון שמסיימים בכל יום. */
  DAILY_LESSON_REWARD: { aether: 1 } as Partial<Record<ElementId, number>>,

  /** כמה כרטיסים לכל היותר בסבב חזרה אחד. */
  REVIEW_SESSION_SIZE: 12,

  // ---- שלב 2: מבנים וייצור ----
  /** כמה אלמנטים אפשר לקצור מהמבנים בכל יום, בסך הכול (הוחלט: כמו שיעור אחד, בערך 10). */
  DAILY_HARVEST_CAP: 10,
  /** כמה כל מבנה צובר לפני שצריך לקצור, לפי רמת האוהל (מקום 1 = רמה 1). */
  STORAGE_BY_TENT_LEVEL: [0, 3, 5, 8] as readonly number[],
  /** כל כמה שעות אפשר להשקות את העץ שוב. */
  TREE_GROW_COOLDOWN_HOURS: 12,
  /** כמה שלבי גדילה יש לעץ (0 = שתיל). */
  TREE_MAX_STAGE: 3,
  /** פי כמה המבנים מייצרים בזמן שלחש האור פועל. */
  LIGHT_PRODUCTION_MULTIPLIER: 2,

  // ---- שלב 3: משחק המילים Verba ----
  /** כמה שאלות בסבב אחד. */
  VERBA_ROUND_SIZE: 10,
  /** כמה מילים חדשות לכל היותר בסבב. */
  VERBA_NEW_PER_ROUND: 4,
  /** כמה אלמנטים אפשר להרוויח ממשחק המילים ביום (כדי שהשיעורים יישארו העיקר). */
  VERBA_DAILY_CAP: 10,
} as const;

export const HOUR_MS = 60 * 60 * 1000;
