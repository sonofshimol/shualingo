/** Types for the JSON files in /content. Documented for humans in content/SCHEMA.md. */

export type ElementId = 'terra' | 'aqua' | 'aer' | 'ignis' | 'aether';
export const BASE_ELEMENTS: ElementId[] = ['terra', 'aqua', 'aer', 'ignis', 'aether'];

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
  title_he: string;
  subtitle_he: string;
  dooge?: string;
  words: string[];
  lessons: Lesson[];
}

export interface SpellEffect {
  type: 'gather';
  resource: 'fuel';
  amount: number;
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
  explain_he: string;
  effect_he: string;
}

export interface ElementDef {
  id: string;
  name_he: string;
  mystic: boolean;
  stage: number;
  color: string;
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
}
