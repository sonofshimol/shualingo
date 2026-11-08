/**
 * The spell grammar engine (stage 3).
 *
 * A lab sentence has four slots: the command verb, the object (את מה?), the recipient (למי?)
 * and the means (במה? באיזה כוח?). The player puts a word in a slot and turns its ending.
 * The slot says what the player MEANS; the ending says what the Latin actually SAYS.
 * When they disagree the spell is garbled — and the engine knows exactly how, so it can
 * show a fitting mishap, explain it, and send the right grammar rule to review.
 */
import verbsJson from '../../content/verbs.json';
import { wordById } from '../content';
import type { Word } from '../content/types';

export type SlotRole = 'verb' | 'object' | 'recipient' | 'means';
export const SLOT_ORDER: SlotRole[] = ['verb', 'object', 'recipient', 'means'];

export interface SlotFill {
  wordId: string;
  /** The written form the player chose, e.g. "aquam". */
  form: string;
  /** Optional adjective, e.g. multa (ligna), magnā (vī). */
  modifier?: { wordId: string; form: string };
}

export type LabSentence = Partial<Record<SlotRole, SlotFill>>;

export interface VerbFrame {
  id: string;
  object: 'required' | 'optional' | 'none';
  recipient: 'required' | 'optional' | 'none';
  verb_he: string;
}

export const verbFrames = (verbsJson.verbs as VerbFrame[]);
export const verbFrameById = new Map(verbFrames.map((v) => [v.id, v]));

export type GarbleId =
  | 'recipient-acc' | 'recipient-nom' | 'recipient-abl'
  | 'object-nom' | 'object-dat' | 'object-abl' | 'object-acc-self'
  | 'means-wrong' | 'verb-not-imperative' | 'verb-plural' | 'adjective-agreement'
  | 'object-missing' | 'recipient-not-allowed' | 'no-verb';

export interface GrammarError {
  id: GarbleId;
  role: SlotRole;
  wordId: string;
  /** What the player wrote. */
  wrong: string;
  /** What it should have been. */
  right: string;
}

export interface Analysis {
  ok: boolean;
  errors: GrammarError[];
  /** The Latin sentence as cast, e.g. "Aquam arborī dā!". */
  text: string;
  /** Canonical identity of a correct sentence (for discoveries). */
  signature: string;
  objectPlural: boolean;
  hasMeans: boolean;
}

const norm = (s: string) => s.normalize('NFC').toLowerCase();

/** All form keys of a word that are written this way (e.g. aquae → gen.sg, dat.sg, nom.pl, voc.pl). */
export function keysFor(word: Word, form: string): string[] {
  const f = norm(form);
  const keys = Object.entries(word.forms).filter(([, v]) => norm(v) === f).map(([k]) => k);
  if (!keys.length && norm(word.lemma) === f) keys.push(word.pos === 'verb' ? 'pres.1sg' : 'nom.sg');
  return keys;
}

const CASE_OF: Record<string, string> = { nom: 'nom', acc: 'acc', dat: 'dat', abl: 'abl', gen: 'gen', voc: 'voc' };
const caseOf = (key: string) => CASE_OF[key.split('.')[0]];

/** The form of a word for a case, keeping the number the player chose when possible. */
function formFor(word: Word, wantedCase: string, keys: string[]): string {
  const number = keys.map((k) => k.split('.')[1]).find(Boolean) ?? 'sg';
  return word.forms[`${wantedCase}.${number}`] ?? word.forms[`${wantedCase}.sg`] ?? word.lemma;
}

/** Which wrong case was used, by priority (what the learner most likely meant). */
function usedCase(keys: string[]): string | null {
  for (const c of ['acc', 'nom', 'dat', 'abl']) if (keys.some((k) => caseOf(k) === c)) return c;
  return null;
}

function checkNounSlot(role: 'object' | 'recipient' | 'means', fill: SlotFill, errors: GrammarError[]): { case: string; number: string } | null {
  const word = wordById.get(fill.wordId);
  if (!word) return null;
  const keys = keysFor(word, fill.form);
  const wanted = role === 'object' ? 'acc' : role === 'recipient' ? 'dat' : 'abl';
  const good = keys.filter((k) => caseOf(k) === wanted);
  if (good.length) return { case: wanted, number: good[0].split('.')[1] ?? 'sg' };

  const used = usedCase(keys);
  const right = formFor(word, wanted, keys);
  let id: GarbleId;
  if (role === 'recipient') id = used === 'acc' ? (word.id === 'ego' ? 'object-acc-self' : 'recipient-acc') : used === 'nom' ? 'recipient-nom' : 'recipient-abl';
  else if (role === 'object') id = used === 'nom' ? 'object-nom' : used === 'dat' ? 'object-dat' : 'object-abl';
  else id = 'means-wrong';
  errors.push({ id, role, wordId: word.id, wrong: fill.form, right });
  return null;
}

