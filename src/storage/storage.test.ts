import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newSave } from '../game/state';
import { makeBackup, readBackup } from './backup';
import { loadSave, writeSave } from './db';
import { migrate, SaveFormatError } from './migrations';

const T0 = Date.parse('2026-11-05T09:00:00Z');

describe('storage', () => {
  it('saves to and loads from IndexedDB', async () => {
    expect(await loadSave()).toBeNull();
    const save = { ...newSave(T0), spellbook: ['gather-wood'] };
    await writeSave(save);
    expect(await loadSave()).toEqual(save);
  });

  it('round-trips a backup file', () => {
    const save = { ...newSave(T0), elements: { ...newSave(T0).elements, terra: 3, aqua: 1, ignis: 2, aether: 1 } };
    const text = JSON.stringify(makeBackup(save, T0));
    expect(readBackup(text)).toEqual(save);
  });

  it('rejects files that are not Shualingo backups', () => {
    expect(() => readBackup('not json')).toThrow(SaveFormatError);
    expect(() => readBackup('{"app":"other"}')).toThrow(SaveFormatError);
    expect(() => readBackup(JSON.stringify({ app: 'shualingo', save: { saveVersion: 99 } }))).toThrow(SaveFormatError);
  });

  it('fills missing fields with defaults', () => {
    const migrated = migrate({ saveVersion: 1, createdAt: T0, lessons: { 'u1-l1': { completedAt: T0, bestMistakes: 0, timesCompleted: 1 } } });
    expect(migrated.lessons['u1-l1']).toBeDefined();
    expect(migrated.elements.terra).toBe(0);
    expect(migrated.camp.fuel).toBeGreaterThan(0);
  });
});
