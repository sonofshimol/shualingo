/**
 * What spells do. One place for every effect, used both by the taught spells (spell circle)
 * and by the spell lab, so the same magic always behaves the same way.
 */
import { CONFIG, HOUR_MS } from '../config';
import forestJson from '../../content/forest.json';
import labJson from '../../content/lab_effects.json';
import { buildingById, buildings, rankById, wordById } from '../content';
import type { ElementId, ForestArea, LabEffectRule, SpellEffect } from '../content/types';
import { constructBuilding, isBuilt, buildingLevel, maxLevel, nextBuildCost, storageCap } from '../game/buildings';
import { addFuel } from '../game/camp';
import { addElements, type ElementDelta, sumDeltas } from '../game/elements';
import { missingForRank, nextRank, rankOrder } from '../game/ranks';
import { dayKey, type EffectKind, type SaveState } from '../game/state';

export const forestAreas = forestJson.areas as ForestArea[];
export const labRules = labJson.effects as unknown as LabEffectRule[];

export interface EffectStatus {
  ready: boolean;
  reason_he?: string;
  until?: number;
}

/** Whether an effect can happen now (apart from elements and suspension). */
export function effectStatus(save: SaveState, effect: SpellEffect, now: number): EffectStatus {
  switch (effect.type) {
    case 'build': {
      const building = buildingById.get(effect.building);
      if (!building) return { ready: false, reason_he: 'אי אפשר לבנות את זה.' };
      if (nextBuildCost(save.camp, effect.building) === null) {
        return { ready: false, reason_he: maxLevel(building) > 1 ? `${building.name_la} כבר ברמה הגבוהה ביותר (${buildingLevel(save.camp, building.id)}).` : `${building.name_la} כבר בנוי.` };
      }
      return { ready: true };
    }
    case 'grow': {
      if (save.camp.tree.stage >= CONFIG.TREE_MAX_STAGE) return { ready: false, reason_he: 'העץ כבר גדל עד הסוף.' };
      const last = save.camp.tree.lastWateredAt;
      const until = last === null ? 0 : last + CONFIG.TREE_GROW_COOLDOWN_HOURS * HOUR_MS;
      return now < until ? { ready: false, reason_he: 'העץ עוד שותה מההשקיה הקודמת.', until } : { ready: true };
    }
    case 'rank': {
      const rank = nextRank(save);
      if (!rank) return { ready: false, reason_he: 'השועלה כבר בדרגה הגבוהה ביותר.' };
      const missing = missingForRank(save, rank);
      return missing.length ? { ready: false, reason_he: `לפני הדרגה ${rank.id} צריך: ${missing.join(', ')}.` } : { ready: true };
    }
    case 'offering':
      return save.daily.offeringDay === dayKey(now) ? { ready: false, reason_he: 'האלים כבר קיבלו מתנה היום. מחר אפשר שוב.' } : { ready: true };
    case 'reveal':
      return save.camp.forest.revealed.length >= forestAreas.length ? { ready: false, reason_he: 'כל שולי היער כבר מוארים.' } : { ready: true };
    default:
      return { ready: true };
  }
}

/** Materials on top of the words: building materials or the next rank's price. */
export function effectExtraCost(save: SaveState, effect: SpellEffect): ElementDelta {
  if (effect.type === 'build') return nextBuildCost(save.camp, effect.building) ?? {};
  if (effect.type === 'rank') return nextRank(save)?.cost ?? {};
  return {};
}

export function requirementStatus(save: SaveState, req: { rank?: string; building?: string } | undefined): EffectStatus {
  if (req?.rank && rankOrder(save.rank) < rankOrder(req.rank as never)) {
    const rank = rankById.get(req.rank as never)!;
    return { ready: false, reason_he: `נפתח בדרגת ${rank.id} (${rank.name_he}).` };
  }
  if (req?.building && !isBuilt(save.camp, req.building)) {
    return { ready: false, reason_he: `צריך קודם לבנות ${buildingById.get(req.building)?.name_la}.` };
  }
  return { ready: true };
}

/** Is a timed effect of this kind active at `now`? */
export function effectActive(save: SaveState, kind: EffectKind, now: number): boolean {
  return save.camp.effects.some((e) => e.kind === kind && e.from <= now && now < e.until);
}

/** A meaningful lab spell the player has not discovered yet, as a riddle. */
export function pickHint(save: SaveState, now: number): string {
  const found = new Set(Object.values(save.lab.discoveries).map((d) => d.rule));
  const open = labRules.filter((r) => !found.has(r.id) && requirementStatus(save, r.requires).ready);
  if (!open.length) return 'רוח היער מחייכת: גילית כבר את כל הלחשים שהיא מכירה.';
  const rule = open[Math.floor(now / 1000) % open.length];
  const verb = wordById.get(rule.verb);
  return `לחישה מהיער: "${rule.hint_he}" (הפועל: ${verb?.forms['imp.2sg'] ?? verb?.lemma}).`;
}

