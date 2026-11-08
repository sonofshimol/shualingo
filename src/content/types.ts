/** Types for the JSON files in /content. Documented for humans in content/SCHEMA.md. */

export type ElementId = 'terra' | 'aqua' | 'aer' | 'ignis' | 'aether' | 'lux' | 'umbra' | 'spiritus';
export const BASE_ELEMENTS: ElementId[] = ['terra', 'aqua', 'aer', 'ignis', 'aether'];
/** Stage 3: the mystic elements, each opening a school of spells. */
export const MYSTIC_ELEMENTS: ElementId[] = ['lux', 'umbra', 'spiritus'];
export const ALL_ELEMENTS: ElementId[] = [...BASE_ELEMENTS, ...MYSTIC_ELEMENTS];

export type PartOfSpeech = 'noun' | 'verb' | 'adj' | 'pron' | 'conj' | 'adv' | 'prep';

export interface Expression {
  text: string;
  meaning_he: string;
}

export interface WordFamily {
  en?: string[];
  he?: string[];
  es?: string[];
  it?: string[];
  fr?: string[];
  pt?: string[];
  ro?: string[];
  ca?: string[];
  note_he?: string;
  [lang: string]: string[] | string | undefined;
}

export interface Word {
  id: string;
  lemma: string;
  dictionary_form: string;
  pos: PartOfSpeech;
  meaning_he: string;
  meaning_en: string;
  ipa: string | null;
  dcc_rank: number | null;
  dcc_group: string | null;
  exception_reason: string | null;
  element: ElementId;
  /** e.g. "acc.sg", "dat.pl", "nom.sg.f", "pres.3sg", "imp.2sg", "inf" */
  forms: Record<string, string>;
  family: WordFamily;
  expressions: Expression[];
  etymology_en: string | null;
  /** Nouns: grammatical gender and declension (from Wiktionary). */
  gender?: 'm' | 'f' | 'n' | null;
  declension?: number | null;
  /** Themed deck for the word mini-game (Verba). Words without a deck belong to the units. */
  deck?: string;
  /** Meaning tags the spell lab uses (resource, plant, person, building…). */
  tags?: string[];
}

export interface Rule {
  id: string;
  title_he: string;
  explain_he: string;
  examples: { la: string; he: string }[];
  /** Lets the review engine build a drill for this rule from any known noun. */
  drill?: { form: string; prompt_he: string };
}

export type Role = 'subject' | 'object' | 'indirect';

interface ExerciseBase {
  rules?: string[];
  explain_he?: string;
}

export interface MatchExercise extends ExerciseBase {
  type: 'match';
  words: string[];
}

export interface ChoiceExercise extends ExerciseBase {
  type: 'choice';
  direction: 'la-he' | 'he-la';
  prompt: string;
  /** Optional Latin cue shown above a Hebrew prompt (used by generated review drills). */
  prompt_la?: string;
  answer: string;
  distractors: string[];
  /** Explicit word ids; otherwise derived from the Latin text. */
  words?: string[];
}

export interface BuildExercise extends ExerciseBase {
  type: 'build';
  prompt_he: string;
  answer: string[];
  alternatives?: string[][];
  any_order?: boolean;
  extra: string[];
}

export interface RoleExercise extends ExerciseBase {
  type: 'role';
  sentence: string;
  target: number;
  answer: Role;
  options?: Role[];
  translation_he: string;
}

export interface EndingExercise extends ExerciseBase {
  type: 'ending';
  before: string;
  stem: string;
  after: string;
  answer: string;
  options: string[];
  translation_he: string;
}

export type Exercise = MatchExercise | ChoiceExercise | BuildExercise | RoleExercise | EndingExercise;
export type ExerciseType = Exercise['type'];

export interface Lesson {
  id: string;
  title_he: string;
  rules_intro: string[];
  exercises: Exercise[];
}

export interface Unit {
  id: string;
  /** The unit stays locked until this building stands in the camp. */
  requires?: { building: string };
  title_he: string;
  subtitle_he: string;
  dooge?: string;
  words: string[];
  lessons: Lesson[];
}

export type ElementCost = Partial<Record<ElementId, number>>;

export type SpellEffect =
  | { type: 'gather'; resource: 'fuel'; amount: number }
  | { type: 'build'; building: string }
  | { type: 'grow'; reward: ElementCost; final_reward: ElementCost }
  | { type: 'light'; hours: number }
  | { type: 'rank' }
  // stage 3 (spell lab)
  | { type: 'timed'; kind: 'shade' | 'garden-boost' | 'fire-guard'; hours: number }
  | { type: 'conjure'; element: ElementId; amount: number }
  | { type: 'offering'; reward: ElementCost }
  | { type: 'friend' }
  | { type: 'song' }
  | { type: 'hint' }
  | { type: 'reveal' };

/** A spell-lab rule: which analysed sentence produces which effect (content/lab_effects.json). */
export interface LabEffectRule {
  id: string;
  verb: string;
  object: { word?: string; tag?: string } | null;
  /** null = must be empty, "any" = anything or nothing. */
  recipient: { word?: string; tag?: string } | null | 'any';
  effect: SpellEffect;
  name_he: string;
  hint_he: string;
  requires?: { rank?: RankId; building?: string };
  extra_cost?: ElementCost;
}

export interface ForestArea {
  id: string;
  name_he: string;
  find_he: string;
  reward: ElementCost;
}

export interface GarbleDef {
  id: string;
  rule: string;
  animation: 'steam' | 'puddle' | 'sparks' | 'float' | 'narrator' | 'echo' | 'giant';
  title_he: string;
  effect_he: string;
  explain_he: string;
}

export type RankId = 'discipula' | 'maga' | 'magistra';

export interface Rank {
  id: RankId;
  name_he: string;
  order: number;
  description_he: string;
  unlocks_he: string;
  cost: ElementCost;
  requires: { buildings?: string[]; all_lessons?: boolean };
}

export interface Spell {
  id: string;
  school: string;
  text: string;
  meaning_he: string;
  answer: string[];
  any_order?: boolean;
  alternatives?: string[][];
  extra: string[];
  effect: SpellEffect;
  unlocked_by: string;
  /** Extra conditions before the spell can be cast (it is already in the spellbook). */
  requires?: { rank?: RankId; building?: string };
  explain_he: string;
  effect_he: string;
}

export interface ElementDef {
  id: string;
  name_he: string;
  mystic: boolean;
  stage: number;
  color: string;
  /** The classical alchemical symbol, described in words. */
  symbol_he: string;
  source_he: string;
  use_he: string;
}

export interface Building {
  id: string;
  name_la: string;
  name_he: string;
  description_he: string;
  stage: number;
  initial: boolean;
  unlocked_by?: string;
  /** Elements produced over time (also while the app is closed). */
  produces?: { element: ElementId; every_hours: number; needs_fire?: boolean };
  /** Materials paid on top of the build spell's word cost. */
  build_cost?: ElementCost;
  /** Upgrade materials for level 2, 3, … (index 0 = going to level 2). */
  upgrade_costs?: ElementCost[];
  /** Content this building opens. */
  unlocks?: { unit?: string };
}

export interface Deck {
  id: string;
  name_la: string;
  name_he: string;
  element: ElementId;
}
