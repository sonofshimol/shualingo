/**
 * The camp fire (focus). It burns one fuel unit every FIRE_BURN_HOURS, also while the app is
 * closed — computed lazily from the last burn time. An empty fire is only a look, never a penalty.
 */
import { CONFIG, HOUR_MS } from '../config';
/** The part of the camp the fire needs. */
export interface FireState {
  fuel: number;
  lastBurnAt: number;
}

const BURN_MS = CONFIG.FIRE_BURN_HOURS * HOUR_MS;

export function burnFire<T extends FireState>(camp: T, now: number): T {
  if (camp.fuel <= 0) return camp.lastBurnAt === now ? camp : { ...camp, fuel: 0, lastBurnAt: now };
  const burned = Math.floor(Math.max(0, now - camp.lastBurnAt) / BURN_MS);
  if (burned === 0) return camp;
  if (burned >= camp.fuel) return { ...camp, fuel: 0, lastBurnAt: now };
  return { ...camp, fuel: camp.fuel - burned, lastBurnAt: camp.lastBurnAt + burned * BURN_MS };
}

export function addFuel<T extends FireState>(camp: T, amount: number, now: number): T {
  const current = burnFire(camp, now);
  return {
    ...current,
    fuel: Math.min(CONFIG.FIRE_MAX_FUEL, current.fuel + amount),
    lastBurnAt: current.fuel === 0 ? now : current.lastBurnAt,
  };
}

export type FireLevel = 'out' | 'embers' | 'small' | 'big';

export function fireLevel(fuel: number): FireLevel {
  if (fuel <= 0) return 'out';
  if (fuel === 1) return 'embers';
  if (fuel <= 3) return 'small';
  return 'big';
}

export const FIRE_TEXT_HE: Record<FireLevel, string> = {
  out: 'המדורה כבתה. לחש איסוף יחזיר אותה לחיים.',
  embers: 'נשארו רק גחלים לוחשות.',
  small: 'המדורה בוערת בשקט.',
  big: 'המדורה בוערת חזק ומאירה את היער.',
};
