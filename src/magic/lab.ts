/**
 * The spell lab: cast any sentence built from known words.
 * - Correct and meaningful → the effect happens, and a new combination is a discovery.
 * - Correct but nothing in the camp answers → a gentle "harmless" discovery.
 * - Grammar error → a garbled spell: a fitting mishap, an explanation, and the rule goes to review.
 * Lab experiments never count toward suspension: trying things out should feel safe.
 */
import { CONFIG, HOUR_MS } from '../config';
import garblesJson from '../../content/garbles.json';
import { lookupForm, wordById } from '../content';
import type { GarbleDef, LabEffectRule, Spell, SpellEffect } from '../content/types';
import { tick } from '../game/actions';
import { addElements, canAfford, type ElementDelta, subtractElements, sumDeltas } from '../game/elements';
import { rankOrder } from '../game/ranks';
import type { SaveState } from '../game/state';
import { applyRatings, ruleCard, wordCard } from '../learning/srs';
import { applyEffect, effectExtraCost, effectStatus, labRules, requirementStatus } from './effects';
import { analyze, keysFor, type Analysis, type GrammarError, type LabSentence, type SlotRole } from './grammar';

export const garbles = garblesJson.garbles as GarbleDef[];
export const garbleById = new Map(garbles.map((g) => [g.id, g]));

/** Effects that wait LAB_COOLDOWN_HOURS before the same lab spell works again. */
const COOLDOWN_TYPES = new Set(['gather', 'conjure', 'friend', 'song', 'hint', 'timed', 'light']);

function matches(spec: { word?: string; tag?: string }, wordId: string | undefined): boolean {
  if (!wordId) return false;
  if (spec.word) return spec.word === wordId;
  return Boolean(spec.tag && wordById.get(wordId)?.tags?.includes(spec.tag));
}

export function matchRule(sentence: LabSentence): LabEffectRule | null {
  for (const rule of labRules) {
    if (rule.verb !== sentence.verb?.wordId) continue;
    if (rule.object === null ? sentence.object : !matches(rule.object, sentence.object?.wordId)) continue;
    if (rule.recipient !== 'any') {
      if (rule.recipient === null ? sentence.recipient : !matches(rule.recipient, sentence.recipient?.wordId)) continue;
    }
    return rule;
  }
  return null;
}

export function resolveEffect(rule: LabEffectRule, sentence: LabSentence): SpellEffect {
  return rule.effect.type === 'build' && rule.effect.building === '$object'
    ? { type: 'build', building: sentence.object?.wordId ?? '' }
    : rule.effect;
}

/** Every word costs its element; extras for materials, mystic schools and a means phrase. */
export function labCost(save: SaveState, sentence: LabSentence, rule: LabEffectRule, analysis: Analysis): ElementDelta {
  const cost: ElementDelta = {};
  for (const fill of Object.values(sentence)) {
    for (const id of [fill?.wordId, fill?.modifier?.wordId]) {
      const word = id ? wordById.get(id) : undefined;
      if (word) cost[word.element] = (cost[word.element] ?? 0) + 1;
    }
  }
  return sumDeltas(
    cost,
    rule.extra_cost ?? {},
    effectExtraCost(save, resolveEffect(rule, sentence)),
    analysis.hasMeans ? CONFIG.MEANS_EXTRA_COST : {},
  );
}

export function fillTemplate(text: string, error: GrammarError): string {
  const word = wordById.get(error.wordId);
  return text
    .replaceAll('{word}', word?.lemma ?? '')
    .replaceAll('{wrong}', error.wrong)
    .replaceAll('{right}', error.right);
}

export interface Garble {
  def: GarbleDef;
  error: GrammarError;
  effect_he: string;
  explain_he: string;
}

export function describeGarble(error: GrammarError): Garble {
  const def = garbleById.get(error.id)!;
  return { def, error, effect_he: fillTemplate(def.effect_he, error), explain_he: fillTemplate(def.explain_he, error) };
}

export type LabOutcome = 'cast' | 'harmless' | 'garble' | 'blocked' | 'poor' | 'cooldown';

export interface LabResult {
  save: SaveState;
  outcome: LabOutcome;
  analysis: Analysis;
  rule?: LabEffectRule;
  garble?: Garble;
  cost?: ElementDelta;
  gained?: ElementDelta;
  note_he?: string;
  newDiscovery: boolean;
  until?: number;
}

/** Cost and status of a sentence before casting (for the lab's preview). */
export function labPreview(save: SaveState, sentence: LabSentence) {
  const analysis = analyze(sentence);
  const rule = analysis.ok ? matchRule(sentence) : null;
  const cost = rule ? labCost(save, sentence, rule, analysis) : {};
  return { analysis, rule, cost, affordable: canAfford(save.elements, cost) };
}

