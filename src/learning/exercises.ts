/** Answer checking shared by exercises and spells. Pure functions, no UI. */
import { exerciseWords, stripMacrons } from '../content';
import type { Exercise, Role } from '../content/types';
import { ruleCard, wordCard } from './srs';

export interface TileAnswer {
  answer: string[];
  any_order?: boolean;
  alternatives?: string[][];
}

const normTile = (t: string) => t.normalize('NFC').toLowerCase();

function sameSequence(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => normTile(t) === normTile(b[i]));
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sorted = (x: string[]) => x.map(normTile).sort().join('|');
  return sorted(a) === sorted(b);
}

/** Checks tiles placed by the player. Latin word order is free when any_order is set. */
export function tilesMatch(spec: TileAnswer, tiles: string[]): boolean {
  const accepted = [spec.answer, ...(spec.alternatives ?? [])];
  if (spec.any_order) return accepted.some((a) => sameMultiset(a, tiles));
  return accepted.some((a) => sameSequence(a, tiles));
}

export const ROLE_LABEL_HE: Record<Role, string> = {
  subject: 'מי עושה? (נושא)',
  object: 'את מי / את מה? (מושא)',
  indirect: 'למי? (נתינה)',
  means: 'במה? / עם מה? (אמצעי)',
};

/** Exact match for choice answers (Latin options compare without case). */
export function choiceMatches(answer: string, picked: string): boolean {
  return normTile(answer) === normTile(picked);
}

/** Loose comparison used only to warn about near-misses (missing macrons). */
export function sameIgnoringMacrons(a: string, b: string): boolean {
  return stripMacrons(normTile(a)) === stripMacrons(normTile(b));
}

/** Spaced-repetition cards an exercise practises: its words and its grammar rules. */
export function exerciseCards(ex: Exercise): string[] {
  return [...exerciseWords(ex).map(wordCard), ...(ex.rules ?? []).map(ruleCard)];
}

/** Fisher–Yates shuffle; pass a random source for deterministic tests. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
