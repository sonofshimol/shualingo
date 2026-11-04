/**
 * The one place the UI reads and changes the saved game. Every change is written to IndexedDB.
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { tick } from '../game/actions';
import { newSave, type SaveState } from '../game/state';
import { loadSave, requestPersistence, writeSave } from '../storage/db';

let current: SaveState | null = null;
const listeners = new Set<() => void>();
let writeTimer: number | undefined;

function emit() {
  listeners.forEach((l) => l());
}

function persistSoon() {
  window.clearTimeout(writeTimer);
  writeTimer = window.setTimeout(() => {
    if (current) void writeSave(current).catch((e) => console.error('save failed', e));
  }, 150);
}

export async function initStore(): Promise<void> {
  const now = Date.now();
  let loaded: SaveState | null = null;
  try {
    loaded = await loadSave();
  } catch (error) {
    console.error('could not load save', error);
  }
  current = tick(loaded ?? newSave(now), now);
  if (!loaded) persistSoon();
  void requestPersistence();
  emit();
}

export function getSave(): SaveState {
  if (!current) throw new Error('store not initialised');
  return current;
}

/** Applies a change and saves it. The updater gets the current save and must return a new one. */
export function updateSave(updater: (save: SaveState) => SaveState): void {
  const next = updater(getSave());
  if (next === current) return;
  current = next;
  persistSoon();
  emit();
}

/** Replaces the whole save (backup import). */
export function replaceSave(save: SaveState): void {
  current = tick(save, Date.now());
  persistSoon();
  emit();
}

export function useSave(): SaveState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSave,
  );
}

/** The current time, refreshed every `intervalMs` (for countdowns and the fire). */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
