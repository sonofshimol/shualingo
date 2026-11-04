/**
 * Spaced repetition with ts-fsrs. Each word and each grammar rule is one card.
 * Cards are stored as plain JSON (dates as ISO strings) so they survive IndexedDB and backups.
 */
import { createEmptyCard, fsrs, generatorParameters, Rating, type Card } from 'ts-fsrs';

export interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }));

export const wordCard = (wordId: string) => `word:${wordId}`;
export const ruleCard = (ruleId: string) => `rule:${ruleId}`;

export function parseCardId(cardId: string): { kind: 'word' | 'rule'; id: string } {
  const [kind, ...rest] = cardId.split(':');
  return { kind: kind as 'word' | 'rule', id: rest.join(':') };
}

function toStored(card: Card): StoredCard {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    ...(card.last_review ? { last_review: card.last_review.toISOString() } : {}),
  };
}

function fromStored(stored: StoredCard): Card {
  return {
    ...stored,
    due: new Date(stored.due),
    last_review: stored.last_review ? new Date(stored.last_review) : undefined,
  } as Card;
}

/** Rates one card: remembered → Good, forgotten → Again (comes back soon). New cards are created. */
export function rateCard(stored: StoredCard | undefined, remembered: boolean, now: number): StoredCard {
  const date = new Date(now);
  const card = stored ? fromStored(stored) : createEmptyCard(date);
  const { card: next } = scheduler.next(card, date, remembered ? Rating.Good : Rating.Again);
  return toStored(next);
}

/** Applies a batch of ratings ({cardId: remembered}) and returns the updated card map. */
export function applyRatings(
  cards: Record<string, StoredCard>,
  ratings: Record<string, boolean>,
  now: number,
): Record<string, StoredCard> {
  const next = { ...cards };
  for (const [cardId, remembered] of Object.entries(ratings)) {
    next[cardId] = rateCard(cards[cardId], remembered, now);
  }
  return next;
}

/** Card ids that are due now, most overdue first. */
export function dueCards(cards: Record<string, StoredCard>, now: number): string[] {
  return Object.entries(cards)
    .filter(([, c]) => Date.parse(c.due) <= now)
    .sort(([, a], [, b]) => Date.parse(a.due) - Date.parse(b.due))
    .map(([id]) => id);
}

/** When the next card becomes due (epoch ms), or null when there are no cards. */
export function nextDue(cards: Record<string, StoredCard>): number | null {
  const times = Object.values(cards).map((c) => Date.parse(c.due));
  return times.length ? Math.min(...times) : null;
}

/** A card counts as weak while it is still being learned or was recently forgotten. */
export function isWeak(card: StoredCard): boolean {
  return card.lapses > 0 || card.state !== 2; // 2 = Review state in FSRS
}
