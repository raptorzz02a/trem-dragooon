import { describe, expect, it } from 'vitest';
import { abandonSession, createSession, startSession } from '../game-session/session';
import { config } from '../test/helpers';
import { DEFAULT_AVATAR } from '../ui/components/Avatar';
import { claimRecord, cleanAvatar, cleanColor, detachPlayer, involves, passwordProblem, pseudoKey, pseudoProblem, temporaryPassword } from './accounts';

describe('comptes en ligne', () => {
  it('un pseudo est unique sans tenir compte des majuscules ni des espaces', () => {
    expect(pseudoKey(' Ju ')).toBe(pseudoKey('jU'));
  });

  it('refuse les pseudos et mots de passe trop courts', () => {
    expect(pseudoProblem('J')).toMatch(/au moins/);
    expect(pseudoProblem('Ju')).toBeNull();
    expect(pseudoProblem('x'.repeat(21))).toMatch(/au plus/);
    expect(passwordProblem('12345')).toMatch(/au moins/);
    expect(passwordProblem('123456')).toBeNull();
  });

  it('ne garde d’un avatar reçu que des valeurs sûres', () => {
    const avatar = { skin: 1, hair: 2, hairColor: 0, facialHair: 0, glasses: 1, hat: 0 };
    expect(cleanAvatar({ ...avatar, extra: 'x' })).toEqual(avatar);
    expect(cleanAvatar({ ...avatar, hat: '<script>' })).toBeNull();
    expect(cleanColor('#a1b2c3')).toBe('#a1b2c3');
    expect(cleanColor('red; background:url(x)')).toBeNull();
  });
});

describe('reprise des stats de la borne', () => {
  const ju = { id: 'acc-ju', name: 'Ju', color: '#ff0000', avatar: DEFAULT_AVATAR, createdAt: '' };
  const record = {
    id: 'game-1',
    players: [
      { id: 'local-ju', name: 'Juju' },
      { id: 'local-max', name: 'Max' },
    ],
    session: startSession(createSession('game-1', config('x01', {}, [
      { id: 'local-ju', name: 'Juju', playerIds: ['local-ju'] },
      { id: 'local-max', name: 'Max', playerIds: ['local-max'] },
    ]))),
  };

  it('remplace le profil de la borne par le compte, sans toucher aux autres joueurs', () => {
    const claimed = claimRecord(record, 'local-ju', ju);
    expect(claimed.session.config.sides.flatMap((s) => s.playerIds)).toEqual(['acc-ju', 'local-max']);
    expect(claimed.players).toEqual([
      { id: 'acc-ju', name: 'Ju' },
      { id: 'local-max', name: 'Max' },
    ]);
  });

  it('ne reprend que les parties terminées ou abandonnées du joueur', () => {
    expect(involves(record, 'local-ju')).toBe(false); // partie en cours
    const over = { ...record, session: abandonSession(record.session) };
    expect(involves(over, 'local-ju')).toBe(true);
    expect(involves(over, 'local-zoe')).toBe(false);
  });

  it('retire un compte d’une partie sans toucher à ses adversaires (reset des stats, suppression)', () => {
    const detached = detachPlayer(record, 'local-max', 'supprime-1', 'Joueur supprimé');
    expect(detached.session.config.sides.flatMap((s) => s.playerIds)).toEqual(['local-ju', 'supprime-1']);
    expect(detached.players[1]).toEqual({ id: 'supprime-1', name: 'Joueur supprimé' });
    expect(detached.players[0]).toBe(record.players[0]);
  });
});

describe('espace administrateur', () => {
  it('donne un mot de passe provisoire valable et lisible', () => {
    let i = 0;
    const password = temporaryPassword(() => (i++ * 0.13) % 1);
    expect(password).toHaveLength(8);
    expect(passwordProblem(password)).toBeNull();
    expect(password).not.toMatch(/[01lo]/);
  });
});
