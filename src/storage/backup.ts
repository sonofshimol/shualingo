/** Backup file: export the save to a JSON file and import it back (e.g. on a new phone). */
import { SAVE_VERSION, type SaveState } from '../game/state';
import { migrate, SaveFormatError } from './migrations';

const APP_ID = 'shualingo';

export interface BackupFile {
  app: typeof APP_ID;
  saveVersion: number;
  exportedAt: string;
  save: SaveState;
}

export function makeBackup(save: SaveState, now: number): BackupFile {
  return { app: APP_ID, saveVersion: SAVE_VERSION, exportedAt: new Date(now).toISOString(), save };
}

export function backupFileName(now: number): string {
  return `shualingo-backup-${new Date(now).toISOString().slice(0, 10)}.json`;
}

/** Parses a backup file's text. Throws SaveFormatError with a Hebrew message when it is not valid. */
export function readBackup(text: string): SaveState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new SaveFormatError('הקובץ אינו קובץ גיבוי תקין (JSON שבור).');
  }
  const file = parsed as Partial<BackupFile>;
  if (!file || file.app !== APP_ID || !file.save) {
    throw new SaveFormatError('זה לא קובץ גיבוי של שועלינגו.');
  }
  try {
    return migrate(file.save);
  } catch (error) {
    throw new SaveFormatError(`אי אפשר לטעון את הגיבוי: ${(error as Error).message}`);
  }
}

/** Starts a download of the backup in the browser. */
export function downloadBackup(save: SaveState, now: number): void {
  const blob = new Blob([JSON.stringify(makeBackup(save, now), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupFileName(now);
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