function checkModifier(fill: SlotFill, nounCase: string, nounNumber: string, errors: GrammarError[], role: SlotRole) {
  if (!fill.modifier) return;
  const noun = wordById.get(fill.wordId);
  const adj = wordById.get(fill.modifier.wordId);
  if (!noun || !adj) return;
  const gender = noun.gender ?? 'm';
  const wantedKey = `${nounCase}.${nounNumber}.${gender}`;
  if (keysFor(adj, fill.modifier.form).includes(wantedKey)) return;
  errors.push({ id: 'adjective-agreement', role, wordId: noun.id, wrong: fill.modifier.form, right: adj.forms[wantedKey] ?? adj.lemma });
}

export function sentenceText(sentence: LabSentence): string {
  const parts: string[] = [];
  for (const role of ['object', 'recipient', 'means', 'verb'] as SlotRole[]) {
    const fill = sentence[role];
    if (!fill) continue;
    if (fill.modifier && role === 'means') parts.push(fill.modifier.form, fill.form);
    else if (fill.modifier) parts.push(fill.modifier.form, fill.form);
    else parts.push(fill.form);
  }
  const text = parts.join(' ');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}!` : '';
}

export function analyze(sentence: LabSentence): Analysis {
  const errors: GrammarError[] = [];
  const verbFill = sentence.verb;
  const verb = verbFill ? wordById.get(verbFill.wordId) : undefined;
  const frame = verb ? verbFrameById.get(verb.id) : undefined;

  if (!verbFill || !verb || !frame) {
    errors.push({ id: 'no-verb', role: 'verb', wordId: verbFill?.wordId ?? '', wrong: verbFill?.form ?? '', right: '' });
  } else {
    const keys = keysFor(verb, verbFill.form);
    if (!keys.includes('imp.2sg')) {
      errors.push({
        id: keys.includes('imp.2pl') ? 'verb-plural' : 'verb-not-imperative',
        role: 'verb', wordId: verb.id, wrong: verbFill.form, right: verb.forms['imp.2sg'] ?? verb.lemma,
      });
    }
  }

  let objectPlural = false;
  if (sentence.object) {
    const r = checkNounSlot('object', sentence.object, errors);
    if (r) {
      objectPlural = r.number === 'pl';
      checkModifier(sentence.object, r.case, r.number, errors, 'object');
    }
  } else if (frame?.object === 'required') {
    errors.push({ id: 'object-missing', role: 'object', wordId: '', wrong: '', right: '' });
  }

  if (sentence.recipient) {
    if (frame?.recipient === 'none') {
      errors.push({ id: 'recipient-not-allowed', role: 'recipient', wordId: sentence.recipient.wordId, wrong: sentence.recipient.form, right: '' });
    } else {
      checkNounSlot('recipient', sentence.recipient, errors);
    }
  }

  if (sentence.means) {
    const r = checkNounSlot('means', sentence.means, errors);
    if (r) checkModifier(sentence.means, r.case, r.number, errors, 'means');
  }

  const sig = [
    sentence.verb?.wordId ?? '-',
    `o:${sentence.object?.wordId ?? ''}${objectPlural ? '.pl' : ''}${sentence.object?.modifier ? `+${sentence.object.modifier.wordId}` : ''}`,
    `r:${sentence.recipient?.wordId ?? ''}`,
    `m:${sentence.means?.wordId ?? ''}${sentence.means?.modifier ? `+${sentence.means.modifier.wordId}` : ''}`,
  ].join('|');

  return {
    ok: errors.length === 0,
    errors,
    text: sentenceText(sentence),
    signature: sig,
    objectPlural,
    hasMeans: Boolean(sentence.means) && !errors.some((e) => e.role === 'means'),
  };
}

/** Distinct written forms a slot can offer for a word (the "ending wheel"). */
export function wheelForms(word: Word): string[] {
  const keys = word.pos === 'verb'
    ? ['imp.2sg', 'imp.2pl', 'pres.3sg']
    : word.pos === 'adj'
      ? ['nom.sg.f', 'acc.sg.f', 'abl.sg.f', 'nom.sg.n', 'acc.sg.m', 'abl.sg.m', 'nom.pl.n', 'acc.pl.n']
      : ['nom.sg', 'acc.sg', 'dat.sg', 'abl.sg', 'nom.pl', 'acc.pl', 'dat.pl'];
  const forms = keys.map((k) => word.forms[k]).filter((f): f is string => Boolean(f));
  return [...new Set(forms)];
}
