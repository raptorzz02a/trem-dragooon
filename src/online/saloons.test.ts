import { describe, expect, it } from 'vitest';
import { createSession } from '../game-session/session';
import { config } from '../test/helpers';
import { archiveChange, createRoom } from './room';
import {
  cleanSaloonColor,
  cleanSaloonIcon,
  inviteLink,
  isInviteToken,
  PUBLIC_SALOON_ID,
  saloonKey,
  saloonNameProblem,
  saloonOf,
  saloonPasswordProblem,
} from './saloons';

describe('saloons', () => {
  it('un nom de saloon est unique sans tenir compte des majuscules ni des espaces', () => {
    expect(saloonKey('  Les   Potes ')).toBe(saloonKey('les potes'));
  });

  it('refuse les noms et mots de passe invalides, et le nom du saloon public', () => {
    expect(saloonNameProblem('A')).toMatch(/au moins/);
    expect(saloonNameProblem('x'.repeat(25))).toMatch(/au plus/);
    expect(saloonNameProblem('trem-dragooon')).toMatch(/réservé/);
    expect(saloonNameProblem('Les Potes')).toBeNull();
    expect(saloonPasswordProblem('abc')).toMatch(/au moins/);
    expect(saloonPasswordProblem('abcd')).toBeNull();
  });

  it('n’accepte que les couleurs et icônes proposées (pas le vert ni l’or de l’interface)', () => {
    expect(cleanSaloonColor('#d64545')).toBe('#d64545');
    expect(cleanSaloonColor('#2f8a55')).toBeNull();
    expect(cleanSaloonColor('#ccae5e')).toBeNull();
    expect(cleanSaloonIcon('🍺')).toBe('🍺');
    expect(cleanSaloonIcon('🎯')).toBeNull(); // réservée au saloon public
    expect(cleanSaloonIcon('<b>')).toBeNull();
  });

  it('lien d’invitation', () => {
    const token = 'a'.repeat(32);
    expect(isInviteToken(token)).toBe(true);
    expect(isInviteToken('../x')).toBe(false);
    expect(inviteLink('https://exemple.dev', token)).toBe(`https://exemple.dev/?invitation=${token}`);
  });

  it('les parties d’avant les saloons appartiennent au saloon public', () => {
    expect(saloonOf({})).toBe(PUBLIC_SALOON_ID);
    expect(saloonOf({ saloonId: 's1' })).toBe('s1');
  });

  it('une partie terminée garde le saloon où elle a été jouée', () => {
    const session = { ...createSession('g1', config('x01'), '2026-10-29T00:00:00Z'), status: 'finished' as const };
    const lobby = createRoom('ABC234', 'same', undefined, 's1');
    const before = { ...lobby, session: { ...session, status: 'in_progress' as const } };
    const change = archiveChange(before, { ...lobby, session });
    expect(change && 'record' in change && change.record.saloonId).toBe('s1');
    const pub = createRoom('ABC234', 'same', undefined, PUBLIC_SALOON_ID);
    expect(pub.saloonId).toBeUndefined();
  });
});
