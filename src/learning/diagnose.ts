/**
 * Precise mistake diagnosis for lesson and review exercises.
 *
 * Compares the player's Latin answer with the right one, word by word, and explains the exact
 * difference in plain Hebrew — e.g. "liber is the subject form (who does?); here the book is
 * what is given, so the object form is needed: librum". This replaces showing a generic rule of
 * the exercise, which could talk about a different ending than the one the player got wrong.
 *
 * Used by: src/ui/screens/Feedback.tsx (via diagnoseExercise).
 * Pure functions, no UI. Tests: src/learning/diagnose.test.ts.
 */
import { latinWords, lookupForm, wordById } from '../content';
import type { Exercise, Word } from '../content/types';
import { keysFor } from '../magic/grammar';
import { ROLE_LABEL_HE } from './exercises';

const CASE_ORDER = ['nom', 'acc', 'dat', 'abl', 'gen', 'voc'] as const;

/** Hebrew names of the Latin cases, with the question each one answers. */
export const CASE_HE: Record<string, string> = {
  nom: 'צורת הנושא (מי עושה?)',
  acc: 'צורת המושא (את מי? את מה?)',
  dat: 'צורת הנתינה (למי?)',
  abl: 'צורת האמצעי (במה? עם מה?)',
  gen: 'צורת השייכות (של מי?)',
  voc: 'צורת הפנייה',
};

const VERB_HE: Record<string, string> = {
  'imp.2sg': 'פקודה לאדם אחד',
  'imp.2pl': 'פקודה לכמה אנשים',
  'pres.3sg': 'תיאור: הוא/היא עושה',
  'pres.3pl': 'תיאור: הם/הן עושים',
  'pres.1sg': 'תיאור: אני עושה',
  'pres.2sg': 'תיאור: אתה עושה',
  'pres.1pl': 'תיאור: אנחנו עושים',
  'pres.2pl': 'תיאור: אתם עושים',
  inf: 'שם הפועל (לעשות)',
};

const NUMBER_HE: Record<string, string> = { sg: 'יחיד', pl: 'רבים' };

const norm = (s: string) => s.normalize('NFC').toLowerCase().replace(/[^\p{L}]/gu, '');

/** Describes what a written form is, e.g. "צורת הנושא (מי עושה?), יחיד". `only` limits to some keys. */
export function describeForm(word: Word, form: string, only?: (key: string) => boolean): string {
  const keys = keysFor(word, form).filter((k) => !only || only(k));
  if (word.pos === 'verb') {
    const key = Object.keys(VERB_HE).find((k) => keys.includes(k));
    return key ? VERB_HE[key] : 'צורה אחרת של הפועל';
  }
  let cases: string[] = CASE_ORDER.filter((c) => keys.some((k) => k.startsWith(`${c}.`)));
  // The vocative almost always looks like the nominative; mention it only when it is the only reading.
  if (cases.length > 1) cases = cases.filter((c) => c !== 'voc');
  const numbers = [...new Set(keys.map((k) => k.split('.')[1]).filter(Boolean))];
  if (!cases.length) return 'צורה אחרת של המילה';
  const caseText = cases.length === 1 ? CASE_HE[cases[0]] : cases.map((c) => CASE_HE[c]).join(' או ');
  return numbers.length === 1 ? `${caseText}, ${NUMBER_HE[numbers[0]]}` : caseText;
}

/** Explains why `wrong` should have been `right` (two forms of the same word). */
export function explainFormSwap(word: Word, wrong: string, right: string): string {
  const wrongKeys = keysFor(word, wrong);
  const rightKeys = keysFor(word, right);
  // Describe each form by what makes it different from the other (lignum is nom AND acc, etc.).
  const wrongText = describeForm(word, wrong, (k) => !rightKeys.includes(k));
  const rightText = describeForm(word, right, (k) => !wrongKeys.includes(k));
  return `${wrong} היא ${wrongText}. כאן צריך ${rightText}: ${right}.`;
}

