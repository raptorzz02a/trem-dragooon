import { BULL } from '../darts';
import { rankBy } from '../rules';
import { perSide, setAt } from './common';
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
export const PYRAMIDS = {
    simple: [
        { kind: 'all', numbers: [1, 2], label: '1 et 2' },
        { kind: 'all', numbers: range(3, 5), label: '3 à 5' },
        { kind: 'all', numbers: range(6, 9), label: '6 à 9' },
        { kind: 'all', numbers: range(10, 14), label: '10 à 14' },
        { kind: 'all', numbers: range(15, 20), label: '15 à 20' },
        { kind: 'one', test: 'bull', label: 'Bull' },
    ],
    spicy: [
        { kind: 'all', numbers: range(1, 5), label: '1 à 5' },
        { kind: 'one', test: 'dt', label: 'Un double ou un triple' },
        { kind: 'one', test: 'dtHigh', label: 'Double ou triple de 15 à 20' },
        { kind: 'one', test: 'tHigh', label: 'Triple de 15 à 20' },
        { kind: 'one', test: 'bull', label: 'Bull' },
    ],
};
export function passesOne(test, d) {
    switch (test) {
        case 'bull':
            return d.segment === BULL;
        case 'dt':
            return d.segment >= 1 && d.segment <= 20 && d.multiplier >= 2;
        case 'dtHigh':
            return d.segment >= 15 && d.segment <= 20 && d.multiplier >= 2;
        case 'tHigh':
            return d.segment >= 15 && d.segment <= 20 && d.multiplier === 3;
    }
}
export const PYRAMIDE_MAX_ROUNDS = 40;
export const atTop = (s, side) => s.floor[side] >= s.floors.length;
/** La Pyramide : des étages de plus en plus durs ; le premier au sommet gagne (on finit la manche, moins de fléchettes départage). */
export const pyramideRules = {
    init(config) {
        return {
            floors: PYRAMIDS[config.options.variant],
            floor: perSide(config, 0),
            done: perSide(config, []),
            darts: perSide(config, 0),
        };
    },
    skipSide: (s, side) => atTop(s, side),
    applyDart(s, ctx, dart) {
        const me = ctx.sideIndex;
        const darts = setAt(s.darts, me, s.darts[me] + 1);
        const f = s.floors[s.floor[me]];
        let hit = false;
        let done = s.done[me];
        if (f.kind === 'all') {
            if (f.numbers.includes(dart.segment) && !done.includes(dart.segment)) {
                done = [...done, dart.segment];
                hit = true;
            }
        }
        else
            hit = passesOne(f.test, dart);
        if (!hit)
            return { state: { ...s, darts }, points: 0 };
        const cleared = f.kind === 'one' || done.length === f.numbers.length;
        const floor = cleared ? setAt(s.floor, me, s.floor[me] + 1) : s.floor;
        const next = { ...s, darts, floor, done: setAt(s.done, me, cleared ? [] : done) };
        return { state: next, points: 1, endTurn: atTop(next, me) };
    },
    onRoundEnd(s, round) {
        const top = s.floor.map((_, i) => i).filter((i) => atTop(s, i));
        if (top.length) {
            const fewest = Math.min(...top.map((i) => s.darts[i]));
            return { winners: top.filter((i) => s.darts[i] === fewest) };
        }
        return round + 1 >= PYRAMIDE_MAX_ROUNDS
            ? {
                winners: this.ranking(s)
                    .filter((r) => r.rank === 1)
                    .map((r) => r.sideIndex),
            }
            : null;
    },
    ranking: (s) => rankBy(s.floor.length, (a, b) => s.floor[b] - s.floor[a] || s.done[b].length - s.done[a].length || s.darts[a] - s.darts[b], (i) => s.floor[i]),
};
