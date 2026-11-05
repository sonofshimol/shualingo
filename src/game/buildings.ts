/**
 * Buildings, production and harvesting (stage 2).
 * Production is lazy: nothing runs in the background. On every tick we look at how much
 * time passed since `lastProductionAt` and add what each building made in that time,
 * up to its storage (set by the tent level). Harvesting is limited by a daily cap,
 * so lessons stay the main source of elements.
 */
import { CONFIG, HOUR_MS } from '../config';
import { buildingById, buildings } from '../content';
import type { Building, ElementCost } from '../content/types';
import type { ElementDelta } from './elements';
import { dayKey, type CampState } from './state';

const BURN_MS = CONFIG.FIRE_BURN_HOURS * HOUR_MS;

export function isBuilt(camp: CampState, id: string): boolean {
  return Boolean(camp.buildings[id]);
}

export function buildingLevel(camp: CampState, id: string): number {
  return camp.buildings[id]?.level ?? 0;
}

export function maxLevel(building: Building): number {
  return 1 + (building.upgrade_costs?.length ?? 0);
}

/** How much each producing building can hold before it stops (bigger tent = more). */
export function storageCap(camp: CampState): number {
  const level = Math.max(1, buildingLevel(camp, 'tentorium'));
  const table = CONFIG.STORAGE_BY_TENT_LEVEL;
  return table[Math.min(level, table.length - 1)];
}

/** Materials needed to build a building, or to raise it to the next level. Null when maxed. */
export function nextBuildCost(camp: CampState, id: string): ElementCost | null {
  const building = buildingById.get(id);
  if (!building) return null;
  const level = buildingLevel(camp, id);
  if (level === 0) return building.build_cost ?? {};
  if (level >= maxLevel(building)) return null;
  return building.upgrade_costs![level - 1];
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

/** Adds production since the last update. Call before the fire burns (uses the fire's state). */
export function accrueProduction(camp: CampState, now: number): CampState {
  const from = camp.lastProductionAt;
  if (now <= from) return camp;
  const cap = storageCap(camp);
  const fireOutAt = camp.fuel > 0 ? camp.lastBurnAt + camp.fuel * BURN_MS : from;
  const pending = { ...camp.pending };

  for (const building of buildings) {
    if (!building.produces || !isBuilt(camp, building.id)) continue;
    const end = building.produces.needs_fire ? Math.min(now, fireOutAt) : now;
    if (end <= from) continue;
    let ms = end - from;
    if (camp.light) ms += overlap(from, end, camp.light.from, camp.light.until) * (CONFIG.LIGHT_PRODUCTION_MULTIPLIER - 1);
    const made = ms / (building.produces.every_hours * HOUR_MS);
    pending[building.id] = Math.min(cap, (pending[building.id] ?? 0) + made);
  }
  const light = camp.light && camp.light.until <= now ? null : camp.light;
  return { ...camp, pending, lastProductionAt: now, light };
}

/** Whole units ready to collect at a building. */
export function readyAt(camp: CampState, id: string): number {
  return Math.floor(camp.pending[id] ?? 0);
}

export function harvestedToday(camp: CampState, now: number): number {
  return camp.harvest.day === dayKey(now) ? camp.harvest.amount : 0;
}

export function harvestLeftToday(camp: CampState, now: number): number {
  return Math.max(0, CONFIG.DAILY_HARVEST_CAP - harvestedToday(camp, now));
}

/** Collects what a building made, within today's cap. */
export function harvest(camp: CampState, id: string, now: number): { camp: CampState; gained: ElementDelta; capped: boolean } {
  const building = buildingById.get(id);
  const ready = readyAt(camp, id);
  if (!building?.produces || ready === 0) return { camp, gained: {}, capped: false };
  const left = harvestLeftToday(camp, now);
  const take = Math.min(ready, left);
  if (take === 0) return { camp, gained: {}, capped: true };
  return {
    camp: {
      ...camp,
      pending: { ...camp.pending, [id]: (camp.pending[id] ?? 0) - take },
      harvest: { day: dayKey(now), amount: harvestedToday(camp, now) + take },
    },
    gained: { [building.produces.element]: take },
    capped: take < ready,
  };
}

/** Builds a building, or raises it one level. */
export function constructBuilding(camp: CampState, id: string, now: number): CampState {
  const level = buildingLevel(camp, id);
  return { ...camp, buildings: { ...camp.buildings, [id]: { level: level + 1, builtAt: camp.buildings[id]?.builtAt ?? now } } };
}
