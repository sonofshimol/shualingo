/**
 * Builds a review session ("חזרה") from the cards that spaced repetition says are due.
 * Words become match / multiple-choice drills; grammar rules become form drills.
 */
import { CONFIG } from '../config';
import { ruleById, rules, units, wordById, words } from '../content';
import type { ChoiceExercise, Exercise, Word } from '../content/types';
import { shuffle } from './exercises';
import { dueCards, parseCardId, ruleCard, wordCard, type StoredCard } from './srs';

export interface ReviewItem {
  exercise: Exercise;
  /** Cards rated by this item. */
  cards: string[];
}

/** Forms taught in stage 1; drills only offer these as answers and distractors. */
const TAUGHT_FORMS = ['nom.sg', 'nom.pl', 'acc.sg', 'acc.pl', 'dat.sg', 'dat.pl', 'pres.3sg', 'pres.3pl', 'imp.2sg', 'imp.2pl'];

const courseWords = new Set(units.flatMap((u) => u.words));

function pickDistinct(pool: string[], exclude: string, count: number, random: () => number): string[] {
  const unique = [...new Set(pool)].filter((v) => v !== exclude);
  return shuffle(unique, random).slice(0, count);
}

function knownWordIds(cards: Record<string, StoredCard>): string[] {
  return Object.keys(cards).map(parseCardId).filter((c) => c.kind === 'word').map((c) => c.id);
}

function distractorWords(target: Word, known: string[]): Word[] {
  const pool = known.length >= 3 ? known : [...courseWords];
  const all = pool.map((id) => wordById.get(id)).filter((w): w is Word => Boolean(w) && w!.id !== target.id);
  const samePos = all.filter((w) => w.pos === target.pos);
  return samePos.length >= 2 ? samePos : all;
}

function wordChoice(word: Word, known: string[], laToHe: boolean, random: () => number): ChoiceExercise {
  const others = distractorWords(word, known);
  if (laToHe) {
    return {
      type: 'choice', direction: 'la-he', prompt: word.lemma, answer: word.meaning_he, words: [word.id],
      distractors: pickDistinct(others.map((w) => w.meaning_he), word.meaning_he, 2, random),
    };
  }
  return {
    type: 'choice', direction: 'he-la', prompt: word.meaning_he, answer: word.lemma, words: [word.id],
    distractors: pickDistinct(others.map((w) => w.lemma), word.lemma, 2, random),
  };
}

function ruleDrill(ruleId: string, known: string[], random: () => number): ChoiceExercise | null {
  const rule = ruleById.get(ruleId);
  if (!rule) return null;
  if (rule.drill) {
    const { form, prompt_he } = rule.drill;
    const candidates = shuffle(
      (known.length ? known : [...courseWords])
        .map((id) => wordById.get(id))
        .filter((w): w is Word => Boolean(w?.forms[form])),
      random,
    );
    for (const word of candidates) {
      const answer = word.forms[form];
      const pool = TAUGHT_FORMS.filter((k) => k !== form && word.forms[k]).map((k) => word.forms[k]);
      const distractors = pickDistinct(pool, answer, 2, random);
      if (distractors.length === 2) {
        return {
          type: 'choice', direction: 'he-la', prompt: prompt_he, prompt_la: word.lemma, answer, distractors,
          words: [], rules: [ruleId], explain_he: rule.explain_he,
        };
      }
    }
  }
  const example = rule.examples[0];
  const otherExamples = rules.filter((r) => r.id !== ruleId).flatMap((r) => r.examples.map((e) => e.he));
  return {
    type: 'choice', direction: 'la-he', prompt: example.la, answer: example.he, words: [],
    distractors: pickDistinct(otherExamples, example.he, 2, random), rules: [ruleId], explain_he: rule.explain_he,
  };
}

export function buildReview(
  cards: Record<string, StoredCard>,
  now: number,
  random: () => number = Math.random,
): ReviewItem[] {
  const due = dueCards(cards, now).slice(0, CONFIG.REVIEW_SESSION_SIZE).map(parseCardId);
  const known = knownWordIds(cards);
  const dueWords = due.filter((c) => c.kind === 'word' && wordById.has(c.id)).map((c) => c.id);
  const dueRules = due.filter((c) => c.kind === 'rule').map((c) => c.id);
  const items: ReviewItem[] = [];

  let rest = dueWords;
  if (dueWords.length >= 4) {
    const group = dueWords.slice(0, 4);
    items.push({ exercise: { type: 'match', words: group }, cards: group.map(wordCard) });
    rest = dueWords.slice(4);
  }
  rest.forEach((id, i) => {
    const word = wordById.get(id)!;
    items.push({ exercise: wordChoice(word, known, i % 2 === 0, random), cards: [wordCard(id)] });
  });
  for (const id of dueRules) {
    const drill = ruleDrill(id, known, random);
    if (drill) items.push({ exercise: drill, cards: [ruleCard(id)] });
  }
  return shuffle(items, random);
}

/** Exported for tests: every course word has a usable meaning and lemma. */
export const reviewableWords = words.filter((w) => courseWords.has(w.id));
