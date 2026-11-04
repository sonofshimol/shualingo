import type { ElementId } from '../content/types';
import type { ElementBag } from './state';

export type ElementDelta = Partial<Record<ElementId, number>>;

export function addElements(bag: ElementBag, delta: ElementDelta, times = 1): ElementBag {
  const next = { ...bag };
  for (const [id, amount] of Object.entries(delta) as [ElementId, number][]) {
    next[id] = (next[id] ?? 0) + amount * times;
  }
  return next;
}

export function sumDeltas(...deltas: ElementDelta[]): ElementDelta {
  const total: ElementDelta = {};
  for (const delta of deltas) {
    for (const [id, amount] of Object.entries(delta) as [ElementId, number][]) {
      total[id] = (total[id] ?? 0) + amount;
    }
  }
  return total;
}

export function canAfford(bag: ElementBag, cost: ElementDelta): boolean {
  return (Object.entries(cost) as [ElementId, number][]).every(([id, amount]) => (bag[id] ?? 0) >= amount);
}

export function subtractElements(bag: ElementBag, cost: ElementDelta): ElementBag {
  const next = { ...bag };
  for (const [id, amount] of Object.entries(cost) as [ElementId, number][]) {
    next[id] = (next[id] ?? 0) - amount;
  }
  return next;
}

export function isEmptyDelta(delta: ElementDelta): boolean {
  return Object.values(delta).every((v) => !v);
}
