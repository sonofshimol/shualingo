import { describe, expect, it } from 'vitest';
import { HOUR_MS } from '../config';
import { spells } from '../content';
import { newSave, type SaveState } from '../game/state';
import { analyze, type LabSentence } from './grammar';
import { castLab, diagnoseSpell, matchRule, resolveEffect, spellToSentence } from './lab';

const T0 = Date.parse('2026-11-08T10:00:00');
const RICH = { terra: 50, aqua: 50, aer: 50, ignis: 50, aether: 50, lux: 5, umbra: 5, spiritus: 5 };
const f = (wordId: string, form: string, modifier?: { wordId: string; form: string }) => ({ wordId, form, modifier });

describe('grammar engine', () => {
  it('reads every taught spell correctly and gives it the same effect in the lab', () => {
    for (const spell of spells) {
      const sentence = spellToSentence(spell.answer);
      const analysis = analyze(sentence);
      expect(analysis.ok, `${spell.text}: ${JSON.stringify(analysis.errors)}`).toBe(true);
      if (spell.id === 'gather-more') continue; // plural with multa: same rule as gather-wood
      const rule = matchRule(sentence);
      expect(rule, spell.text).not.toBeNull();
      const effect = resolveEffect(rule!, sentence);
      expect(effect.type, spell.text).toBe(spell.effect.type);
      if (spell.effect.type === 'build') expect(effect).toEqual(spell.effect);
    }
  });

  const cases: [string, LabSentence, string][] = [
    ['Aquam arborem dā! (the spec example)', { verb: f('do', 'dā'), object: f('aqua', 'aquam'), recipient: f('arbor', 'arborem') }, 'recipient-acc'],
    ['Aqua mihi affer!', { verb: f('affero', 'affer'), object: f('aqua', 'aqua'), recipient: f('ego', 'mihi') }, 'object-nom'],
    ['Lignum mē affer!', { verb: f('affero', 'affer'), object: f('lignum', 'lignum'), recipient: f('ego', 'mē') }, 'object-acc-self'],
    ['Lignum mihi affert.', { verb: f('affero', 'affert'), object: f('lignum', 'lignum'), recipient: f('ego', 'mihi') }, 'verb-not-imperative'],
    ['Lignum mihi afferte!', { verb: f('affero', 'afferte'), object: f('lignum', 'lignum'), recipient: f('ego', 'mihi') }, 'verb-plural'],
    ['Multum ligna mihi affer!', { verb: f('affero', 'affer'), object: f('lignum', 'ligna', { wordId: 'multus', form: 'multum' }), recipient: f('ego', 'mihi') }, 'adjective-agreement'],
    ['Lignō mihi affer!', { verb: f('affero', 'affer'), object: f('lignum', 'lignō'), recipient: f('ego', 'mihi') }, 'object-dat'],
    ['Lignum mihi magna vīs affer!', { verb: f('affero', 'affer'), object: f('lignum', 'lignum'), recipient: f('ego', 'mihi'), means: f('vis', 'vīs', { wordId: 'magnus', form: 'magna' }) }, 'means-wrong'],
    ['mihi (no verb)', { recipient: f('ego', 'mihi') }, 'no-verb'],
    ['Affer! (no object)', { verb: f('affero', 'affer') }, 'object-missing'],
  ];
  for (const [name, sentence, id] of cases) {
    it(`diagnoses ${name} as ${id}`, () => {
      expect(analyze(sentence).errors[0]?.id).toBe(id);
    });
  }

  it('accepts a means phrase with agreeing adjective: magnā vī', () => {
    const a = analyze({ verb: f('affero', 'affer'), object: f('lignum', 'lignum'), recipient: f('ego', 'mihi'), means: f('vis', 'vī', { wordId: 'magnus', form: 'magnā' }) });
    expect(a.ok).toBe(true);
    expect(a.hasMeans).toBe(true);
    expect(a.text).toBe('Lignum mihi magnā vī affer!');
  });

  it('explains a garbled taught spell from the player’s tiles', () => {
    const grow = spells.find((s) => s.id === 'grow-tree')!;
    const g = diagnoseSpell(grow, ['aquam', 'arborem', 'dā']);
    expect(g?.def.id).toBe('recipient-acc');
    expect(g?.explain_he).toContain('arborī');
    expect(diagnoseSpell(grow, ['aquam', 'arborī', 'dā'])).toBeNull();
  });
});

