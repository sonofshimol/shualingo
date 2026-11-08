/** Ranks: discipula → maga → magistra. Rising costs aether and needs buildings and lessons. */
import { buildingById, lessons, rankById, ranks } from '../content';
import type { Rank, RankId } from '../content/types';
import { isBuilt } from './buildings';
import type { SaveState } from './state';

export function rankOrder(id: RankId): number {
  return rankById.get(id)?.order ?? 0;
}

export function nextRank(save: SaveState): Rank | undefined {
  return ranks.find((r) => r.order === rankOrder(save.rank) + 1);
}

/** What is still missing for the next rank, in Hebrew (empty when ready). */
export function missingForRank(save: SaveState, rank: Rank): string[] {
  const missing: string[] = [];
  for (const id of rank.requires.buildings ?? []) {
    if (!isBuilt(save.camp, id)) missing.push(`לבנות ${buildingById.get(id)?.name_la ?? id}`);
  }
  if (rank.requires.all_lessons && lessons.some((l) => !save.lessons[l.id])) missing.push('להשלים את כל השיעורים');
  return missing;
}

/** Mystic elements open with rank: lux at maga, umbra and spiritus at magistra. */
export function unlockedMystic(rank: RankId): ('lux' | 'umbra' | 'spiritus')[] {
  const order = rankOrder(rank);
  return [...(order >= 1 ? (['lux'] as const) : []), ...(order >= 2 ? (['umbra', 'spiritus'] as const) : [])];
}
