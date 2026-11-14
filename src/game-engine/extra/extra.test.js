// Autres jeux, lot 1 : High Score, Halve It, Killer.
import { describe, expect, it } from 'vitest';
import { computeState } from '../engine';
import { config, events, play, players, teams } from '../../test/helpers';
import { drawHalveTargets, HALVE_STANDARD } from './halveit';
import { drawKillerNumbers } from './killer';
const hs = (s) => s.mode;
const hv = (s) => s.mode;
const kl = (s) => s.mode;
const rounds = (n) => Array(n).fill('/').join(' ');
describe('High Score', () => {
    const cfg = () => config('highscore', { rounds: 5 });
    it('chaque fléchette rapporte sa valeur', () => {
        expect(hs(play(cfg(), 'T20 T20 T20')).scores[0]).toBe(180);
        expect(hs(play(cfg(), 'S5 D10 50')).scores[0]).toBe(75);
    });
    it('fin après le nombre de manches choisi, le plus haut total gagne', () => {
        const s = play(cfg(), `S1 / T20 / ${rounds(8)}`);
        expect(s.status).toBe('finished');
        expect(s.winners).toEqual([1]);
        expect(play(cfg(), `S1 / T20 / ${rounds(7)}`).status).toBe('in_progress');
    });
    it('égalité : ex aequo', () => {
        const s = play(cfg(), `T20 / T20 / ${rounds(8)}`);
        expect(s.winners).toEqual([0, 1]);
    });
    it('en équipes, le total est collectif', () => {
        const s = play(config('highscore', { rounds: 5 }, teams(2, 2)), 'S20 / S1 / S20');
        expect(hs(s).scores).toEqual([40, 1]);
    });
});
describe('Halve It', () => {
    const cfg = () => config('halveit', { sequence: 'standard', targets: HALVE_STANDARD });
    it('seule la cible de la manche rapporte, à sa vraie valeur', () => {
        expect(hv(play(cfg(), 'S12 D12 T12')).scores[0]).toBe(72);
        expect(hv(play(cfg(), 'S12 S20 S20')).scores[0]).toBe(12);
    });
    it('double ou triple exigé : le simple ne compte pas', () => {
        // Manche 2 : D13
        const s = play(cfg(), 'S12 / S12 / S13 D13 T13');
        expect(hv(s).scores[0]).toBe(12 + 26);
    });
    it('une volée sans toucher la cible divise le score par deux (arrondi en dessous)', () => {
        const s = play(cfg(), 'T12 S1 / S12 / S1 S1 S1 /');
        expect(hv(s).scores[0]).toBe(18); // 36 → 18
        expect(hv(s).log.find((t) => t.side === 0 && t.round === 1)?.halvedFrom).toBe(36);
        const odd = play(cfg(), 'S12 D12 / / S20 /');
        expect(hv(odd).scores[0]).toBe(18); // 36 ÷ 2
        expect(hv(play(cfg(), 'S12 T12 S1 / / S1 /')).scores[0]).toBe(24); // 48 ÷ 2
        expect(hv(play(cfg(), 'S12 S12 S1 / / S1 / / S1 /')).scores[0]).toBe(6); // 24 → 12 → 6
    });
    it('annuler la dernière fléchette rejoue sans la division', () => {
        const evs = events('S12 S12 / S12 / S1 S1');
        const before = computeState(cfg(), evs);
        expect(hv(before).scores[0]).toBe(24);
        const after = computeState(cfg(), [...evs, ...events('S1')]);
        expect(hv(after).scores[0]).toBe(12);
        expect(hv(computeState(cfg(), evs)).scores[0]).toBe(24);
    });
    it('fin après la manche du Bull', () => {
        const s = play(cfg(), `${rounds(18)} 25 / 50 /`);
        expect(s.status).toBe('finished');
        expect(s.winners).toEqual([1]);
    });
    it('tirage aléatoire : 9 numéros différents puis le Bull', () => {
        let i = 0;
        const rng = () => (i = (i * 7 + 3) % 97) / 97;
        const t = drawHalveTargets(rng);
        expect(t).toHaveLength(10);
        expect(t.at(-1).segment).toBe(25);
        expect(new Set(t.slice(0, 9).map((x) => x.segment)).size).toBe(9);
    });
});
describe('Killer', () => {
    const numbers = [1, 2, 3];
    const cfg = (lives = 3) => config('killer', { lives, numbers }, players(3));
    it('il faut au moins 3 joueurs et pas d’équipes', () => {
        expect(() => computeState(config('killer', { lives: 3, numbers: [1, 2] }, players(2)), [])).toThrow();
        expect(() => computeState(config('killer', { lives: 3, numbers: [1, 2, 3, 4] }, teams(2, 2)), [])).toThrow();
    });
    it('seul son propre double fait devenir Killer', () => {
        expect(kl(play(cfg(), 'S1 T1 D2')).killer[0]).toBe(false);
        expect(kl(play(cfg(), 'D1')).killer[0]).toBe(true);
    });
    it('avant d’être Killer, toucher un adversaire ne fait rien', () => {
        expect(kl(play(cfg(), 'T2 T2 T2')).lives[1]).toBe(3);
    });
    it('Killer : simple −1, double ou triple −2 à l’adversaire', () => {
        const s = kl(play(cfg(5), 'D1 S2 T3'));
        expect(s.lives).toEqual([5, 4, 3]);
        expect(s.taken[0]).toBe(3);
    });
    it('un Killer qui touche son numéro perd une vie', () => {
        expect(kl(play(cfg(), 'D1 S1')).lives[0]).toBe(2);
    });
    it('un joueur éliminé est sauté, le dernier en vie gagne', () => {
        const s = play(cfg(), 'D1 D2 D2 / / / D3');
        expect(kl(s).lives[1]).toBe(0);
        expect(s.current?.sideIndex).toBe(0); // joueur 2 (éliminé) sauté après le joueur 3
        const end = play(cfg(), 'D1 D2 D2 / / / D1 D3 T3');
        expect(end.status).toBe('finished');
        expect(end.winners).toEqual([0]);
        expect(end.ranking.map((r) => r.sideIndex)).toEqual([0, 2, 1]);
    });
    it('s’éliminer soi-même termine sa volée', () => {
        const s = play(config('killer', { lives: 1, numbers }, players(3)), 'D1 S1');
        expect(kl(s).lives[0]).toBe(0);
        expect(s.current?.sideIndex).toBe(1);
    });
    it('tirage des numéros : uniques, de 1 à 20', () => {
        const n = drawKillerNumbers(8);
        expect(new Set(n).size).toBe(8);
        expect(n.every((x) => x >= 1 && x <= 20)).toBe(true);
    });
});