interface Tok {
  form: string;
  wordId?: string;
}

const toTokens = (forms: string[]): Tok[] => forms.map((form) => ({ form, wordId: lookupForm(form) }));
const meaning = (id?: string) => (id ? wordById.get(id)?.meaning_he : undefined);

/**
 * Compares two Latin answers. Returns up to two Hebrew messages, most important first.
 * `anyOrder`: when false and only the order differs, says so.
 */
export function diagnoseTokens(expected: string[], given: string[], anyOrder = true): string[] {
  const exp = toTokens(expected);
  const giv = toTokens(given);
  const usedGiven = new Set<number>();
  const messages: string[] = [];
  const missing: Tok[] = [];

  for (const e of exp) {
    const sameExact = giv.findIndex((g, i) => !usedGiven.has(i) && norm(g.form) === norm(e.form));
    if (sameExact >= 0) {
      usedGiven.add(sameExact);
      continue;
    }
    const sameWord = giv.findIndex((g, i) => !usedGiven.has(i) && g.wordId && g.wordId === e.wordId);
    if (sameWord >= 0) {
      usedGiven.add(sameWord);
      const word = wordById.get(e.wordId!);
      if (word) messages.push(explainFormSwap(word, giv[sameWord].form, e.form));
      continue;
    }
    missing.push(e);
  }
  const extra = giv.filter((_, i) => !usedGiven.has(i));

  // A different word in place of a missing one: a substitution.
  while (missing.length && extra.length) {
    const m = missing.shift()!;
    const x = extra.shift()!;
    messages.push(`במקום ${x.form}${meaning(x.wordId) ? ` (${meaning(x.wordId)})` : ''} צריך ${m.form}${meaning(m.wordId) ? ` (${meaning(m.wordId)})` : ''}.`);
  }
  for (const m of missing) messages.push(`חסרה המילה ${m.form}${meaning(m.wordId) ? ` (${meaning(m.wordId)})` : ''}.`);
  for (const x of extra) messages.push(`המילה ${x.form} מיותרת כאן.`);

  if (!messages.length && !anyOrder && expected.map(norm).join(' ') !== given.map(norm).join(' ')) {
    messages.push(`כל המילים נכונות, אבל כאן הסדר חשוב: ${expected.join(' ')}.`);
  }
  return messages.slice(0, 2);
}

/** What the player answered, as reported by the exercise views. */
export type GivenAnswer = string | string[] | undefined;

/** Hebrew messages that explain a wrong answer to an exercise (empty when nothing specific to say). */
export function diagnoseExercise(ex: Exercise, given: GivenAnswer): string[] {
  if (given === undefined) return [];
  switch (ex.type) {
    case 'build': {
      const tiles = Array.isArray(given) ? given : [given];
      const accepted = [ex.answer, ...(ex.alternatives ?? [])];
      // Diagnose against the accepted answer closest to what was given.
      const best = accepted
        .map((a) => diagnoseTokens(a, tiles, Boolean(ex.any_order)))
        .sort((a, b) => a.length - b.length)[0];
      return best;
    }
    case 'choice':
      if (ex.direction !== 'he-la' || typeof given !== 'string') return [];
      return diagnoseTokens(latinWords(ex.answer), latinWords(given), true);
    case 'ending': {
      if (typeof given !== 'string') return [];
      const word = wordById.get(lookupForm(ex.stem + ex.answer) ?? '');
      if (!word) return [];
      return [explainFormSwap(word, ex.stem + given, ex.stem + ex.answer)];
    }
    case 'role': {
      const target = latinWords(ex.sentence)[ex.target];
      const word = wordById.get(lookupForm(target) ?? '');
      if (!word) return [];
      return [`${target} היא ${describeForm(word, target)} — ולכן התפקיד שלה במשפט: ${ROLE_LABEL_HE[ex.answer]}.`];
    }
    default:
      return [];
  }
}
