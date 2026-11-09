import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { deckWords, decks } from '../content';
import { newSave } from '../game/state';
import { buildRound, deckProgress, finishRound } from './verba';

const T0 = Date.parse('2026-11-08T10:00:00');

describe('Verba word game', () => {
  it('has themed decks of at least nine words each', () => {
    expect(decks.length).toBeGreaterThanOrEqual(8);
    for (const d of decks) expect(deckWords(d.id).length, d.id).toBeGreaterThanOrEqual(9);
  });

  it('introduces new words before asking them, with distinct options', () => {
    const round = buildRound(newSave(T0), 'corpus', T0, () => 0.3);
    const intros = round.filter((c) => c.kind === 'intro');
    expect(round.filter((c) => c.kind === 'quiz').length).toBe(2 * CONFIG.VERBA_NEW_PER_ROUND);
    expect(intros.length).toBe(CONFIG.VERBA_NEW_PER_ROUND);
    for (const intro of intros) {
      const introAt = round.indexOf(intro);
      const quizAt = round.findIndex((c) => c.kind === 'quiz' && c.wordId === intro.wordId);
      expect(quizAt).toBeGreaterThan(introAt);
    }
    for (const c of round) {
      if (c.kind !== 'quiz') continue;
      expect(new Set(c.options).size).toBe(c.options.length);
      expect(c.options).toContain(c.answer);
      expect(c.options.length).toBe(4);
    }
  });

  it("rewards the word's own element with no daily cap, and remembers words", () => {
    let save = newSave(T0);
    const words = deckWords('natura');
    const results = words.map((w) => ({ wordId: w.id, correct: true }));
    const first = finishRound(save, results, T0);
    expect(first.earned.aqua).toBeGreaterThan(0); // mare, flumen, unda…
    save = first.save;
    expect(Object.keys(save.cards)).toContain('word:mare');
    const total = Object.values(first.earned).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(words.length);
    const second = finishRound(save, results, T0 + 1000);
    expect(Object.values(second.earned).reduce((a, b) => a + (b ?? 0), 0)).toBe(words.length); // no daily cap
    expect(deckProgress(second.save, 'natura').seen).toBe(words.length);
  });
});
