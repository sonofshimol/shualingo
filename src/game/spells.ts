/**
 * Spells: a Latin sentence built from word tiles, paid for in elements.
 * Each word costs its own element (aquam costs aqua) — computed from words.json, not hand-written.
 */
import { lookupForm, wordById } from '../content';
import type { Spell } from '../content/types';
import { tilesMatch } from '../learning/exercises';
import type { ElementDelta } from './elements';

export function spellCost(spell: Spell): ElementDelta {
  const cost: ElementDelta = {};
  for (const tile of spell.answer) {
    const word = wordById.get(lookupForm(tile) ?? '');
    if (word) cost[word.element] = (cost[word.element] ?? 0) + 1;
  }
  return cost;
}

export function spellWords(spell: Spell): string[] {
  return [...new Set(spell.answer.map((t) => lookupForm(t)).filter((id): id is string => Boolean(id)))];
}

export function spellIsCorrect(spell: Spell, tiles: string[]): boolean {
  return tilesMatch(spell, tiles);
}
