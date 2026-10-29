import { describe, expect, it } from 'vitest';
import { cleanAvatar, cleanColor, passwordProblem, pseudoKey, pseudoProblem } from './accounts';

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