export function castLab(save: SaveState, sentence: LabSentence, now: number): LabResult {
  const current = tick(save, now);
  const analysis = analyze(sentence);
  const wordIds = Object.values(sentence).flatMap((f) => [f?.wordId, f?.modifier?.wordId]).filter((id): id is string => Boolean(id && wordById.has(id)));

  if (!analysis.ok) {
    const garble = describeGarble(analysis.errors[0]);
    const wrongWords = analysis.errors.map((e) => e.wordId).filter((id) => wordById.has(id));
    const ratings: Record<string, boolean> = { [ruleCard(garble.def.rule)]: false };
    for (const id of wrongWords) ratings[wordCard(id)] = false;
    return {
      save: {
        ...current,
        cards: applyRatings(current.cards, ratings, now),
        lab: { ...current.lab, lastGarble: { verb: sentence.verb?.wordId ?? '', at: now } },
        stats: { ...current.stats, garbles: current.stats.garbles + 1 },
      },
      outcome: 'garble',
      analysis,
      garble,
      newDiscovery: false,
    };
  }

  const rule = matchRule(sentence);
  const known = current.lab.discoveries[analysis.signature];
  const record = (s: SaveState, ruleId: string | null): SaveState => ({
    ...s,
    lab: {
      ...s.lab,
      discoveries: {
        ...s.lab.discoveries,
        [analysis.signature]: {
          firstAt: known?.firstAt ?? now,
          lastAt: now,
          casts: (known?.casts ?? 0) + 1,
          text: analysis.text,
          rule: ruleId,
        },
      },
    },
    cards: applyRatings(s.cards, Object.fromEntries(wordIds.map((id) => [wordCard(id), true])), now),
  });

  if (!rule) {
    return { save: record(current, null), outcome: 'harmless', analysis, newDiscovery: !known };
  }

  const effect = resolveEffect(rule, sentence);
  const req = requirementStatus(current, rule.requires);
  if (!req.ready) return { save: current, outcome: 'blocked', analysis, rule, note_he: req.reason_he, newDiscovery: false };
  const status = effectStatus(current, effect, now);
  if (!status.ready) return { save: current, outcome: 'blocked', analysis, rule, note_he: status.reason_he, until: status.until, newDiscovery: false };
  if (known && COOLDOWN_TYPES.has(effect.type)) {
    const until = known.lastAt + CONFIG.LAB_COOLDOWN_HOURS * HOUR_MS;
    if (now < until) return { save: current, outcome: 'cooldown', analysis, rule, until, newDiscovery: false };
  }
  const cost = labCost(current, sentence, rule, analysis);
  if (!canAfford(current.elements, cost)) return { save: current, outcome: 'poor', analysis, rule, cost, newDiscovery: false };

  const paid: SaveState = {
    ...current,
    elements: subtractElements(current.elements, cost),
    stats: { ...current.stats, spellsCast: current.stats.spellsCast + 1 },
  };
  const applied = applyEffect(paid, effect, now, analysis.hasMeans ? CONFIG.MEANS_POWER : 1, sentence.object?.wordId);
  let next = record(applied.save, rule.id);
  let gained = applied.gained;

  // Mystic rewards: spiritus for a new discovery (magistra), umbra for fixing a garbled spell.
  const mystic: ElementDelta = {};
  if (!known && rankOrder(current.rank) >= rankOrder('magistra')) mystic.spiritus = 1;
  const last = current.lab.lastGarble;
  if (last && last.verb === sentence.verb?.wordId && now - last.at <= CONFIG.FIX_GARBLE_MINUTES * 60000 && rankOrder(current.rank) >= rankOrder('magistra')) {
    mystic.umbra = 1;
  }
  if (Object.keys(mystic).length) {
    next = { ...next, elements: addElements(next.elements, mystic) };
    gained = sumDeltas(gained ?? {}, mystic);
  }
  next = { ...next, lab: { ...next.lab, lastGarble: null } };
  return { save: next, outcome: 'cast', analysis, rule, cost, gained, note_he: applied.note_he, newDiscovery: !known };
}

// ------------------------------------------------------------------ taught spells

/** Reads a taught spell's answer tiles into lab slots (verb, object, recipient, means, adjectives). */
export function spellToSentence(tiles: string[]): LabSentence {
  const sentence: LabSentence = {};
  const adjectives: { wordId: string; form: string }[] = [];
  for (const tile of tiles) {
    const word = wordById.get(lookupForm(tile, true) ?? lookupForm(tile) ?? '');
    if (!word) continue;
    const keys = keysFor(word, tile);
    if (word.pos === 'verb') sentence.verb = { wordId: word.id, form: tile };
    else if (word.pos === 'adj') adjectives.push({ wordId: word.id, form: tile });
    else {
      const role: SlotRole | null = keys.some((k) => k.startsWith('acc')) && !sentence.object ? 'object'
        : keys.some((k) => k.startsWith('dat')) && !sentence.recipient ? 'recipient'
          : keys.some((k) => k.startsWith('abl')) && !sentence.means ? 'means'
            : !sentence.object ? 'object' : !sentence.recipient ? 'recipient' : null;
      if (role) sentence[role] = { wordId: word.id, form: tile };
    }
  }
  for (const adj of adjectives) {
    const target = sentence.object ?? sentence.means;
    if (target) target.modifier = adj;
  }
  return sentence;
}

/**
 * Why a taught spell came out wrong: the player's tiles are read into the spell's own slots
 * (the slot is what the spell means; the tile's ending is what the player said).
 */
export function diagnoseSpell(spell: Spell, tiles: string[]): Garble | null {
  const canonical = spellToSentence(spell.answer);
  const used = new Map<string, string>();
  for (const tile of tiles) {
    const id = lookupForm(tile, true) ?? lookupForm(tile);
    if (id && !used.has(id)) used.set(id, tile);
  }
  const attempt: LabSentence = {};
  for (const [role, fill] of Object.entries(canonical) as [SlotRole, NonNullable<LabSentence[SlotRole]>][]) {
    const form = used.get(fill.wordId);
    if (!form) continue;
    attempt[role] = { wordId: fill.wordId, form };
    if (fill.modifier) {
      const modForm = used.get(fill.modifier.wordId);
      if (modForm) attempt[role]!.modifier = { wordId: fill.modifier.wordId, form: modForm };
    }
  }
  const analysis = analyze(attempt);
  return analysis.ok ? null : describeGarble(analysis.errors[0]);
}
