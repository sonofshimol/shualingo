/**
 * Upgrades old saves to the current shape. When SaveState changes:
 *   1. bump SAVE_VERSION in src/game/state.ts
 *   2. add a step here: MIGRATIONS[oldVersion] = (save) => upgraded save
 * so nobody loses progress when the app updates.
 */
import { SAVE_VERSION, newCamp, newSave, type SaveState } from '../game/state';

type Raw = Record<string, unknown>;
type Migration = (save: Raw) => Raw;

const MIGRATIONS: Record<number, Migration> = {
  /** Stage 2: buildings, production, tree, light, rank and settings. */
  1: (save) => {
    const camp = (save.camp ?? {}) as Raw;
    const since = Number(camp.lastBurnAt) || Number(save.createdAt) || 0;
    return {
      ...save,
      saveVersion: 2,
      camp: { ...newCamp(since), ...camp },
      rank: 'discipula',
      settings: { sound: true, vibration: true },
      stats: { harvested: 0, ...(save.stats as Raw) },
    };
  },
};

export class SaveFormatError extends Error {}

export function migrate(raw: unknown): SaveState {
  if (!raw || typeof raw !== 'object') throw new SaveFormatError('not a save');
  let save = raw as Raw;
  let version = Number(save.saveVersion);
  if (!Number.isInteger(version) || version < 1) throw new SaveFormatError('missing saveVersion');
  if (version > SAVE_VERSION) throw new SaveFormatError('save is from a newer version of the app');
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new SaveFormatError(`no migration from version ${version}`);
    save = step(save);
    version = Number(save.saveVersion);
  }
  // Fill any field missing from a hand-edited or partial file with defaults.
  const defaults = newSave(Number(save.createdAt) || Date.now());
  const camp = { ...defaults.camp, ...(save.camp as object) } as SaveState['camp'];
  return {
    ...defaults,
    ...(save as Partial<SaveState>),
    elements: { ...defaults.elements, ...(save.elements as object) },
    camp: { ...camp, buildings: { ...defaults.camp.buildings, ...camp.buildings } },
    daily: { ...defaults.daily, ...(save.daily as object) },
    stats: { ...defaults.stats, ...(save.stats as object) },
    settings: { ...defaults.settings, ...(save.settings as object) },
  } as SaveState;
}
