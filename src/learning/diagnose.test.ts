import { describe, expect, it } from 'vitest';
import { lessonById } from '../content';
import type { Exercise } from '../content/types';
import { diagnoseExercise, diagnoseTokens } from './diagnose';

const exercise = (lessonId: string, pred: (e: Exercise) => boolean) => lessonById.get(lessonId)!.exercises.find(pred)!;

describe('mistake diagnosis', () => {
  it('names the real mistake: subject form liber instead of object librum (user report)', () => {
    const ex = exercise('u4-l3', (e) => e.type === 'build' && e.prompt_he === 'תן לחבר ספר!');
    const [msg] = diagnoseExercise(ex, ['liber', 'amīcō', 'dā']);
    expect(msg).toContain('liber');
    expect(msg).toContain('צורת הנושא');
    expect(msg).toContain('צורת המושא');
    expect(msg).toContain('librum');
  });

  it('explains a wrong recipient form', () => {
    const [msg] = diagnoseTokens(['aquam', 'arborī', 'dā'], ['aquam', 'arborem', 'dā']);
    expect(msg).toContain('arborem');
    expect(msg).toContain('צורת הנתינה');
    expect(msg).toContain('arborī');
  });

  it('handles forms that are both subject and object (lignum) by what differs', () => {
    const [msg] = diagnoseTokens(['lignum'], ['lignō']);
    expect(msg).toContain('lignō');
    expect(msg).toContain('lignum');
  });

  it('explains a wrong verb form, a substitution, a missing word and an extra word', () => {
    expect(diagnoseTokens(['affer'], ['affert'])[0]).toContain('פקודה לאדם אחד');
    expect(diagnoseTokens(['mihi'], ['tibi'])[0]).toContain('במקום tibi');
    expect(diagnoseTokens(['lignum', 'mihi', 'affer'], ['lignum', 'affer'])[0]).toContain('חסרה');
    expect(diagnoseTokens(['lignum', 'affer'], ['lignum', 'mihi', 'affer'])[0]).toContain('מיותרת');
  });

  it('diagnoses endings, roles and Latin multiple choice', () => {
    const ending = exercise('u2-l2', (e) => e.type === 'ending');
    expect(diagnoseExercise(ending, 'a')[0]).toContain('צורת המושא');
    const role = exercise('u3-l2', (e) => e.type === 'role');
    expect(diagnoseExercise(role, 'subject')[0]).toContain('צורת הנתינה');
    const choice = exercise('u4-l3', (e) => e.type === 'choice' && e.direction === 'he-la');
    expect(diagnoseExercise(choice, 'Liber mihi affer!')[0].toLowerCase()).toContain('librum');
  });
});