describe('spell lab', () => {
  const base = (): SaveState => ({ ...newSave(T0), elements: { ...RICH } });

  it('casts, records a discovery, and waits before the same spell works again', () => {
    const s = { verb: f('affero', 'affer'), object: f('lignum', 'lignum'), recipient: f('ego', 'mihi') };
    const first = castLab({ ...base(), camp: { ...base().camp, fuel: 0 } }, s, T0);
    expect(first.outcome).toBe('cast');
    expect(first.newDiscovery).toBe(true);
    expect(first.save.camp.fuel).toBe(3);
    expect(Object.keys(first.save.lab.discoveries)).toHaveLength(1);
    expect(castLab(first.save, s, T0 + HOUR_MS).outcome).toBe('cooldown');
    const later = castLab(first.save, s, T0 + 9 * HOUR_MS);
    expect(later.outcome).toBe('cast');
    expect(later.newDiscovery).toBe(false);
  });

  it('doubles the effect with a means phrase and charges aether', () => {
    const s = { verb: f('affero', 'affer'), object: f('lignum', 'lignum'), recipient: f('ego', 'mihi'), means: f('vis', 'vī', { wordId: 'magnus', form: 'magnā' }) };
    const r = castLab({ ...base(), camp: { ...base().camp, fuel: 0 } }, s, T0);
    expect(r.save.camp.fuel).toBe(6);
    expect(r.cost?.aether).toBeGreaterThanOrEqual(1);
  });

  it('a garbled spell costs nothing, sends the rule to review, and is not a suspension', () => {
    const r = castLab(base(), { verb: f('do', 'dā'), object: f('aqua', 'aquam'), recipient: f('arbor', 'arborem') }, T0);
    expect(r.outcome).toBe('garble');
    expect(r.save.elements).toEqual(RICH);
    expect(r.save.cards['rule:dat-sg-1'].lapses + r.save.cards['rule:dat-sg-1'].reps).toBeGreaterThan(0);
    expect(r.save.tasks).toEqual({});
  });

  it('records a harmless discovery for a correct sentence with no special power', () => {
    const r = castLab(base(), { verb: f('specto', 'spectā'), object: f('luna', 'lūnam') }, T0);
    expect(r.outcome).toBe('harmless');
    expect(r.newDiscovery).toBe(true);
  });

  it('mystic schools: light reveals the forest (maga), fixing a garble gives umbra (magistra)', () => {
    let s: SaveState = { ...base(), rank: 'maga' };
    const reveal = castLab(s, { verb: f('do', 'dā'), object: f('lux', 'lūcem'), recipient: f('silva', 'silvae') }, T0);
    expect(reveal.outcome).toBe('cast');
    expect(reveal.save.camp.forest.revealed).toHaveLength(1);
    expect(reveal.save.elements.lux).toBe(RICH.lux - 1);

    s = { ...base(), rank: 'magistra' };
    const bad = castLab(s, { verb: f('do', 'dā'), object: f('lignum', 'lignum'), recipient: f('ignis', 'ignem') }, T0);
    expect(bad.outcome).toBe('garble');
    const fixed = castLab(bad.save, { verb: f('do', 'dā'), object: f('lignum', 'lignum'), recipient: f('ignis', 'ignī') }, T0 + 60000);
    expect(fixed.outcome).toBe('cast');
    expect(fixed.gained?.umbra).toBe(1);
    expect(fixed.gained?.spiritus).toBe(1); // new discovery as magistra
  });

  it('shade pauses the fire', () => {
    const s: SaveState = { ...base(), rank: 'magistra', camp: { ...base().camp, fuel: 3 } };
    const r = castLab(s, { verb: f('facio', 'fac'), object: f('umbra', 'umbram') }, T0);
    expect(r.outcome).toBe('cast');
    const later = castLab(r.save, { verb: f('specto', 'spectā'), object: f('luna', 'lūnam') }, T0 + 10 * HOUR_MS);
    expect(later.save.camp.fuel).toBe(3);
  });
});
