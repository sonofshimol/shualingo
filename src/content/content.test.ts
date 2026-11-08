/**
 * Content checks: catch typos in the hand-written JSON before they reach the app.
 */
import { describe, expect, it } from 'vitest';
import {
  buildings, elementDefs, exerciseLatin, exerciseWords, latinWords, lessons, lookupForm, ruleById,
  spells, units, wordById, words,
} from './index';
import { BASE_ELEMENTS } from './types';

describe('words.json', () => {
  it('has unique ids, a Hebrew meaning and a game element for every word', () => {
    expect(new Set(words.map((w) => w.id)).size).toBe(words.length);
    for (const w of words) {
      expect(w.meaning_he, w.id).toBeTruthy();
      expect(BASE_ELEMENTS, w.id).toContain(w.element);
    }
  });

  it('takes every word from the DCC core list unless an exception is documented', () => {
    for (const w of words) {
      if (w.dcc_rank === null) expect(w.exception_reason, w.id).toBeTruthy();
    }
  });
});

describe('word card extras', () => {
  it('every word has a Hebrew pronunciation; quotes name their author', () => {
    for (const w of words) {
      expect(w.pron_he?.length, w.id).toBeGreaterThan(0);
      expect(w.pron_he!.some((s) => s.stress), `${w.id} has a stressed syllable`).toBe(true);
      for (const q of w.quotes ?? []) {
        expect(q.text && q.author_he && q.meaning_he, w.id).toBeTruthy();
      }
    }
    expect(words.filter((w) => w.origin).length).toBeGreaterThan(words.length * 0.9);
  });
});

describe('units.json', () => {
  it('has 9 units of about 10 words each', () => {
    expect(units).toHaveLength(9);
    for (const u of units) {
      expect(u.words.length).toBeGreaterThanOrEqual(7);
      expect(u.words.length).toBeLessThanOrEqual(12);
      for (const id of u.words) expect(wordById.has(id), id).toBe(true);
    }
  });

  it('uses all five exercise types', () => {
    const types = new Set(lessons.flatMap((l) => l.exercises.map((e) => e.type)));
    expect([...types].sort()).toEqual(['build', 'choice', 'ending', 'match', 'role']);
  });

  it('has unique lesson ids and valid rule references', () => {
    expect(new Set(lessons.map((l) => l.id)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      for (const r of lesson.rules_intro) expect(ruleById.has(r), `${lesson.id} ${r}`).toBe(true);
      for (const ex of lesson.exercises) {
        for (const r of ex.rules ?? []) expect(ruleById.has(r), `${lesson.id} ${r}`).toBe(true);
      }
    }
  });

  it('spells every Latin word exactly as a known form (macrons included)', () => {
    for (const lesson of lessons) {
      for (const ex of lesson.exercises) {
        const texts = [exerciseLatin(ex)];
        if (ex.type === 'choice' && ex.direction === 'he-la') texts.push(...ex.distractors);
        if (ex.type === 'build') texts.push(...ex.extra, ...(ex.alternatives ?? []).flat());
        if (ex.type === 'ending') texts.push(...ex.options.map((o) => ex.stem + o));
        for (const text of texts) {
          for (const token of latinWords(text)) {
            expect(lookupForm(token, true), `${lesson.id}: "${token}" in "${text}"`).toBeDefined();
          }
        }
      }
    }
  });

  it('only practises words that the course has introduced by then', () => {
    const known = new Set<string>();
    for (const unit of units) {
      unit.words.forEach((w) => known.add(w));
      for (const lesson of unit.lessons) {
        for (const ex of lesson.exercises) {
          for (const id of exerciseWords(ex)) expect(known.has(id), `${lesson.id}: ${id}`).toBe(true);
        }
      }
    }
  });

  it('has internally consistent exercises', () => {
    for (const lesson of lessons) {
      for (const ex of lesson.exercises) {
        const where = `${lesson.id} ${ex.type}`;
        if (ex.type === 'choice') expect(ex.distractors, where).not.toContain(ex.answer);
        if (ex.type === 'ending') expect(ex.options, where).toContain(ex.answer);
        if (ex.type === 'match') expect(ex.words.length, where).toBeGreaterThanOrEqual(3);
        if (ex.type === 'role') {
          expect(ex.target, where).toBeLessThan(latinWords(ex.sentence).length);
          if (ex.options) expect(ex.options, where).toContain(ex.answer);
        }
        if (ex.type === 'build') {
          for (const t of ex.extra) expect(ex.answer, `${where}: extra tile "${t}" is also in the answer`).not.toContain(t);
        }
      }
    }
  });
});

describe('stage 3 content', () => {
  it('garbles point at real rules, lab rules at real words', async () => {
    const { garbles } = await import('../magic/lab');
    const { labRules } = await import('../magic/effects');
    const { verbFrameById } = await import('../magic/grammar');
    for (const g of garbles) expect(ruleById.has(g.rule), g.id).toBe(true);
    for (const r of labRules) {
      expect(wordById.has(r.verb), r.id).toBe(true);
      expect(verbFrameById.has(r.verb), r.id).toBe(true);
      if (r.object?.word) expect(wordById.has(r.object.word), r.id).toBe(true);
      if (r.recipient && r.recipient !== 'any' && r.recipient.word) expect(wordById.has(r.recipient.word), r.id).toBe(true);
    }
  });
});

describe('spells, elements and buildings', () => {
  it('spells use known forms and unlock from a real lesson', () => {
    for (const spell of spells) {
      expect(lessons.map((l) => l.id)).toContain(spell.unlocked_by);
      for (const t of [...spell.answer, ...spell.extra]) expect(lookupForm(t, true), t).toBeDefined();
    }
  });

  it('defines the five base elements and the stage-1 camp', () => {
    expect(elementDefs.filter((e) => !e.mystic).map((e) => e.id)).toEqual(BASE_ELEMENTS);
    expect(buildings.filter((b) => b.initial).map((b) => b.id)).toEqual(['focus', 'tentorium', 'circulus']);
  });
});
