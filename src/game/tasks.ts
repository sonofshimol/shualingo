/**
 * Suspension ("השהייה"): after FAILURES_BEFORE_SUSPENSION failures, only that task is locked
 * for SUSPENSION_HOURS. When the time is up it reopens with a clean failure count.
 * Works for any task id: lesson:…, spell:…, and later build:… and trade:….
 */
import { CONFIG, HOUR_MS } from '../config';
import type { TaskState } from './state';

export const lessonTask = (lessonId: string) => `lesson:${lessonId}`;
export const spellTask = (spellId: string) => `spell:${spellId}`;

export interface TaskStatus {
  locked: boolean;
  lockedUntil: number | null;
  failures: number;
}

export function taskStatus(task: TaskState | undefined, now: number): TaskStatus {
  if (!task) return { locked: false, lockedUntil: null, failures: 0 };
  if (task.lockedUntil !== null) {
    if (now < task.lockedUntil) return { locked: true, lockedUntil: task.lockedUntil, failures: task.failures };
    return { locked: false, lockedUntil: null, failures: 0 }; // suspension over: reset
  }
  return { locked: false, lockedUntil: null, failures: task.failures };
}

/** Records one failure; locks the task when the limit is reached. */
export function recordFailure(
  tasks: Record<string, TaskState>,
  taskId: string,
  now: number,
): { tasks: Record<string, TaskState>; lockedNow: boolean } {
  const current = taskStatus(tasks[taskId], now);
  if (current.locked) return { tasks, lockedNow: false };
  const failures = current.failures + 1;
  const lockedNow = failures >= CONFIG.FAILURES_BEFORE_SUSPENSION;
  return {
    tasks: {
      ...tasks,
      [taskId]: { failures, lockedUntil: lockedNow ? now + CONFIG.SUSPENSION_HOURS * HOUR_MS : null },
    },
    lockedNow,
  };
}

/** A success clears the failure count. */
export function recordSuccess(tasks: Record<string, TaskState>, taskId: string): Record<string, TaskState> {
  if (!tasks[taskId]) return tasks;
  const next = { ...tasks };
  delete next[taskId];
  return next;
}