export interface EffectResult {
  save: SaveState;
  gained?: ElementDelta;
  note_he?: string;
}

/** Applies an effect. `power` is 2 when the spell had a means phrase (magnā vī…). */
export function applyEffect(save: SaveState, effect: SpellEffect, now: number, power = 1, object?: string): EffectResult {
  let next = save;
  switch (effect.type) {
    case 'gather':
      return { save: { ...next, camp: addFuel(next.camp, effect.amount * power, now) }, note_he: `המדורה קיבלה ${effect.amount * power} יחידות עץ.` };
    case 'build': {
      const id = effect.building === '$object' ? object ?? '' : effect.building;
      const camp = constructBuilding(next.camp, id, now);
      const building = buildingById.get(id)!;
      const level = camp.buildings[id].level;
      return { save: { ...next, camp }, note_he: level > 1 ? `${building.name_la} עלה לרמה ${level}.` : `${building.name_la} (${building.name_he}) נבנה!` };
    }
    case 'grow': {
      const stage = next.camp.tree.stage + 1;
      const final = stage >= CONFIG.TREE_MAX_STAGE;
      const gained = final ? sumDeltas(effect.reward, effect.final_reward) : effect.reward;
      next = { ...next, elements: addElements(next.elements, gained), camp: { ...next.camp, tree: { stage, lastWateredAt: now } } };
      return { save: next, gained, note_he: final ? 'העץ גדל עד הסוף! הוא נותן aether מיוחד.' : `העץ גדל (שלב ${stage} מתוך ${CONFIG.TREE_MAX_STAGE}).` };
    }
    case 'light':
      return { save: { ...next, camp: { ...next.camp, light: { from: now, until: now + effect.hours * power * HOUR_MS } } } };
    case 'rank': {
      const rank = nextRank(save)!;
      return { save: { ...next, rank: rank.id }, note_he: `השועלה היא עכשיו ${rank.id} (${rank.name_he})! ${rank.unlocks_he ? `נפתח: ${rank.unlocks_he}` : ''}`.trim() };
    }
    case 'timed': {
      const effects = [...next.camp.effects.filter((e) => e.kind !== effect.kind || e.until > now), { kind: effect.kind, from: now, until: now + effect.hours * power * HOUR_MS }];
      const what = { 'fire-guard': 'האש שמורה ולא תישרף', 'garden-boost': 'הגינה מייצרת פי שניים', shade: 'צל רך מכסה את המחנה: האש לא נשרפת והמחסנים מכפילים את עצמם' }[effect.kind];
      return { save: { ...next, camp: { ...next.camp, effects } }, note_he: `${what} — ${effect.hours * power} שעות.` };
    }
    case 'conjure': {
      const gained = { [effect.element]: effect.amount * power } as ElementDelta;
      return { save: { ...next, elements: addElements(next.elements, gained) }, gained };
    }
    case 'offering': {
      const gained = Object.fromEntries(Object.entries(effect.reward).map(([k, v]) => [k, (v ?? 0) * power])) as ElementDelta;
      return { save: { ...next, elements: addElements(next.elements, gained), daily: { ...next.daily, offeringDay: dayKey(now) } }, gained, note_he: 'המתנה התקבלה באור עדין.' };
    }
    case 'friend': {
      const options: ElementId[] = ['terra', 'aqua', 'aer', 'ignis'];
      const element = options[Math.floor(now / 60000) % options.length];
      const gained = { [element]: 2 * power } as ElementDelta;
      return { save: { ...next, elements: addElements(next.elements, gained) }, gained, note_he: 'שועל צעיר מהיער הגיע לביקור, והשאיר מתנה קטנה ליד האוהל.' };
    }
    case 'song': {
      const cap = storageCap(next.camp, now);
      const pending = { ...next.camp.pending };
      for (const b of buildings) if (b.produces && isBuilt(next.camp, b.id)) pending[b.id] = Math.min(cap, (pending[b.id] ?? 0) + 0.5 * power);
      return { save: { ...next, camp: { ...next.camp, pending } }, note_he: 'כל המחנה מקשיב לשיר. המבנים התמלאו קצת.' };
    }
    case 'hint':
      return { save: next, note_he: pickHint(next, now) };
    case 'reveal': {
      const area = forestAreas.find((a) => !next.camp.forest.revealed.includes(a.id))!;
      next = {
        ...next,
        elements: addElements(next.elements, area.reward),
        camp: { ...next.camp, forest: { revealed: [...next.camp.forest.revealed, area.id] } },
      };
      return { save: next, gained: area.reward, note_he: `${area.name_he}: ${area.find_he}` };
    }
  }
}
