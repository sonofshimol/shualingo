/** Keeps the save in IndexedDB on the device. No server, no account. */
import { openDB, type IDBPDatabase } from 'idb';
import type { SaveState } from '../game/state';
import { migrate } from './migrations';

const DB_NAME = 'shualingo';
const STORE = 'save';
const KEY = 'main';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db(): Promise<IDBPDatabase> {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

export async function loadSave(): Promise<SaveState | null> {
  const raw = await (await db()).get(STORE, KEY);
  return raw ? migrate(raw) : null;
}

export async function writeSave(save: SaveState): Promise<void> {
  await (await db()).put(STORE, save, KEY);
}

/** Asks the browser not to evict our data when the phone is low on space. */
export async function requestPersistence(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* not supported — fine */
  }
}
