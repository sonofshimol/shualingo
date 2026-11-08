/**
 * Spells: a Latin sentence built from word tiles, paid for in elements.
 * Each word costs its own element (aquam costs aqua) — computed from words.json, not hand-written.
 * Building and rank spells add their materials on top.
 */
import { lookupForm, wordById } from '../content';
import type { Spell } from '../content/types';
import { tilesMatch } from '../learning/exercises';
import { effectExtraCost, effectStatus, requirementStatus, type EffectStatus } from '../magic/effects';
import { type ElementDelta, sumDeltas } from './elements';
import type { SaveState } from './state';

/** The cost of the words alone. */
export function spellCost(spell: Spell): ElementDelta {
  const cost: ElementDelta = {};
  for (const tile of spell.answer) {
    const word = wordById.get(lookupForm(tile) ?? '');
    if (word) cost[word.element] = (cost[word.element] ?? 0) + 1;
  }
  return cost;
}

/** Words plus materials (for building and rank spells). */
export function spellTotalCost(save: SaveState, spell: Spell): ElementDelta {
  return sumDeltas(spellCost(spell), effectExtraCost(save, spell.effect));
}

export function spellWords(spell: Spell): string[] {
  return [...new Set(spell.answer.map((t) => lookupForm(t)).filter((id): id is string => Boolean(id)))];
}

export function spellIsCorrect(spell: Spell, tiles: string[]): boolean {
  return tilesMatch(spell, tiles);
}

export type SpellStatus = EffectStatus;

/** Whether a known spell can be cast right now (apart from elements and suspension). */
export function spellStatus(save: SaveState, spell: Spell, now: number): SpellStatus {
  const req = requirementStatus(save, spell.requires);
  if (!req.ready) return req;
  return effectStatus(save, spell.effect, now);
}
