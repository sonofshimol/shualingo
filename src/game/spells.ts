/**
 * Spells: a Latin sentence built from word tiles, paid for in elements.
 * Each word costs its own element (aquam costs aqua) — computed from words.json, not hand-written.
 * Building and rank spells add their materials on top.
 */
import { CONFIG, HOUR_MS } from '../config';
import { buildingById, lookupForm, rankById, wordById } from '../content';
import type { Spell } from '../content/types';
import { tilesMatch } from '../learning/exercises';
import { buildingLevel, isBuilt, maxLevel, nextBuildCost } from './buildings';
import { type ElementDelta, sumDeltas } from './elements';
import { missingForRank, nextRank, rankOrder } from './ranks';
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
  const words = spellCost(spell);
  if (spell.effect.type === 'build') return sumDeltas(words, nextBuildCost(save.camp, spell.effect.building) ?? {});
  if (spell.effect.type === 'rank') return sumDeltas(words, nextRank(save)?.cost ?? {});
  return words;
}

export function spellWords(spell: Spell): string[] {
  return [...new Set(spell.answer.map((t) => lookupForm(t)).filter((id): id is string => Boolean(id)))];
}

export function spellIsCorrect(spell: Spell, tiles: string[]): boolean {
  return tilesMatch(spell, tiles);
}

export interface SpellStatus {
  ready: boolean;
  /** Why it cannot be cast now (Hebrew). */
  reason_he?: string;
  /** For waits (the tree is still drinking): when it becomes possible. */
  until?: number;
}

/** Whether a known spell can be cast right now (apart from elements and suspension). */
export function spellStatus(save: SaveState, spell: Spell, now: number): SpellStatus {
  const req = spell.requires;
  if (req?.rank && rankOrder(save.rank) < rankOrder(req.rank)) {
    const rank = rankById.get(req.rank)!;
    return { ready: false, reason_he: `נפתח בדרגת ${rank.id} (${rank.name_he}).` };
  }
  if (req?.building && !isBuilt(save.camp, req.building)) {
    return { ready: false, reason_he: `צריך קודם לבנות ${buildingById.get(req.building)?.name_la}.` };
  }
  const effect = spell.effect;
  if (effect.type === 'build') {
    const building = buildingById.get(effect.building)!;
    if (nextBuildCost(save.camp, effect.building) === null) {
      return { ready: false, reason_he: maxLevel(building) > 1 ? `${building.name_la} כבר ברמה הגבוהה ביותר (${buildingLevel(save.camp, building.id)}).` : `${building.name_la} כבר בנוי.` };
    }
  }
  if (effect.type === 'grow') {
    if (save.camp.tree.stage >= CONFIG.TREE_MAX_STAGE) return { ready: false, reason_he: 'העץ כבר גדל עד הסוף.' };
    const last = save.camp.tree.lastWateredAt;
    const until = last === null ? 0 : last + CONFIG.TREE_GROW_COOLDOWN_HOURS * HOUR_MS;
    if (now < until) return { ready: false, reason_he: 'העץ עוד שותה מההשקיה הקודמת.', until };
  }
  if (effect.type === 'rank') {
    const rank = nextRank(save);
    if (!rank) return { ready: false, reason_he: 'השועלה כבר בדרגה הגבוהה ביותר.' };
    const missing = missingForRank(save, rank);
    if (missing.length) return { ready: false, reason_he: `לפני הדרגה ${rank.id} צריך: ${missing.join(', ')}.` };
  }
  return { ready: true };
}
