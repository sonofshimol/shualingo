/**
 * Loads the content JSON (bundled into the app, so it works offline) and builds lookup tables.
 */
import wordsJson from '../../content/words.json';
import unitsJson from '../../content/units.json';
import rulesJson from '../../content/rules.json';
import spellsJson from '../../content/spells.json';
import elementsJson from '../../content/elements.json';
import buildingsJson from '../../content/buildings.json';
import ranksJson from '../../content/ranks.json';
import decksJson from '../../content/decks.json';
import textsJson from '../../content/texts.json';
import type {
  Building, Deck, ElementDef, ReadingText, Exercise, Lesson, Rank, Rule, Spell, Unit, Word,
} from './types';

export const words = wordsJson.words as unknown as Word[];
export const units = unitsJson.units as unknown as Unit[];
export const rules = rulesJson.rules as Rule[];
export const spells = spellsJson.spells as unknown as Spell[];
export const elementDefs = elementsJson.elements as ElementDef[];
export const buildings = buildingsJson.buildings as unknown as Building[];
export const ranks = (ranksJson.ranks as unknown as Rank[]).sort((a, b) => a.order - b.order);

export const wordById = new Map(words.map((w) => [w.id, w]));
export const ruleById = new Map(rules.map((r) => [r.id, r]));
export const spellById = new Map(spells.map((s) => [s.id, s]));
export const elementById = new Map(elementDefs.map((e) => [e.id, e]));
export const buildingById = new Map(buildings.map((b) => [b.id, b]));
export const rankById = new Map(ranks.map((r) => [r.id, r]));
export const unitById = new Map(units.map((u) => [u.id, u]));
export const decks = decksJson.decks as Deck[];
export const readingTexts = textsJson.texts as unknown as ReadingText[];
export const deckWords = (deckId: string) => words.filter((w) => w.deck === deckId);

/** Every lesson in course order. */
export const lessons: Lesson[] = units.flatMap((u) => u.lessons);
export const lessonById = new Map(lessons.map((l) => [l.id, l]));
export const unitOfLesson = new Map(units.flatMap((u) => u.lessons.map((l) => [l.id, u] as const)));

// ------------------------------------------------------------- Latin text lookup

export function stripMacrons(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}

function norm(text: string): string {
  return text.normalize('NFC').toLowerCase();
}

/** Map from a Latin form (lower-case) to the word it belongs to. */
const formIndex = new Map<string, string>();
const looseIndex = new Map<string, string>();
for (const word of words) {
  for (const form of [word.lemma, ...Object.values(word.forms)]) {
    const key = norm(form);
    if (!formIndex.has(key)) formIndex.set(key, word.id);
    const loose = stripMacrons(key);
    if (!looseIndex.has(loose)) looseIndex.set(loose, word.id);
  }
}

/** Finds which dictionary word a written form belongs to ("aquam" → "aqua"). */
export function lookupForm(form: string, strict = false): string | undefined {
  const key = norm(form.replace(/[^\p{L}]/gu, ''));
  if (!key) return undefined;
  return formIndex.get(key) ?? (strict ? undefined : looseIndex.get(stripMacrons(key)));
}

export interface Token {
  text: string;
  wordId?: string;
}

/** Splits Latin text into words and punctuation, attaching dictionary ids to known words. */
export function tokenize(text: string): Token[] {
  const parts = text.match(/[\p{L}]+|[^\p{L}]+/gu) ?? [];
  return parts.map((part) => (/^\p{L}/u.test(part) ? { text: part, wordId: lookupForm(part) } : { text: part }));
}

/** Latin words (not punctuation) of a sentence, in order. */
export function latinWords(text: string): string[] {
  return text.match(/[\p{L}]+/gu) ?? [];
}

export function wordsInText(text: string): string[] {
  const ids = tokenize(text).map((t) => t.wordId).filter((id): id is string => Boolean(id));
  return [...new Set(ids)];
}

/** The Latin text an exercise contains (for word lookup and spaced repetition). */
export function exerciseLatin(ex: Exercise): string {
  switch (ex.type) {
    case 'match':
      return ex.words.map((id) => wordById.get(id)?.lemma ?? id).join(' ');
    case 'choice':
      return ex.direction === 'la-he' ? ex.prompt : ex.answer;
    case 'build':
      return ex.answer.join(' ');
    case 'role':
      return ex.sentence;
    case 'ending':
      return endingSentence(ex);
  }
}

export function endingSentence(ex: { before: string; stem: string; answer: string; after: string }): string {
  const word = ex.stem + ex.answer;
  const after = /^[.!?,]/.test(ex.after) ? ex.after : ` ${ex.after}`;
  return `${ex.before ? `${ex.before} ` : ''}${word}${after}`.trim();
}

/** Word ids an exercise practises. */
export function exerciseWords(ex: Exercise): string[] {
  if (ex.type === 'match') return [...ex.words];
  if (ex.type === 'choice' && ex.words) return [...ex.words];
  return wordsInText(exerciseLatin(ex));
}

/** Capitalises the first letter and adds final punctuation for display. */
export function sentenceFromTiles(tiles: string[], punctuation = ''): string {
  const text = tiles.join(' ');
  return text.charAt(0).toUpperCase() + text.slice(1) + punctuation;
}
