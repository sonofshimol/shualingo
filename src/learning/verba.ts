/**
 * Verba — the word mini-game. Themed decks of common DCC words.
 * A new word is first introduced (meaning + familiar relatives), then quizzed later in the round.
 * Known words come back through FSRS. Each correct answer earns one of the word's own element
 * (no daily cap — the user asked for none).
 */
import { CONFIG } from '../config';
import { deckWords, wordById } from '../content';
import type { ElementId, Word } from '../content/types';
import { addElements, type ElementDelta } from '../game/elements';
import { dayKey, type SaveState } from '../game/state';
import { shuffle } from './exercises';
import { applyRatings, wordCard, type StoredCard } from './srs';

export type VerbaCard =
  | { kind: 'intro'; wordId: string }
  | { kind: 'quiz'; wordId: string; direction: 'la-he' | 'he-la'; options: string[]; answer: string };

export function isLearned(card: StoredCard | undefined): boolean {
  return Boolean(card && (card.state === 2 || card.reps >= 3));
}

export function deckProgress(save: SaveState, deckId: string): { learned: number; seen: number; total: number } {
  const list = deckWords(deckId);
  return {
    learned: list.filter((w) => isLearned(save.cards[wordCard(w.id)])).length,
    seen: list.filter((w) => save.cards[wordCard(w.id)]).length,
    total: list.length,
  };
}

function quiz(word: Word, pool: Word[], random: () => number, laToHe: boolean): VerbaCard {
  const others = shuffle(pool.filter((w) => w.id !== word.id), random);
  const pick = (f: (w: Word) => string) => [...new Set(others.map(f))].filter((v) => v !== f(word)).slice(0, 3);
  if (laToHe) {
    return { kind: 'quiz', wordId: word.id, direction: 'la-he', answer: word.meaning_he, options: shuffle([word.meaning_he, ...pick((w) => w.meaning_he)], random) };
  }
  return { kind: 'quiz', wordId: word.id, direction: 'he-la', answer: word.lemma, options: shuffle([word.lemma, ...pick((w) => w.lemma)], random) };
}

/** A round: due words first, then a few new ones (each introduced before it is asked), then known ones. */
export function buildRound(save: SaveState, deckId: string, now: number, random: () => number = Math.random): VerbaCard[] {
  const list = deckWords(deckId);
  const card = (w: Word) => save.cards[wordCard(w.id)];
  const due = shuffle(list.filter((w) => card(w) && Date.parse(card(w)!.due) <= now), random);
  const fresh = list.filter((w) => !card(w)).slice(0, CONFIG.VERBA_NEW_PER_ROUND);
  const known = shuffle(list.filter((w) => card(w) && !due.includes(w)), random).sort((a, b) => card(a)!.stability - card(b)!.stability);

  const quizWords = [...due, ...fresh, ...known].slice(0, CONFIG.VERBA_ROUND_SIZE);
  const order = shuffle(quizWords, random);
  const cards: VerbaCard[] = [];
  const introduced = new Set<string>();
  order.forEach((word, i) => {
    if (fresh.includes(word) && !introduced.has(word.id)) {
      cards.push({ kind: 'intro', wordId: word.id });
      introduced.add(word.id);
    }
    cards.push(quiz(word, list, random, i % 2 === 0 || fresh.includes(word)));
  });
  // A short round (a fresh deck) asks each new word a second time, the other way round, near the end.
  const quizCount = () => cards.filter((c) => c.kind === 'quiz').length;
  for (const word of fresh) {
    if (quizCount() >= CONFIG.VERBA_ROUND_SIZE) break;
    if (quizWords.includes(word)) cards.push(quiz(word, list, random, false));
  }
  // Move each new word's quiz a little later than its introduction, so it is recalled, not copied.
  for (let i = 0; i < cards.length - 1; i += 1) {
    if (cards[i].kind === 'intro' && cards[i + 1].kind === 'quiz' && cards[i + 1].wordId === cards[i].wordId) {
      const [q] = cards.splice(i + 1, 1);
      cards.splice(Math.min(cards.length, i + 3), 0, q);
    }
  }
  return cards;
}

/** Applies a finished round: spaced repetition for every word, and one element per correct answer. */
export function finishRound(
  save: SaveState,
  results: { wordId: string; correct: boolean }[],
  now: number,
): { save: SaveState; earned: ElementDelta } {
  const ratings: Record<string, boolean> = {};
  for (const r of results) ratings[wordCard(r.wordId)] = (ratings[wordCard(r.wordId)] ?? true) && r.correct;
  const earned: ElementDelta = {};
  for (const r of results) {
    if (!r.correct) continue;
    const element = (wordById.get(r.wordId)?.element ?? 'terra') as ElementId;
    earned[element] = (earned[element] ?? 0) + 1;
  }
  const gained = Object.values(earned).reduce((a, b) => a + (b ?? 0), 0);
  const today = dayKey(now);
  const before = save.daily.verbaDay === today ? save.daily.verbaEarned : 0;
  return {
    save: {
      ...save,
      cards: applyRatings(save.cards, ratings, now),
      elements: addElements(save.elements, earned),
      daily: { ...save.daily, verbaDay: today, verbaEarned: before + gained },
      stats: { ...save.stats, verbaCorrect: save.stats.verbaCorrect + results.filter((r) => r.correct).length },
    },
    earned,
  };
}
