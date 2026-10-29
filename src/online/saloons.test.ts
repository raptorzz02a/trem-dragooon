import { describe, expect, it } from 'vitest';
import { createSession } from '../game-session/session';
import { config } from '../test/helpers';
import { archiveChange, createRoom, joinRoom, liveSummary } from './room';
import {
  canDeleteSaloon,
  canEditSaloon,
  canManage,
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

  it('rôles : un admin n’agit que sur les simples membres, le propriétaire sur tous, l’administrateur de l’appli partout', () => {
    expect(canManage('admin', 'member', 'kick')).toBe(true);
    expect(canManage('admin', 'member', 'ban')).toBe(true);
    expect(canManage('admin', 'admin', 'kick')).toBe(false);
    expect(canManage('admin', 'owner', 'ban')).toBe(false);
    expect(canManage('admin', 'member', 'promote')).toBe(false);
    expect(canManage('member', 'member', 'kick')).toBe(false);
    expect(canManage('owner', 'admin', 'ban')).toBe(true);
    expect(canManage('owner', 'member', 'promote')).toBe(true);
    expect(canManage('owner', 'admin', 'promote')).toBe(false);
    expect(canManage('owner', 'admin', 'demote')).toBe(true);
    expect(canManage('owner', 'member', 'transfer')).toBe(true);
    expect(canManage('global', 'owner', 'kick')).toBe(true);
    expect(canManage('global', 'owner', 'transfer')).toBe(false);
  });

  it('réglages pour les admins, suppression pour le propriétaire et l’administrateur de l’appli', () => {
    expect(canEditSaloon('member')).toBe(false);
    expect(canEditSaloon('admin')).toBe(true);
    expect(canEditSaloon(null)).toBe(false);
    expect(canDeleteSaloon('admin')).toBe(false);
    expect(canDeleteSaloon('owner')).toBe(true);
    expect(canDeleteSaloon('global')).toBe(true);
  });

  it('la liste « Parties en cours » montre la partie tant qu’elle n’est pas finie', () => {
    const identity = { name: 'Ju', color: '#ff0000', avatar: { skin: 0, hair: 0, hairColor: 0, facialHair: 0, glasses: 0, hat: 0 } };
    const empty = createRoom('ABC234', 'same', undefined, 's1');
    expect(liveSummary(empty, 0)).toBeNull();
    const { room } = joinRoom(empty, null, identity, () => 't', 'acc-ju');
    expect(liveSummary(room, 2)).toEqual({ mode: 'x01', place: 'same', status: 'lobby', players: ['Ju'], watchers: 2 });
    const session = { ...createSession('g1', config('x01'), '2026-10-29T00:00:00Z'), status: 'finished' as const };
    expect(liveSummary({ ...room, status: 'playing', session }, 0)).toBeNull();
  });
});
